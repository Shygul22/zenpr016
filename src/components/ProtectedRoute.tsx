import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { user, isAdmin, status, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Redirect to approval status page if not approved and not an admin
  if (!isAdmin && status !== "approved") {
    return <Navigate to="/approval-status" replace />;
  }

  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

