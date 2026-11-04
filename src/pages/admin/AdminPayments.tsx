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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Receipt, Plus, Search, XCircle, Tag, Trash2, Check, Percent, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  // Coupons & Additional Fees Management State
  const [isManagingCoupons, setIsManagingCoupons] = useState(false);
  const [feeForm, setFeeForm] = useState({
    additional_fee: "0",
    additional_fee_label: "Platform & Processing Fee",
  });
  const [couponForm, setCouponForm] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "10",
    active: true,
  });

  // Query global settings for additional fee
  const { data: settingsData } = useQuery({
    queryKey: ["admin-fee-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings" as any)
        .select("additional_fee, additional_fee_label")
        .eq("id", "global")
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  useEffect(() => {
    if (settingsData) {
      setFeeForm({
        additional_fee: (settingsData.additional_fee ?? 0).toString(),
        additional_fee_label: settingsData.additional_fee_label || "Platform & Processing Fee",
      });
    }
  }, [settingsData]);

  // Query coupons list
  const { data: couponsList, refetch: refetchCoupons } = useQuery({
    queryKey: ["admin-coupons-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  // Save additional fee
  const handleSaveFeeSettings = async () => {
    try {
      const { error } = await supabase.from("settings" as any).upsert({
        id: "global",
        additional_fee: Number(feeForm.additional_fee || 0),
        additional_fee_label: feeForm.additional_fee_label,
      });

      if (error) throw error;
      toast.success("Additional fee settings saved successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-fee-settings"] });
    } catch (err: any) {
      toast.error("Failed to save fee settings: " + (err.message || ""));
    }
  };

  // Add new coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponForm.code.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Please enter a coupon code");
      return;
    }

    try {
      const { error } = await supabase.from("coupons" as any).insert({
        code: cleanCode,
        discount_type: couponForm.discount_type,
        discount_value: Number(couponForm.discount_value),
        active: couponForm.active,
      });

      if (error) throw error;
      toast.success(`Coupon code ${cleanCode} created!`);
      setCouponForm({
        code: "",
        discount_type: "percentage",
        discount_value: "10",
        active: true,
      });
      refetchCoupons();
    } catch (err: any) {
      toast.error("Failed to create coupon: " + (err.message || "Make sure coupons table exists"));
    }
  };

  // Toggle coupon active
  const handleToggleCoupon = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("coupons" as any)
        .update({ active: !currentActive })
        .eq("id", id);

      if (error) throw error;
      refetchCoupons();
      toast.success("Coupon status updated");
    } catch (err: any) {
      toast.error("Failed to update coupon status");
    }
  };

  // Delete coupon
  const handleDeleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase.from("coupons" as any).delete().eq("id", id);
      if (error) throw error;
      refetchCoupons();
      toast.success("Coupon deleted");
    } catch (err: any) {
      toast.error("Failed to delete coupon");
    }
  };

  const { data: allProfiles } = useQuery({
    queryKey: ["admin-all-profiles-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, name, email, phone");
      if (error) return [];
      return data || [];
    },
  });

  const profileMap = (allProfiles || []).reduce((acc: Record<string, any>, p: any) => {
    if (p.id) acc[p.id] = p;
    if (p.user_id) acc[p.user_id] = p;
    return acc;
  }, {});

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

  const courseMap = (courses || []).reduce((acc: Record<string, any>, c: any) => {
    if (c.id) acc[c.id] = c;
    return acc;
  }, {});

  const { data: payments, isLoading, error: queryError } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          profiles (name, email),
          courses (title)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredPayments = payments?.filter((p: any) => {
    const student = p.profiles || profileMap[p.user_id];
    const course = p.courses || courseMap[p.course_id];
    const name = student?.name?.toLowerCase() || "";
    const email = student?.email?.toLowerCase() || "";
    const courseTitle = course?.title?.toLowerCase() || "";
    const searchLower = search.toLowerCase();

    const matchesSearch = name.includes(searchLower) || email.includes(searchLower) || courseTitle.includes(searchLower) || p.payment_method?.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesMethod = methodFilter === "all" || (methodFilter === "Razorpay" ? p.payment_method?.toLowerCase().includes("razorpay") : p.payment_method === methodFilter);

    return matchesSearch && matchesStatus && matchesMethod;
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email");
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
          course_id: form.course_id === "none" ? null : (form.course_id || null),
          amount: Number(form.amount),
          status: form.status,
          payment_method: form.payment_method,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Auto-Enroll if completed and course selected
      if (form.status === "completed" && form.course_id && form.course_id !== "none") {
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
      <main className="container py-10">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Receipt className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-serif tracking-tight">Payment Records</h1>
              <p className="text-sm text-muted-foreground">Monitor and manage all course transactions</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => setIsManagingCoupons(true)}
              className="gap-2 w-full sm:w-auto border-border/80 hover:border-[#F37021]/60 hover:text-[#F37021] glass-card"
            >
              <Tag className="h-4 w-4 text-[#F37021]" /> Coupons & Additional Fees
            </Button>
            <Button onClick={() => setIsAdding(true)} className="gap-2 w-full sm:w-auto shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Add Record
            </Button>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 mb-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 bg-muted/30 border-none focus-visible:ring-primary"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px] h-11 bg-muted/30 border-none">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-full sm:w-[140px] h-11 bg-muted/30 border-none">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="Razorpay">Razorpay</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {queryError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl mb-6 flex flex-col gap-2">
            <h3 className="font-bold">Error Loading Data</h3>
            <p className="text-sm">{(queryError as any).message || "Unknown database error"}</p>
          </div>
        )}

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded" />)}
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="overflow-x-auto">
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
                  {filteredPayments?.map((payment: any) => {
                    const student = payment.profiles || profileMap[payment.user_id];
                    const course = payment.courses || courseMap[payment.course_id];
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm md:text-base text-foreground">
                              {student?.name || "Student (" + (payment.user_id?.slice(0, 8) || "—") + ")"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {student?.email || student?.phone || "No email available"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {course?.title || (payment.course_id ? "Course ID: " + payment.course_id.slice(0, 8) : "Manual Adjustment")}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold">₹{Number(payment.amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "completed" ? "default" : payment.status === "failed" ? "destructive" : "secondary"}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell">
                          {format(new Date(payment.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                          {payment.payment_method?.toLowerCase().includes("razorpay") ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary font-mono font-medium text-[11px] border border-primary/20">
                              {payment.payment_method}
                            </span>
                          ) : (
                            <span className="uppercase tracking-wider">{payment.payment_method}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                      <SelectItem key={p.id} value={p.id}>
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
                <Select value={form.payment_method} onValueChange={(val) => setForm({ ...form, payment_method: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manual">Manual</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
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
        {/* Manage Coupons & Additional Fees Dialog */}
        <Dialog open={isManagingCoupons} onOpenChange={setIsManagingCoupons}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 glass-card shadow-2xl">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold font-serif flex items-center gap-2">
                <Tag className="h-5 w-5 text-[#F37021]" />
                Manage Coupons & Additional Fees
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set platform/processing fees and create discount coupon codes for students at checkout.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="coupons" className="w-full">
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="coupons" className="font-semibold gap-2">
                  <Tag className="h-4 w-4" /> Coupon Codes
                </TabsTrigger>
                <TabsTrigger value="fees" className="font-semibold gap-2">
                  <Settings2 className="h-4 w-4" /> Additional Fees
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Coupon Codes */}
              <TabsContent value="coupons" className="space-y-6">
                {/* Create Coupon Form */}
                <form onSubmit={handleCreateCoupon} className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Create New Coupon</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Coupon Code</Label>
                      <Input
                        value={couponForm.code}
                        onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                        placeholder="e.g. OTT20"
                        className="uppercase font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Discount Type</Label>
                      <Select
                        value={couponForm.discount_type}
                        onValueChange={(val: "percentage" | "fixed") => setCouponForm({ ...couponForm, discount_type: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (% OFF)</SelectItem>
                          <SelectItem value="fixed">Fixed (₹ Flat OFF)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Discount Value</Label>
                      <Input
                        type="number"
                        min="1"
                        value={couponForm.discount_value}
                        onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                        placeholder="10"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={couponForm.active}
                        onCheckedChange={(checked) => setCouponForm({ ...couponForm, active: checked })}
                      />
                      <span className="text-xs font-medium">Active Immediately</span>
                    </div>
                    <Button type="submit" size="sm" variant="secondary" className="shadow-md shadow-orange-500/20 font-semibold">
                      <Plus className="h-4 w-4 mr-1" /> Add Coupon
                    </Button>
                  </div>
                </form>

                {/* Coupons List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Existing Coupons</h4>
                  {couponsList && couponsList.length > 0 ? (
                    <div className="divide-y border rounded-2xl overflow-hidden bg-card/60">
                      {couponsList.map((c: any) => (
                        <div key={c.id} className="p-3.5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-mono font-bold text-xs border border-primary/20">
                              {c.code}
                            </span>
                            <span className="text-sm font-medium">
                              {c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `₹${c.discount_value} Flat OFF`}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <Switch
                                checked={c.active}
                                onCheckedChange={() => handleToggleCoupon(c.id, c.active)}
                              />
                              <span className="text-xs text-muted-foreground">{c.active ? "Active" : "Paused"}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteCoupon(c.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-dashed rounded-2xl text-muted-foreground text-xs">
                      No custom coupons created yet. Default promo codes <span className="font-mono font-bold text-foreground">WELCOME10</span> (10% OFF) and <span className="font-mono font-bold text-foreground">OTT10</span> are active.
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab 2: Additional Fees Settings */}
              <TabsContent value="fees" className="space-y-4">
                <div className="p-5 rounded-2xl bg-muted/40 border border-border/70 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Additional Fee Amount (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={feeForm.additional_fee}
                      onChange={(e) => setFeeForm({ ...feeForm, additional_fee: e.target.value })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Set to 0 if you do not want to charge any additional fees. For example: 49 for ₹49 platform fee.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Fee Label (Shown on Student Bill)</Label>
                    <Input
                      value={feeForm.additional_fee_label}
                      onChange={(e) => setFeeForm({ ...feeForm, additional_fee_label: e.target.value })}
                      placeholder="Platform & Processing Fee"
                    />
                  </div>

                  <Button type="button" onClick={handleSaveFeeSettings} className="w-full font-semibold shadow-md">
                    Save Additional Fee Settings
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsManagingCoupons(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminPayments;
