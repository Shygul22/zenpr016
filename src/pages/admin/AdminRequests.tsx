import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ClipboardCheck, CheckCircle2, XCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const AdminRequests = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-course-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_requests" as any)
        .select(`
          *,
          profiles:user_id (name, email),
          courses:course_id (title)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const filteredRequests = requests?.filter((r) => {
    return r.profiles?.name?.toLowerCase().includes(search.toLowerCase()) || 
           r.profiles?.email?.toLowerCase().includes(search.toLowerCase()) ||
           r.courses?.title?.toLowerCase().includes(search.toLowerCase());
  });

  const handleApprove = async (request: any) => {
    try {
      // 1. Enroll user
      const { error: enrollError } = await supabase
        .from("enrollments")
        .upsert(
          { user_id: request.user_id, course_id: request.course_id },
          { onConflict: 'user_id,course_id' }
        );
      if (enrollError) throw enrollError;

      // 2. Mark request as approved
      const { error: updateError } = await supabase
        .from("course_requests" as any)
        .update({ status: "approved" })
        .eq("id", request.id);
      if (updateError) throw updateError;

      toast.success("Access granted and enrollment completed");
      queryClient.invalidateQueries({ queryKey: ["admin-course-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-enrollment-count"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to approve request");
    }
  };

  const handleReject = async (requestId: string) => {
    const { error } = await supabase
      .from("course_requests" as any)
      .update({ status: "rejected" })
      .eq("id", requestId);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Request rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-course-requests"] });
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
            <ClipboardCheck className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold font-serif tracking-tight">Access Requests</h1>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by student or course..." 
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
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded" />)}
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Requested Course</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests?.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{request.profiles?.name || "—"}</span>
                        <span className="text-xs text-muted-foreground">{request.profiles?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{request.courses?.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(request.created_at), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 gap-1 border-green-200 hover:bg-green-50 text-green-600"
                          onClick={() => handleApprove(request)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 gap-1 border-red-200 hover:bg-red-50 text-red-600"
                          onClick={() => handleReject(request.id)}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {requests?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      No pending access requests
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminRequests;
