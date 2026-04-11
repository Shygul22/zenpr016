import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Link } from "react-router-dom";
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
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, CheckCircle2, XCircle, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [accessUserId, setAccessUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const { data: courses } = useQuery({
    queryKey: ["admin-courses-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .eq("published", true);
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
        .insert({ user_id: accessUserId, course_id: courseId });
      
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
      .eq("user_id", userId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("User approved");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    }
  };

  const handleReject = async () => {
    if (!rejectingUserId) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from("profiles")
      .update({ status: "rejected", rejection_reason: rejectionReason })
      .eq("user_id", rejectingUserId);

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
      <Navbar />
      <main className="container py-10">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <h1 className="text-3xl font-bold font-serif tracking-tight mb-6">Users</h1>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded" />)}
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Enrolled Courses</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles?.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.name || "—"}</TableCell>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell>{getStatusBadge(profile.status || "pending")}</TableCell>
                    <TableCell className="hidden md:table-cell">{enrollmentCounts?.[profile.user_id] || 0}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {format(new Date(profile.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {profile.status === "approved" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 gap-1 border-primary/20 hover:bg-primary/5 text-primary"
                            onClick={() => setAccessUserId(profile.user_id)}
                          >
                            <GraduationCap className="h-3.5 w-3.5" /> Access
                          </Button>
                        )}
                        {profile.status !== "approved" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 gap-1 border-green-200 hover:bg-green-50 text-green-600"
                            onClick={() => handleApprove(profile.user_id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </Button>
                        )}
                        {profile.status !== "rejected" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 gap-1 border-red-200 hover:bg-red-50 text-red-600"
                            onClick={() => setRejectingUserId(profile.user_id)}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {profiles?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                Directly enroll or unenroll this user from specific courses.
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
                <p className="text-center text-muted-foreground py-4">No published courses found.</p>
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
