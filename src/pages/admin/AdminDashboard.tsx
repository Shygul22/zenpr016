import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { BookOpen, Users, GraduationCap, ChevronRight, Receipt, ClipboardCheck, MessageSquare, Megaphone } from "lucide-react";

const AdminDashboard = () => {
  const { data: courseCount } = useQuery({
    queryKey: ["admin-course-count"],
    queryFn: async () => {
      const { count } = await supabase.from("courses").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: userCount } = useQuery({
    queryKey: ["admin-user-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: enrollmentCount } = useQuery({
    queryKey: ["admin-enrollment-count"],
    queryFn: async () => {
      const { count } = await supabase.from("enrollments").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: totalRevenue } = useQuery({
    queryKey: ["admin-total-revenue"],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("amount").eq("status", "completed");
      return data?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;
    },
  });

  const { data: pendingRequests } = useQuery({
    queryKey: ["admin-pending-requests-count"],
    queryFn: async () => {
      const { count } = await supabase.from("course_requests" as any).select("*", { count: "exact", head: true }).eq("status", "pending");
      return count || 0;
    },
  });

  const { data: postCount } = useQuery({
    queryKey: ["admin-posts-count"],
    queryFn: async () => {
      const { count } = await supabase.from("posts").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const stats = [
    { label: "Courses", value: courseCount, icon: BookOpen, href: "/admin/courses" },
    { label: "Home Posts", value: postCount, icon: Megaphone, href: "/admin/posts" },
    { label: "Users", value: userCount, icon: Users, href: "/admin/users" },
    { label: "Revenue", value: `₹${(totalRevenue || 0).toLocaleString()}`, icon: Receipt, href: "/admin/payments" },
    { label: "Pending Requests", value: pendingRequests, icon: ClipboardCheck, href: "/admin/requests" },
    { label: "Support Chat", value: "Active", icon: MessageSquare, href: "/admin/support" },
  ];

  return (
    <div className="min-h-screen">
      <main className="container py-10">
        <h1 className="text-3xl font-bold font-serif tracking-tight mb-8">Admin Dashboard</h1>

        <div className="grid gap-6 sm:grid-cols-3 mb-10">
          {stats.map((stat) => (
            <Link key={stat.label} to={stat.href}>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stat.value ?? "—"}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link to="/admin/courses" className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-medium">Manage Courses</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/admin/users?action=manual-access" className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4 hover:bg-primary/10 transition-colors">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-5 w-5 text-primary" />
                <div>
                  <span className="font-medium block text-foreground">Manual Course Access</span>
                  <span className="text-[11px] text-muted-foreground">Grant/revoke student access by email</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-primary" />
            </Link>
            <Link to="/admin/posts" className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <Megaphone className="h-5 w-5 text-[#F37021]" />
                <span className="font-medium">Manage Home Posts</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/admin/users" className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium">View Users</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/admin/payments" className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-primary" />
                <span className="font-medium">Manage Payments</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/admin/requests" className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <span className="font-medium">Access Requests</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/admin/support" className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="font-medium">Support Center</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
