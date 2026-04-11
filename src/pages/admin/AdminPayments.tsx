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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Receipt, Plus } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

const AdminPayments = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    user_id: "",
    course_id: "",
    amount: "0",
    status: "completed",
    payment_method: "Manual",
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          profiles:user_id (name, email),
          courses:course_id (title)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .eq("status", "approved");
      if (error) throw error;
      return data;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["admin-courses-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, price");
      if (error) throw error;
      return data;
    },
  });

  const handleSaveRecord = async () => {
    if (!form.user_id) {
      toast.error("Please select a user");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Insert Payment
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: form.user_id,
          course_id: form.course_id || null,
          amount: Number(form.amount),
          status: form.status,
          payment_method: form.payment_method,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Auto-Enroll if completed and course selected
      if (form.status === "completed" && form.course_id) {
        const { error: enrollError } = await supabase
          .from("enrollments")
          .upsert({
            user_id: form.user_id,
            course_id: form.course_id,
          });
        
        if (enrollError) {
          console.error("Auto-enrollment failed:", enrollError);
          toast.warning("Payment recorded, but auto-enrollment failed.");
        }
      }

      toast.success("Payment record added successfully");
      setIsAdding(false);
      setForm({
        user_id: "",
        course_id: "",
        amount: "0",
        status: "completed",
        payment_method: "Manual",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-total-revenue"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to add payment record");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-10">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Receipt className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold font-serif tracking-tight">Payment Records</h1>
          </div>
          <Button onClick={() => setIsAdding(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Record
          </Button>
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
                  <TableHead>User</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments?.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm md:text-base">{payment.profiles?.name || "—"}</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">{payment.profiles?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{payment.courses?.title || "Manual Adjustment"}</TableCell>
                    <TableCell className="font-semibold">₹{Number(payment.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={payment.status === "completed" ? "default" : payment.status === "failed" ? "destructive" : "secondary"}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {format(new Date(payment.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                      {payment.payment_method}
                    </TableCell>
                  </TableRow>
                ))}
                {payments?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No payment records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Payment Record</DialogTitle>
              <DialogDescription>
                Manually record a payment for a student. If status is "Completed", they will be auto-enrolled in the course.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={form.user_id} onValueChange={(val) => setForm({ ...form, user_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles?.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.name} ({p.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Course (Optional)</Label>
                <Select value={form.course_id} onValueChange={(val) => {
                  const course = courses?.find(c => c.id === val);
                  setForm({ ...form, course_id: val, amount: course?.price?.toString() || form.amount });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / Manual Adjustment</SelectItem>
                    {courses?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title} (₹{c.price})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input 
                    type="number" 
                    value={form.amount} 
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Input 
                  placeholder="e.g. UPI, Cash, Bank Transfer" 
                  value={form.payment_method} 
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleSaveRecord} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Record"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminPayments;
