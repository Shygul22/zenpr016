import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [accountExists, setAccountExists] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Query profiles table directly to check if account exists
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      setLoading(false);
      
      if (error) {
        toast.error("Error checking account: " + error.message);
      } else if (profile) {
        setAccountExists(true);
        setSent(true);
      } else {
        toast.error("No account registered with this email address.");
      }
    } catch (err: any) {
      setLoading(false);
      toast.error("An error occurred: " + (err.message || err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-serif">Reset password</CardTitle>
          <CardDescription>
            {sent 
              ? "Account recovery instruction" 
              : "Enter your email to request a password reset from your administrator."}
          </CardDescription>
        </CardHeader>
        
        {sent ? (
          <CardContent className="space-y-4 text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">Account Found!</p>
            <p className="text-sm text-muted-foreground mb-4">
              Please contact your administrator to have your password securely reset or updated in the system.
            </p>
            <div className="rounded-lg border bg-muted/40 p-4 text-left space-y-2 text-sm">
              <p className="font-semibold text-foreground">Contact Person: Raja</p>
              <p className="text-muted-foreground">📧 <a href="mailto:support@optiontamiltrader.sbs" className="text-primary hover:underline">support@optiontamiltrader.sbs</a></p>
              <p className="text-muted-foreground">📧 <a href="mailto:rajaott542@gmail.com" className="text-primary hover:underline">rajaott542@gmail.com</a></p>
              <p className="text-muted-foreground">📞 <a href="tel:+919750479746" className="text-primary hover:underline">+91 9750479746</a></p>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  placeholder="you@example.com" 
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Checking..." : "Request Reset"}
              </Button>
            </CardFooter>
          </form>
        )}
        
        <CardFooter className="border-t pt-4">
          <Link to="/login" className="flex items-center gap-1 text-sm text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ForgotPassword;

