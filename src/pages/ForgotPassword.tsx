import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  AlertCircle,
} from "lucide-react";

export const ForgotPassword = () => {
  const navigate = useNavigate();

  // Step 1: Email & Mobile Verification
  // Step 2: Set New Password
  // Step 3: Success Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [verifiedProfile, setVerifiedProfile] = useState<any>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  // Helper to extract last 10 digits for flexible, resilient phone matching
  const normalizePhone = (p?: string | null) => {
    if (!p) return "";
    const digits = p.replace(/\D/g, "");
    return digits.length >= 10 ? digits.slice(-10) : digits;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanEmail || !cleanPhone) {
      toast.error("Please enter both your registered email and mobile number.");
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch user by email from profiles table
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, name, email, phone, status")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (error) {
        toast.error("Verification error: " + error.message);
        setLoading(false);
        return;
      }

      if (!profile) {
        toast.error("No account registered with this email address.");
        setLoading(false);
        return;
      }

      // 2. Compare registered mobile number
      const normalizedUserPhone = normalizePhone(cleanPhone);
      const normalizedDbPhone = normalizePhone(profile.phone);

      if (!normalizedDbPhone || normalizedDbPhone !== normalizedUserPhone) {
        toast.error("The mobile number does not match our records for this email address. Please check and try again.");
        setLoading(false);
        return;
      }

      // 3. Match successful! Move to Step 2
      setVerifiedProfile(profile);
      setStep(2);
      toast.success("Account verified! Please set your new password.");
    } catch (err: any) {
      toast.error("An error occurred during verification: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verifiedProfile) {
      toast.error("Verification session expired. Please verify your details again.");
      setStep(1);
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      // Update password directly in profiles table
      const { error } = await supabase
        .from("profiles")
        .update({ password: newPassword })
        .eq("id", verifiedProfile.id);

      if (error) {
        toast.error("Failed to update password: " + error.message);
        setLoading(false);
        return;
      }

      // Success
      setStep(3);
      toast.success("Password updated successfully!");
    } catch (err: any) {
      toast.error("An unexpected error occurred: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden bg-background">
      {/* Ambient background glow spots */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-[#006837]/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 rounded-full bg-[#F37021]/15 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md glass-card rounded-3xl p-8 border border-white/50 dark:border-white/10 shadow-2xl relative z-10">
        {/* Step 1: Verification (Email + Mobile Match) */}
        {step === 1 && (
          <div>
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <ShieldCheck className="h-7 w-7 text-[#006837] dark:text-[#20B76A]" />
              </div>
              <h2 className="text-2xl font-bold font-serif tracking-tight text-foreground">
                Reset Password
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Enter your registered Email ID and Mobile Number to verify your identity and set a new password.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs uppercase tracking-wider font-semibold text-muted-foreground"
                >
                  Registered Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="pl-10 rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus:border-primary h-11 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="phone"
                  className="text-xs uppercase tracking-wider font-semibold text-muted-foreground"
                >
                  Registered Mobile Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="9876543210 or +91 98765 43210"
                    className="pl-10 rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus:border-primary h-11 text-sm font-mono"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Must match the mobile number used when creating your account.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl shadow-md text-sm font-semibold bg-[#006837] hover:bg-[#00522c] text-white transition-all"
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </Button>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground pt-1 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Set New Password */}
        {step === 2 && verifiedProfile && (
          <div>
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F37021]/15 text-[#F37021] border border-[#F37021]/30 shadow-sm">
                <KeyRound className="h-7 w-7 text-[#F37021]" />
              </div>
              <h2 className="text-2xl font-bold font-serif tracking-tight text-foreground">
                Set New Password
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Account verified. Choose a secure new password for your account.
              </p>
            </div>

            {/* Verified Account Banner */}
            <div className="p-3.5 rounded-2xl bg-green-500/10 border border-green-500/20 mb-5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 text-green-600 dark:text-green-400 font-bold">
                {verifiedProfile.name?.charAt(0) || "U"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-green-700 dark:text-green-300 truncate">
                  {verifiedProfile.name || "Student"}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono truncate">
                  {verifiedProfile.email}
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="newPassword"
                  className="text-xs uppercase tracking-wider font-semibold text-muted-foreground"
                >
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    className="pr-10 rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus:border-primary h-11 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="confirmPassword"
                  className="text-xs uppercase tracking-wider font-semibold text-muted-foreground"
                >
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Re-type new password"
                    className="pr-10 rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus:border-primary h-11 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl shadow-md text-sm font-semibold bg-[#006837] hover:bg-[#00522c] text-white transition-all"
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  Use a different email/number
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Success Confirmation */}
        {step === 3 && (
          <div className="text-center py-4 space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 shadow-md">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold font-serif tracking-tight text-foreground">
                Password Updated!
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground max-w-xs mx-auto">
                Your account password has been updated successfully. You can now sign in using your new password.
              </p>
            </div>

            <Button
              onClick={() => navigate("/login")}
              className="w-full h-11 rounded-xl shadow-md text-sm font-semibold bg-[#006837] hover:bg-[#00522c] text-white"
            >
              Sign In Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
