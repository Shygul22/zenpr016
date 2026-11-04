import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useSearchParams } from "react-router-dom";
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
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Search,
  User,
  ShieldAlert,
  ShieldCheck,
  Plus,
  KeyRound,
  BookOpen,
  Lock,
  Unlock,
  AlertCircle,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();

  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Manual Access Dialog State
  const [manualAccessOpen, setManualAccessOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");

  // Check if opened via query param ?action=manual-access
  useEffect(() => {
    if (searchParams.get("action") === "manual-access") {
      setManualAccessOpen(true);
    }
  }, [searchParams]);

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
    const matchesSearch =
      profile.name?.toLowerCase().includes(search.toLowerCase()) ||
      profile.email?.toLowerCase().includes(search.toLowerCase()) ||
      profile.phone?.includes(search);
    const matchesStatus = statusFilter === "all" || profile.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { data: adminUserIds, refetch: refetchAdmins } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_user_ids");
      if (error) throw error;
      return (data as any[]).map((d) => d.user_id) as string[];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["admin-courses-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, price, published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Enrollments for the currently selected student in the Manual Access dialog
  const { data: activeEnrollments, refetch: refetchEnrollments } = useQuery({
    queryKey: ["user-enrollments", selectedUserId],
    enabled: !!selectedUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", selectedUserId!);
      if (error) throw error;
      return data.map((e) => e.course_id);
    },
  });

  const { data: enrollmentCounts } = useQuery({
    queryKey: ["admin-enrollment-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("user_id");
      const counts: Record<string, number> = {};
      data?.forEach((e) => (counts[e.user_id] = (counts[e.user_id] || 0) + 1));
      return counts;
    },
  });

  // Selected student profile object
  const activeStudent = profiles?.find((p) => p.id === selectedUserId);

  // Auto-match when typing email in manual access modal
  const matchingProfiles = emailInput.trim()
    ? profiles?.filter(
        (p) =>
          p.email?.toLowerCase().includes(emailInput.toLowerCase().trim()) ||
          p.name?.toLowerCase().includes(emailInput.toLowerCase().trim())
      ).slice(0, 5)
    : [];

  const handleOpenAccessForUser = (userId: string) => {
    setSelectedUserId(userId);
    const target = profiles?.find((p) => p.id === userId);
    if (target?.email) {
      setEmailInput(target.email);
    }
    setManualAccessOpen(true);
  };

  const handleGrantAccess = async (courseId: string, courseTitle: string) => {
    if (!selectedUserId) return;

    try {
      // 1. Grant enrollment
      const { error: enrollError } = await supabase
        .from("enrollments")
        .upsert(
          { user_id: selectedUserId, course_id: courseId },
          { onConflict: "user_id,course_id" }
        );
      if (enrollError) throw enrollError;

      // 2. Auto-approve student profile if they were pending/rejected so they can access the app
      if (activeStudent && activeStudent.status !== "approved") {
        await supabase
          .from("profiles")
          .update({ status: "approved", rejection_reason: null })
          .eq("id", selectedUserId);
      }

      // 3. Mark any pending course_request as approved
      await supabase
        .from("course_requests" as any)
        .update({ status: "approved" })
        .eq("user_id", selectedUserId)
        .eq("course_id", courseId);

      toast.success(`Access to "${courseTitle}" granted to ${activeStudent?.email || "student"}!`);
      refetchEnrollments();
      queryClient.invalidateQueries({ queryKey: ["admin-enrollment-counts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to grant course access");
    }
  };

  const handleRevokeAccess = async (courseId: string, courseTitle: string) => {
    if (!selectedUserId) return;

    try {
      const { error } = await supabase
        .from("enrollments")
        .delete()
        .match({ user_id: selectedUserId, course_id: courseId });

      if (error) throw error;

      toast.success(`Access to "${courseTitle}" revoked for ${activeStudent?.email || "student"}.`);
      refetchEnrollments();
      queryClient.invalidateQueries({ queryKey: ["admin-enrollment-counts"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke course access");
    }
  };

  const handleGrantAllCourses = async () => {
    if (!selectedUserId || !courses?.length) return;

    try {
      const enrollments = courses.map((c) => ({
        user_id: selectedUserId,
        course_id: c.id,
      }));

      const { error } = await supabase
        .from("enrollments")
        .upsert(enrollments, { onConflict: "user_id,course_id" });

      if (error) throw error;

      if (activeStudent && activeStudent.status !== "approved") {
        await supabase
          .from("profiles")
          .update({ status: "approved", rejection_reason: null })
          .eq("id", selectedUserId);
      }

      toast.success(`Access to ALL ${courses.length} courses granted to ${activeStudent?.email}!`);
      refetchEnrollments();
      queryClient.invalidateQueries({ queryKey: ["admin-enrollment-counts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to grant all courses");
    }
  };

  const handleRevokeAllCourses = async () => {
    if (!selectedUserId) return;
    if (!confirm(`Are you sure you want to revoke ALL course access from ${activeStudent?.email}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("enrollments")
        .delete()
        .eq("user_id", selectedUserId);

      if (error) throw error;

      toast.success(`All course access revoked for ${activeStudent?.email}.`);
      refetchEnrollments();
      queryClient.invalidateQueries({ queryKey: ["admin-enrollment-counts"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke all courses");
    }
  };

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ status: "approved", rejection_reason: null })
      .eq("id", userId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("User approved");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    }
  };

  const handleApproveAll = async () => {
    setIsSubmitting(true);
    const pendingUsers = profiles?.filter((p) => p.status === "pending") || [];

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
      toast.success(`${pendingUsers.length} users approved`);
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
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
    const { error } = await supabase.rpc("toggle_admin_role", {
      target_user_id: userId,
      make_admin: !isCurrentlyAdmin,
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
        return (
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200">
            Approved
          </Badge>
        );
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
      default:
        return (
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 border-yellow-200">
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen">
      <main className="container py-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        {/* Header with Search and Manual Access CTA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-serif tracking-tight">Student Management</h1>
            {!isLoading && profiles && (
              <Badge variant="secondary" className="px-2 py-0.5 h-6 font-bold">
                {profiles.length} Users
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Prominent Manual Course Access CTA */}
            <Button
              onClick={() => {
                setSelectedUserId(null);
                setEmailInput("");
                setManualAccessOpen(true);
              }}
              className="bg-[#006837] hover:bg-[#00522c] text-white rounded-xl shadow-md gap-2 h-10 px-4"
            >
              <KeyRound className="h-4 w-4" />
              <span>Manual Course Access</span>
            </Button>

            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8 rounded-xl h-10"
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
              <SelectTrigger className="w-[140px] rounded-xl h-10">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Global Auto-Approve bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between bg-muted/30 p-4 rounded-2xl border border-border/60 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={settings?.auto_approve_users || false}
              onCheckedChange={handleToggleAutoApprove}
              disabled={isSubmitting}
            />
            <div className="flex flex-col">
              <span className="font-medium text-sm">Auto-Approve New User Registrations</span>
              <span className="text-xs text-muted-foreground">Automatically activate student accounts upon signup</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="border-green-200 hover:bg-green-50 text-green-600 gap-2 rounded-xl"
            onClick={handleApproveAll}
            disabled={isSubmitting || !profiles?.some((p) => p.status === "pending")}
          >
            <CheckCircle2 className="h-4 w-4" /> Approve All Pending
          </Button>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 overflow-hidden shadow-sm glass-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Registered Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell text-center">Courses Enrolled</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="text-right">Course Access & Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles?.map((profile) => (
                  <TableRow key={profile.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{profile.name || "—"}</span>
                          {adminUserIds?.includes(profile.id) && (
                            <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" /> Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{profile.phone || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{profile.email || "—"}</TableCell>
                    <TableCell>{getStatusBadge(profile.status || "pending")}</TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                        <BookOpen className="h-3 w-3" />
                        {enrollmentCounts?.[profile.id] || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs hidden md:table-cell">
                      {format(new Date(profile.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5 flex-wrap">
                        {/* Direct Course Access Button */}
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 bg-[#006837] hover:bg-[#00522c] text-white rounded-lg shadow-sm text-xs font-medium"
                          onClick={() => handleOpenAccessForUser(profile.id)}
                        >
                          <GraduationCap className="h-3.5 w-3.5" />
                          <span>Course Access</span>
                        </Button>

                        {profile.status !== "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 border-green-200 hover:bg-green-50 text-green-600 rounded-lg text-xs"
                            onClick={() => handleApprove(profile.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </Button>
                        )}
                        {profile.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs"
                            onClick={() => setRejectingUserId(profile.id)}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        )}
                        {profile.status === "approved" && profile.id !== currentUser?.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={`h-8 gap-1 rounded-lg text-xs ${
                              adminUserIds?.includes(profile.id)
                                ? "border-amber-200 hover:bg-amber-50 text-amber-600"
                                : "border-slate-200 hover:bg-slate-50 text-slate-600"
                            }`}
                            onClick={() =>
                              handleToggleAdmin(profile.id, adminUserIds?.includes(profile.id) || false)
                            }
                            disabled={isSubmitting}
                          >
                            {adminUserIds?.includes(profile.id) ? (
                              <>
                                <ShieldAlert className="h-3.5 w-3.5" /> Revoke Admin
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-3.5 w-3.5" /> Make Admin
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProfiles?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No matching students found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dedicated Manual Course Access Modal */}
        <Dialog
          open={manualAccessOpen}
          onOpenChange={(open) => {
            setManualAccessOpen(open);
            if (!open) {
              // Clear search params if present
              if (searchParams.get("action")) {
                setSearchParams({});
              }
            }
          }}
        >
          <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold font-serif">
                    Manual Course Access Manager
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Grant or revoke course access for any student using their registered email ID.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 py-3">
              {/* Email Lookup Input */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Student's Registered Email ID</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Type or search student email (e.g. rahul@gmail.com)..."
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      const exact = profiles?.find(
                        (p) => p.email?.toLowerCase().trim() === e.target.value.toLowerCase().trim()
                      );
                      if (exact) {
                        setSelectedUserId(exact.id);
                      }
                    }}
                    className="pl-9 rounded-xl h-10 font-mono text-sm"
                  />
                </div>

                {/* Autocomplete / Suggested Matching Pills */}
                {emailInput.trim() && !activeStudent && matchingProfiles.length > 0 && (
                  <div className="p-2 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block px-2">
                      Matching Registered Students:
                    </span>
                    {matchingProfiles.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedUserId(p.id);
                          setEmailInput(p.email || "");
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-primary/10 text-xs transition-colors"
                      >
                        <span className="font-semibold">{p.name || "Unnamed"}</span>
                        <span className="text-muted-foreground font-mono">{p.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Student Summary Card */}
              {activeStudent ? (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">
                        {activeStudent.name?.charAt(0) || "S"}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{activeStudent.name || "Student"}</div>
                        <div className="text-xs text-muted-foreground font-mono">{activeStudent.email}</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(activeStudent.status || "pending")}
                      <span className="text-[11px] text-muted-foreground">
                        {activeEnrollments?.length || 0} active courses
                      </span>
                    </div>
                  </div>

                  {activeStudent.status !== "approved" && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-800 dark:text-yellow-300 text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        Student account is currently <strong>{activeStudent.status}</strong>. Granting access will automatically approve them so they can log in immediately.
                      </span>
                    </div>
                  )}

                  {/* Bulk Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-primary/10">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGrantAllCourses}
                      className="text-xs h-8 border-primary/30 hover:bg-primary/10 text-primary rounded-lg"
                    >
                      Grant All Courses
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRevokeAllCourses}
                      className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg"
                    >
                      Revoke All Courses
                    </Button>
                  </div>
                </div>
              ) : emailInput.trim() ? (
                <div className="p-4 rounded-2xl bg-muted/40 border text-center text-muted-foreground text-xs">
                  No registered student found with email: <span className="font-mono font-semibold">{emailInput}</span>. The student must sign up or register first.
                </div>
              ) : null}

              {/* Course Access Checklist */}
              {activeStudent && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Available Courses</Label>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {courses?.map((course) => {
                      const isEnrolled = activeEnrollments?.includes(course.id) || false;

                      return (
                        <div
                          key={course.id}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                            isEnrolled
                              ? "bg-green-500/5 border-green-500/30"
                              : "bg-muted/30 border-border/50"
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-3">
                            <span className="font-semibold text-sm truncate">{course.title}</span>
                            <div className="flex items-center gap-2 mt-1">
                              {isEnrolled ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600 dark:text-green-400">
                                  <Check className="h-3.5 w-3.5" /> Active Access
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Lock className="h-3 w-3" /> Locked (No Access)
                                </span>
                              )}
                              {course.price && Number(course.price) > 0 ? (
                                <span className="text-[10px] text-muted-foreground">
                                  ₹{Number(course.price).toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-[10px] text-primary font-bold">FREE</span>
                              )}
                            </div>
                          </div>

                          <div>
                            {isEnrolled ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRevokeAccess(course.id, course.title)}
                                className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg gap-1"
                              >
                                <Lock className="h-3 w-3" />
                                <span>Revoke Access</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleGrantAccess(course.id, course.title)}
                                className="h-8 text-xs bg-[#006837] hover:bg-[#00522c] text-white rounded-lg gap-1 shadow-sm"
                              >
                                <Unlock className="h-3 w-3" />
                                <span>Grant Access</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {courses?.length === 0 && (
                      <p className="text-center text-muted-foreground py-6 text-sm">
                        No courses available in the database yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setManualAccessOpen(false)}
                className="rounded-xl"
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={!!rejectingUserId} onOpenChange={() => setRejectingUserId(null)}>
          <DialogContent className="rounded-3xl">
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
                  className="rounded-xl"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRejectingUserId(null)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isSubmitting || !rejectionReason.trim()}
                className="rounded-xl"
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
