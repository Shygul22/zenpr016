import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { User, Mail, Calendar, ShieldCheck } from "lucide-react";

const Profile = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      
      if (error) throw error;
      setName(data.name || "");
      return data;
    },
  });

  const handleUpdate = async () => {
    if (!user) return;
    setIsUpdating(true);

    const { error } = await supabase
      .from("profiles")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    setIsUpdating(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container py-10 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="container py-10 max-w-2xl px-4">
        <h1 className="text-3xl font-bold font-serif tracking-tight mb-8">My Profile</h1>

        <div className="space-y-6">
          <Card className="overflow-hidden border-none shadow-lg">
            <div className="h-24 bg-primary/10 flex items-end justify-center pb-0">
               <div className="h-20 w-20 rounded-full bg-background border-4 border-background -mb-8 flex items-center justify-center shadow-md">
                <User className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardHeader className="pt-12 text-center pb-2">
              <CardTitle className="text-2xl font-serif">{profile?.name || "Member"}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-1">
                {isAdmin ? (
                  <Badge variant="outline" className="gap-1 border-primary/20 bg-primary/5 text-primary">
                    <ShieldCheck className="h-3 w-3" /> Administrator
                  </Badge>
                ) : (
                  "Student Member"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              <div className="grid gap-4 pt-4">
                <div className="flex items-center gap-3 text-muted-foreground bg-muted/40 p-3 rounded-lg">
                  <Mail className="h-4 w-4" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground/70 uppercase">Email Address</p>
                    <p className="text-sm">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground bg-muted/40 p-3 rounded-lg">
                  <Calendar className="h-4 w-4" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground/70 uppercase">Member Since</p>
                    <p className="text-sm">{format(new Date(profile?.created_at || new Date()), "MMMM d, yyyy")}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Update Details</h3>
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t py-4">
              <Button 
                onClick={handleUpdate} 
                className="w-full" 
                disabled={isUpdating || name === profile?.name}
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
};

// Helper inside the same file for simplicity since it's used once
const Badge = ({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);

export default Profile;
