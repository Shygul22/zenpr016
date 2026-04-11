import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
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
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="container py-10">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-3xl font-bold font-serif tracking-tight">Accounts & Fees</h1>
            <p className="text-muted-foreground mt-1">View your payment history and course access status.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
             <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
                <Receipt className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-serif">₹{totalPaid.toLocaleString()}</p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Courses</CardTitle>
                <CreditCard className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-serif">{payments?.filter((p: any) => p.status === "completed").length || 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-card">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle>Payment History</CardTitle>
              </div>
              <CardDescription>A detailed list of all your transactions.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                        <TableCell className="text-right pr-6 text-xs uppercase text-muted-foreground hidden md:table-cell">
                          {payment.payment_method}
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Fees;
