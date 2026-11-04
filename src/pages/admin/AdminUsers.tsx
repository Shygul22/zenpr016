import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, CheckCircle2, XCircle, GraduationCap, Search, User, ShieldAlert, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [accessUserId, setAccessUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { user: currentUser } = useAuth();

  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("auto_approve_users")
        .eq("id", "global")
        .maybeSingle();
      if (error) {
        console.error("Error fetching settings", error);
        return { auto_approve_users: false };
      }
      return data || { auto_approve_users: false };
    },
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredProfiles = profiles?.filter((profile) => {
    const matchesSearch = profile.name?.toLowerCase().includes(search.toLowerCase()) || 
                          profile.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || profile.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { data: adminUserIds, refetch: refetchAdmins } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_user_ids');
      if (error) throw error;
      return (data as any[]).map(d => d.user_id) as string[];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["admin-courses-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title");
      if (error) throw error;
      return data;
    },
  });

  const { data: userEnrollments } = useQuery({
    queryKey: ["user-enrollments", accessUserId],
    enabled: !!accessUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", accessUserId!);
      if (error) throw error;
      return data.map((e) => e.course_id);
    },
  });

  const handleToggleAccess = async (courseId: string, isEnrolled: boolean) => {
    if (!accessUserId) return;

    if (isEnrolled) {
      // Unenroll
      const { error } = await supabase
        .from("enrollments")
        .delete()
        .match({ user_id: accessUserId, course_id: courseId });
      
      if (error) toast.error(error.message);
      else toast.success("Access revoked");
    } else {
      // Enroll
      const { error } = await supabase
        .from("enrollments")
        .upsert(
          { user_id: accessUserId, course_id: courseId },
          { onConflict: 'user_id,course_id' }
        );
      
      if (error) toast.error(error.message);
      else toast.success("Access granted");
    }
    
    queryClient.invalidateQueries({ queryKey: ["user-enrollments", accessUserId] });
    queryClient.invalidateQueries({ queryKey: ["admin-enrollment-counts"] });
  };

  const { data: enrollmentCounts } = useQuery({
    queryKey: ["admin-enrollment-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("user_id");
      const counts: Record<string, number> = {};
      data?.forEach((e) => (counts[e.user_id] = (counts[e.user_id] || 0) + 1));
      return counts;
    },
  });

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ status: "approved", rejection_reason: null })
      .eq("id", userId);

    if (error) {
      toast.error(error.message);
    } else {
      // Auto-enroll in default courses
      const { data: defaultCourses } = await supabase
        .from("courses")
        .select("id")
        .eq("is_default", true);

      if (defaultCourses && defaultCourses.length > 0) {
        const enrollments = defaultCourses.map(course => ({
          user_id: userId,
          course_id: course.id
        }));

        await supabase
          .from("enrollments")
          .upsert(enrollments, { onConflict: 'user_id,course_id' });
      }

      toast.success("User approved & enrolled in default courses");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-enrollment-counts"] });
    }
  };

  const handleApproveAll = async () => {
    setIsSubmitting(true);
    
    // Find all pending users
    const pendingUsers = profiles?.filter(p => p.status === "pending") || [];
    
    if (pendingUsers.length === 0) {
      toast.info("No pending users to approve");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ status: "approved", rejection_reason: null })
      .eq("status", "pending");

    if (error) {
      toast.error(error.message);
    } else {
      // Auto-enroll all newly approved users in default courses
      const { data: defaultCourses } = await supabase
        .from("courses")
        .select("id")
        .eq("is_default", true);

      if (defaultCourses && defaultCourses.length > 0) {
        const enrollments = [];
        for (const user of pendingUsers) {
          for (const course of defaultCourses) {
            enrollments.push({ user_id: user.id, course_id: course.id });
          }
        }
        
        if (enrollments.length > 0) {
          await supabase
            .from("enrollments")
            .upsert(enrollments, { onConflict: 'user_id,course_id' });
        }
      }

      toast.success(`${pendingUsers.length} users approved`);
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-enrollment-counts"] });
    }
    setIsSubmitting(false);
  };

  const handleToggleAutoApprove = async (enabled: boolean) => {
    setIsSubmitting(true);
    const { error } = await supabase
      .from("settings")
      .upsert({ id: "global", auto_approve_users: enabled });
      
    if (error) {
      toast.error("Failed to update settings: " + error.message);
    } else {
      toast.success(`Auto-approval ${enabled ? "enabled" : "disabled"}`);
      refetchSettings();
    }
    setIsSubmitting(false);
  };

  const handleReject = async () => {
    if (!rejectingUserId) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from("profiles")
      .update({ status: "rejected", rejection_reason: rejectionReason })
      .eq("id", rejectingUserId);

    setIsSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("User rejected");
      setRejectingUserId(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    }
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (userId === currentUser?.id) {
      toast.error("You cannot change your own admin status.");
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await supabase.rpc('toggle_admin_role', { 
      target_user_id: userId, 
      make_admin: !isCurrentlyAdmin 
    });
    
    setIsSubmitting(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isCurrentlyAdmin ? "Admin access revoked" : "Admin access granted");
      refetchAdmins();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
      default:
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 border-yellow-200">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen">
      <main className="container py-10">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-serif tracking-tight">Users</h1>
            {!isLoading && profiles && (
              <Badge variant="secondary" className="px-2 py-0.5 h-6 font-bold">{profiles.length}</Badge>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or email..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {search && (
                <button 
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between bg-muted/30 p-4 rounded-lg border mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Switch 
              checked={settings?.auto_approve_users || false}
              onCheckedChange={handleToggleAutoApprove}
              disabled={isSubmitting}
            />
            <div className="flex flex-col">
              <span className="font-medium text-sm">Auto-Approve New Users</span>
              <span className="text-xs text-muted-foreground">Automatically grant access to new signups</span>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="border-green-200 hover:bg-green-50 text-green-600 gap-2"
            onClick={handleApproveAll}
            disabled={isSubmitting || !profiles?.some(p => p.status === "pending")}
          >
            <CheckCircle2 className="h-4 w-4" /> Approve All Pending
          </Button>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded" />)}
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile</TableHead>
                  <TableHead>Mobile Number</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Enrolled Courses</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles?.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span>{profile.name || "—"}</span>
                          {adminUserIds?.includes(profile.id) && (
                            <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" /> Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{profile.phone || "—"}</TableCell>
                    <TableCell>{profile.email || "—"}</TableCell>
                    <TableCell>{getStatusBadge(profile.status || "pending")}</TableCell>
                    <TableCell className="hidden md:table-cell">{enrollmentCounts?.[profile.id] || 0}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {format(new Date(profile.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 gap-1 border-primary/20 hover:bg-primary/5 text-primary"
                            onClick={() => setAccessUserId(profile.id)}
                          >
                            <GraduationCap className="h-3.5 w-3.5" /> Access
                          </Button>
                        {profile.status !== "approved" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 gap-1 border-green-200 hover:bg-green-50 text-green-600"
                            onClick={() => handleApprove(profile.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </Button>
                        )}
                        {profile.status !== "rejected" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 gap-1 border-red-200 hover:bg-red-50 text-red-600"
                            onClick={() => setRejectingUserId(profile.id)}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        )}
                        {profile.status === "approved" && profile.id !== currentUser?.id && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className={`h-8 gap-1 ${adminUserIds?.includes(profile.id) ? "border-amber-200 hover:bg-amber-50 text-amber-600" : "border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                            onClick={() => handleToggleAdmin(profile.id, adminUserIds?.includes(profile.id) || false)}
                            disabled={isSubmitting}
                          >
                            {adminUserIds?.includes(profile.id) ? (
                              <><ShieldAlert className="h-3.5 w-3.5" /> Revoke Admin</>
                            ) : (
                              <><ShieldCheck className="h-3.5 w-3.5" /> Make Admin</>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {profiles?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Manage Access Dialog */}
        <Dialog open={!!accessUserId} onOpenChange={() => setAccessUserId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Course Access</DialogTitle>
              <DialogDescription>
                Directly enroll or unenroll this user from specific courses. Changes take effect immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {courses?.map((course) => {
                const isEnrolled = userEnrollments?.includes(course.id) || false;
                return (
                  <div key={course.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{course.title}</span>
                    </div>
                    <Switch 
                      checked={isEnrolled}
                      onCheckedChange={() => handleToggleAccess(course.id, isEnrolled)}
                    />
                  </div>
                );
              })}
              {courses?.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No courses found.</p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setAccessUserId(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={!!rejectingUserId} onOpenChange={() => setRejectingUserId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject User Access</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this user. They will see this message when they log in.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason</Label>
                <Input 
                  id="reason" 
                  placeholder="e.g. Invalid registration details" 
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRejectingUserId(null)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={isSubmitting || !rejectionReason.trim()}
              >
                {isSubmitting ? "Rejecting..." : "Reject User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminUsers;
