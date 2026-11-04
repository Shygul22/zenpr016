import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, XCircle, LogOut } from "lucide-react";

const ApprovalStatus = () => {
  const { status, rejectionReason, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      <main className="container flex min-h-[calc(100-64px)] items-center justify-center py-20 px-4">
        <div className="w-full max-w-md text-center">
          {status === "pending" ? (
            <div className="space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold font-serif tracking-tight">Account Pending</h1>
                <p className="text-lg text-muted-foreground">
                  Your account is currently being reviewed by an administrator. This usually takes a few hours.
                </p>
              </div>
              <p className="text-sm text-muted-foreground italic">
                You will be able to access the courses once your account is approved.
              </p>
            </div>
          ) : status === "rejected" ? (
            <div className="space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold font-serif tracking-tight">Access Rejected</h1>
                <p className="text-lg text-muted-foreground">
                  Unfortunately, your request for access was not approved.
                </p>
              </div>
              {rejectionReason && (
                <div className="rounded-lg border bg-muted/50 p-4 text-left">
                  <p className="text-sm font-semibold mb-1">Reason for rejection:</p>
                  <p className="text-sm text-muted-foreground">{rejectionReason}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                If you believe this is a mistake, please contact support.
              </p>
            </div>
          ) : (
             <div className="space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold font-serif tracking-tight">Status Unknown</h1>
                <p className="text-lg text-muted-foreground">
                  We are having trouble fetching your status. Please try logging in again.
                </p>
              </div>
            </div>
          )}

          <div className="mt-10 pt-6 border-t">
            <Button variant="ghost" className="gap-2" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ApprovalStatus;
