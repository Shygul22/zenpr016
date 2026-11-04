import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Direct database-table credential verification
      const { data, error } = await signIn(email, password);

      if (error) {
        toast.error(error.message || "Invalid email or password");
      } else {
        toast.success("Logged in successfully! Welcome back!");
        navigate("/");
      }
    } catch (err: any) {
      console.error("Login exception:", err);
      toast.error(err.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }

  };


  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Ambient glass background glow */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-[#006837]/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-[#F37021]/15 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md glass-card rounded-3xl p-8 border border-white/50 dark:border-white/10 shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
            <BookOpen className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold font-serif tracking-tight">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1">Sign in to continue learning</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Password</Label>
              <Link to="/forgot-password" className="text-xs text-[#F37021] hover:underline font-medium">Forgot password?</Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus:border-primary"
            />
          </div>

          <div className="pt-2 flex flex-col gap-3.5">
            <Button type="submit" className="w-full h-11 rounded-xl shadow-md text-base font-semibold" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-[#F37021] font-semibold hover:underline">Sign up</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
