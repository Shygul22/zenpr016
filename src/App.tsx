import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Preloader } from "@/components/Preloader";
import { NetworkStatus } from "@/components/NetworkStatus";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CourseDetail from "./pages/CourseDetail";
import { MainLayout } from "./components/MainLayout";
import LessonPlayer from "./pages/LessonPlayer";
import MyCourses from "./pages/MyCourses";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

import AdminCourses from "./pages/admin/AdminCourses";
import AdminLessons from "./pages/admin/AdminLessons";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminSupport from "./pages/admin/AdminSupport";
import ApprovalStatus from "./pages/ApprovalStatus";
import Profile from "./pages/Profile";
import Fees from "./pages/Fees";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache stale time
      gcTime: 1000 * 60 * 30, // 30 minutes garbage collection time
      refetchOnWindowFocus: false, // Prevents aggressive, slow refetching when focusing/clicking back to the tab
      refetchOnReconnect: true,
      retry: 1, // Fail fast on connection loss instead of loading indefinitely
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <NetworkStatus />
      <Preloader />
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<MainLayout><Index /></MainLayout>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/courses/:id" element={<MainLayout><CourseDetail /></MainLayout>} />
            <Route path="/courses/:courseId/learn/:lessonId" element={
              <ProtectedRoute><LessonPlayer /></ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>
            } />
            <Route path="/my-courses" element={
              <ProtectedRoute><MainLayout><MyCourses /></MainLayout></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><MainLayout><Profile /></MainLayout></ProtectedRoute>
            } />
            <Route path="/fees" element={
              <ProtectedRoute><MainLayout><Fees /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly><MainLayout><AdminDashboard /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/courses" element={
              <ProtectedRoute adminOnly><MainLayout><AdminCourses /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/courses/:courseId/lessons" element={
              <ProtectedRoute adminOnly><MainLayout><AdminLessons /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute adminOnly><MainLayout><AdminUsers /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/payments" element={
              <ProtectedRoute adminOnly><MainLayout><AdminPayments /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/requests" element={
              <ProtectedRoute adminOnly><MainLayout><AdminRequests /></MainLayout></ProtectedRoute>
            } />
            <Route path="/admin/support" element={
              <ProtectedRoute adminOnly><MainLayout><AdminSupport /></MainLayout></ProtectedRoute>
            } />
            <Route path="/approval-status" element={<MainLayout><ApprovalStatus /></MainLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
