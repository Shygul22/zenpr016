import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Direct database-table credentials signup
      const { data, error } = await signUp(name, email, password, phone);

      if (error) {
        toast.error(error.message || "An error occurred during registration.");
      } else {
        toast.success("Account created successfully! Welcome to Option Tamil Trader.");
        navigate("/");
      }
    } catch (err: any) {

      console.error("Signup exception:", err);
      toast.error(err.message || "An unexpected error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8 overflow-hidden">
      {/* Ambient glass background glow */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-[#006837]/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 rounded-full bg-[#F37021]/15 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md glass-card rounded-3xl p-8 border border-white/50 dark:border-white/10 shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F37021]/10 text-[#F37021] border border-[#F37021]/20 shadow-sm">
            <BookOpen className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold font-serif tracking-tight">Create your account</h2>
          <p className="text-sm text-muted-foreground mt-1">Start learning something new today</p>
        </div>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
              className="rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus:border-primary"
            />
          </div>
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
            <Label htmlFor="phone" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Mobile Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              className="rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus:border-primary"
            />
          </div>
          <div className="pt-2 flex flex-col gap-3.5">
            <Button type="submit" variant="secondary" className="w-full h-11 rounded-xl shadow-lg shadow-orange-500/20 text-base font-semibold" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
