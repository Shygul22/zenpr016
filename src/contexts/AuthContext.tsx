import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type AuthContextType = {
  session: Session | null;
  user: any | null;
  isAdmin: boolean;
  status: string | null;
  rejectionReason: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (name: string, email: string, password: string, phone?: string) => Promise<{ data: any; error: any }>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  status: null,
  rejectionReason: null,
  loading: true,
  signOut: async () => { },
  signIn: async () => ({ data: null, error: new Error("Not implemented") }),
  signUp: async () => ({ data: null, error: new Error("Not implemented") }),
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async (profileId: string) => {
    // Check admin status via their profile roles in user_roles table
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", profileId);

    const isUserAdmin = roles?.some(r => r.role === 'admin');
    setIsAdmin(!!isUserAdmin);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("status, rejection_reason")
      .eq("id", profileId)
      .maybeSingle();

    if (profileData) {
      // Admins are always treated as approved — never blocked by the approval gate
      setStatus(isUserAdmin ? "approved" : (profileData.status || "pending"));
      setRejectionReason(profileData.rejection_reason);
    }
  };

  const syncProfile = async (profile: any) => {
    setUser(profile);
    if (profile) {
      await checkAdmin(profile.id);
    } else {
      setIsAdmin(false);
      setStatus(null);
      setRejectionReason(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = localStorage.getItem("custom_user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Query profiles directly for the latest state of the profile
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", parsedUser.id)
            .maybeSingle();

          if (profile) {
            await syncProfile(profile);
          } else {
            // Profile deleted or key changed
            localStorage.removeItem("custom_user");
            await syncProfile(null);
          }
        } else {
          await syncProfile(null);
        }
      } catch (err) {
        console.error("Error initializing custom auth:", err);
        localStorage.removeItem("custom_user");
        await syncProfile(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .maybeSingle();

      if (error) {
        return { data: null, error };
      }

      if (!profile) {
        return { data: null, error: new Error("Invalid email or password") };
      }

      localStorage.setItem("custom_user", JSON.stringify(profile));
      await syncProfile(profile);

      return { data: profile, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  };

  const signUp = async (name: string, email: string, password: string, phone?: string) => {
    try {
      // Check if user with email already exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingUser) {
        return { data: null, error: new Error("User with this email already exists") };
      }

      // Check auto approve setting
      const { data: settings } = await supabase
        .from("settings")
        .select("auto_approve_users")
        .eq("id", "global")
        .maybeSingle();

      const autoApprove = settings?.auto_approve_users || false;

      const uuid = crypto.randomUUID();
      const { data: newProfile, error } = await supabase
        .from("profiles")
        .insert({
          id: uuid,
          user_id: uuid,
          name,
          email,
          password,
          phone: phone || null,
          status: "approved",
        })
        .select()
        .maybeSingle();

      if (error) {
        return { data: null, error };
      }

      if (newProfile) {
        // Auto-enroll in default courses if any are set
        const { data: defaultCourses } = await supabase
          .from("courses")
          .select("id")
          .eq("is_default", true);

        if (defaultCourses && defaultCourses.length > 0) {
          const enrollments = defaultCourses.map(course => ({
            user_id: uuid,
            course_id: course.id
          }));

          await supabase
            .from("enrollments")
            .upsert(enrollments, { onConflict: 'user_id,course_id' });
        }
      }

      localStorage.setItem("custom_user", JSON.stringify(newProfile));
      await syncProfile(newProfile);

      return { data: newProfile, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem("custom_user");
      await syncProfile(null);
      toast.success("Logged out successfully!");
    } catch (error) {
      console.error("Error during custom signOut:", error);
    } finally {
      queryClient.clear();
      setSession(null);
    }
  };


  return (
    <AuthContext.Provider value={{ session, user, isAdmin, status, rejectionReason, loading, signOut, signIn, signUp }}>
      {children}
    </AuthContext.Provider>
  );
};

