import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Receipt, History, CreditCard } from "lucide-react";
import { format } from "date-fns";

const Fees = () => {
  const { user } = useAuth();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["user-payments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          courses:course_id (title)
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalPaid = payments?.reduce((acc: number, curr: any) =>
    curr.status === "completed" ? acc + Number(curr.amount) : acc, 0) || 0;

  return (
    <div className="min-h-screen">
      <main className="container py-10">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-3xl font-bold font-serif tracking-tight">Accounts & Fees</h1>
            <p className="text-muted-foreground mt-1">View your payment history and course access status.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="glass-card rounded-2xl p-6 border border-white/50 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-primary/40 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/15 transition-all" />
              <div className="flex flex-row items-center justify-between pb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Paid</span>
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Receipt className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-bold font-serif text-foreground">₹{totalPaid.toLocaleString()}</p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/50 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-[#F37021]/40 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F37021]/10 rounded-full blur-2xl group-hover:bg-[#F37021]/15 transition-all" />
              <div className="flex flex-row items-center justify-between pb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Courses</span>
                <div className="p-2 rounded-xl bg-[#F37021]/10 text-[#F37021]">
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-bold font-serif text-foreground">{payments?.filter((p: any) => p.status === "completed").length || 0}</p>
            </div>
          </div>

          <div className="glass-card rounded-3xl border border-white/50 dark:border-white/10 shadow-lg overflow-hidden">
            <div className="p-6 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-serif">Payment History</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">A detailed list of all your transactions.</p>
                </div>
              </div>
            </div>
            <div className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground animate-pulse">Loading history...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="pl-6">Course / Item</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6 hidden md:table-cell">Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments?.map((payment: any) => (
                      <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium pl-6">
                          {payment.courses?.title || "Account Fee / Other"}
                        </TableCell>
                        <TableCell className="font-semibold">₹{Number(payment.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell">
                          {format(new Date(payment.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "completed" ? "default" : payment.status === "failed" ? "destructive" : "secondary"}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6 text-xs text-muted-foreground hidden md:table-cell">
                          {payment.payment_method?.toLowerCase().includes("razorpay") ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary font-mono font-medium text-[11px] border border-primary/20">
                              {payment.payment_method}
                            </span>
                          ) : (
                            <span className="uppercase tracking-wider">{payment.payment_method}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {payments?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          No transactions found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Fees;
