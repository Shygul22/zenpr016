import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CourseDetail from "./pages/CourseDetail";
import LessonPlayer from "./pages/LessonPlayer";
import MyCourses from "./pages/MyCourses";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminLessons from "./pages/admin/AdminLessons";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminRequests from "./pages/admin/AdminRequests";
import ApprovalStatus from "./pages/ApprovalStatus";
import Profile from "./pages/Profile";
import Fees from "./pages/Fees";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/courses/:courseId/learn/:lessonId" element={
              <ProtectedRoute><LessonPlayer /></ProtectedRoute>
            } />
            <Route path="/my-courses" element={
              <ProtectedRoute><MyCourses /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><Profile /></ProtectedRoute>
            } />
            <Route path="/fees" element={
              <ProtectedRoute><Fees /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/courses" element={
              <ProtectedRoute adminOnly><AdminCourses /></ProtectedRoute>
            } />
            <Route path="/admin/courses/:courseId/lessons" element={
              <ProtectedRoute adminOnly><AdminLessons /></ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>
            } />
            <Route path="/admin/payments" element={
              <ProtectedRoute adminOnly><AdminPayments /></ProtectedRoute>
            } />
            <Route path="/admin/requests" element={
              <ProtectedRoute adminOnly><AdminRequests /></ProtectedRoute>
            } />
            <Route path="/approval-status" element={<ApprovalStatus />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
