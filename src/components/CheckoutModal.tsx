import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { ShieldCheck, Tag, X, ExternalLink, Loader2, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    title: string;
    price: number;
    thumbnail_url?: string;
  };
  user: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  firstLessonId?: string;
}

export const CheckoutModal = ({
  isOpen,
  onClose,
  course,
  user,
  firstLessonId,
}: CheckoutModalProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: "percentage" | "fixed";
    value: number;
    discountAmount: number;
  } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Mandatory Terms Acceptance Checkbox
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Additional fee from global settings (e.g. platform fee)
  const [additionalFee, setAdditionalFee] = useState<number>(0);
  const [additionalFeeLabel, setAdditionalFeeLabel] = useState<string>("Platform & Processing Fee");

  // Fetch fees & active settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("settings" as any)
          .select("additional_fee, additional_fee_label")
          .eq("id", "global")
          .maybeSingle();

        if (data && !error) {
          if (data.additional_fee !== undefined && data.additional_fee !== null) {
            setAdditionalFee(Number(data.additional_fee));
          }
          if (data.additional_fee_label) {
            setAdditionalFeeLabel(data.additional_fee_label);
          }
        }
      } catch (err) {
        console.error("Error fetching fee settings:", err);
      }
    };

    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const basePrice = Math.max(0, Number(course.price || 0));

  // Compute discount
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "percentage") {
      discountAmount = Math.round((basePrice * appliedCoupon.value) / 100);
    } else {
      discountAmount = Math.min(basePrice, appliedCoupon.value);
    }
  }

  const finalTotal = Math.max(0, basePrice - discountAmount + (basePrice > 0 ? additionalFee : 0));

  // Apply Coupon logic
  const handleApplyCoupon = async () => {
    const cleanCode = couponInput.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Please enter a coupon code");
      return;
    }

    setIsValidatingCoupon(true);
    try {
      // 1. Check Supabase coupons table
      const { data: couponData, error } = await supabase
        .from("coupons" as any)
        .select("*")
        .eq("code", cleanCode)
        .eq("active", true)
        .maybeSingle();

      if (couponData && !error) {
        const discountVal = Number(couponData.discount_value);
        const discountType = (couponData.discount_type || "fixed") as "percentage" | "fixed";
        let calcDiscount = 0;
        if (discountType === "percentage") {
          calcDiscount = Math.round((basePrice * discountVal) / 100);
        } else {
          calcDiscount = Math.min(basePrice, discountVal);
        }

        setAppliedCoupon({
          code: cleanCode,
          type: discountType,
          value: discountVal,
          discountAmount: calcDiscount,
        });
        toast.success(`Coupon "${cleanCode}" applied! Saved ₹${calcDiscount}`);
        setCouponInput("");
        return;
      }

      // 2. Built-in promo fallback (e.g. WELCOME10 for 10% off)
      if (cleanCode === "WELCOME10" || cleanCode === "OTT10") {
        const calcDiscount = Math.round((basePrice * 10) / 100);
        setAppliedCoupon({
          code: cleanCode,
          type: "percentage",
          value: 10,
          discountAmount: calcDiscount,
        });
        toast.success(`Coupon "${cleanCode}" applied! 10% OFF (Saved ₹${calcDiscount})`);
        setCouponInput("");
        return;
      }

      toast.error("Invalid or expired coupon code");
    } catch (err: any) {
      console.error("Coupon verification error:", err);
      toast.error("Failed to verify coupon code");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.info("Coupon removed");
  };

  // Payment Execution
  const handleProceedToPayment = async () => {
    if (!acceptedTerms) {
      toast.error("Please accept the Terms of Service, Refund Policy, and Privacy Policy to proceed.");
      return;
    }

    if (finalTotal <= 0) {
      // Free or 100% discounted course
      setIsProcessingPayment(true);
      try {
        const { error: enrollError } = await supabase.from("enrollments").upsert(
          {
            user_id: user.id,
            course_id: course.id,
          },
          { onConflict: "user_id,course_id" }
        );

        if (enrollError) throw enrollError;

        await supabase.from("payments").insert({
          user_id: user.id,
          course_id: course.id,
          amount: 0,
          status: "completed",
          payment_method: appliedCoupon ? `Coupon 100% (${appliedCoupon.code})` : "Free Enrollment",
        });

        queryClient.invalidateQueries({ queryKey: ["enrollment", course.id, user.id] });
        queryClient.invalidateQueries({ queryKey: ["user-payments", user.id] });
        queryClient.invalidateQueries({ queryKey: ["my-courses-dashboard", user.id] });

        toast.success(`🎉 Congratulations! You are enrolled in ${course.title}.`);
        onClose();

        if (firstLessonId) {
          navigate(`/courses/${course.id}/learn/${firstLessonId}`);
        }
      } catch (err: any) {
        toast.error("Enrollment failed: " + (err.message || "Unknown error"));
      } finally {
        setIsProcessingPayment(false);
      }
      return;
    }

    // Razorpay Paid Checkout
    setIsProcessingPayment(true);
    try {
      await openRazorpayCheckout({
        amount: Math.round(finalTotal * 100), // in paise
        currency: "INR",
        name: "Option Tamil Trader",
        description: course.title,
        image: course.thumbnail_url || "/logo.jpeg",
        prefill: {
          name: user.name || "",
          email: user.email || "",
          contact: user.phone || "",
        },
        notes: {
          course_id: course.id,
          user_id: user.id,
          coupon_code: appliedCoupon?.code || "",
          additional_fee: additionalFee.toString(),
        },
        handler: async (response) => {
          try {
            // 1. Record payment in Supabase
            const paymentMethodStr = appliedCoupon
              ? `Razorpay (${response.razorpay_payment_id}) [Coupon: ${appliedCoupon.code}]`
              : `Razorpay (${response.razorpay_payment_id})`;

            await supabase.from("payments").insert({
              user_id: user.id,
              course_id: course.id,
              amount: finalTotal,
              status: "completed",
              payment_method: paymentMethodStr,
            });

            // 2. Automatically enroll student
            await supabase.from("enrollments").upsert(
              {
                user_id: user.id,
                course_id: course.id,
              },
              { onConflict: "user_id,course_id" }
            );

            // 3. Invalidate caches
            queryClient.invalidateQueries({ queryKey: ["enrollment", course.id, user.id] });
            queryClient.invalidateQueries({ queryKey: ["user-payments", user.id] });
            queryClient.invalidateQueries({ queryKey: ["all-progress", user.id] });
            queryClient.invalidateQueries({ queryKey: ["my-courses-dashboard", user.id] });
            queryClient.invalidateQueries({ queryKey: ["admin-payments"] });

            toast.success(`🎉 Payment Successful! Welcome to ${course.title}.`);
            onClose();

            if (firstLessonId) {
              navigate(`/courses/${course.id}/learn/${firstLessonId}`);
            }
          } catch (err: any) {
            console.error("Payment finalize error:", err);
            toast.error("Payment received, but error recording access. Contact support.");
          } finally {
            setIsProcessingPayment(false);
          }
        },
        onError: (err) => {
          setIsProcessingPayment(false);
          toast.error(err?.description || "Payment was cancelled or failed.");
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
          },
        },
      });
    } catch (err: any) {
      console.error("Razorpay initiation error:", err);
      toast.error(err.message || "Failed to start Razorpay. Please check connection.");
      setIsProcessingPayment(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isProcessingPayment) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 shadow-2xl glass-card">
        {/* Header with gradient shimmer */}
        <div className="relative p-6 pb-4 bg-gradient-to-r from-primary/10 via-primary/5 to-[#F37021]/10 border-b border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-serif flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Course Checkout
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review your purchase details and complete your enrollment securely.
            </DialogDescription>
          </DialogHeader>

          {/* Course Summary Pill */}
          <div className="mt-4 p-3 rounded-2xl bg-card/80 backdrop-blur-md border border-white/50 dark:border-white/10 flex items-center gap-3">
            <div className="h-12 w-16 rounded-xl overflow-hidden bg-muted shrink-0">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
              ) : (
                <img src="/logo.jpeg" alt="Logo" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate text-foreground">{course.title}</h4>
              <p className="text-xs text-muted-foreground">Full Course Lifetime Access</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Coupon Code Section */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Have a Coupon Code?
            </Label>
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#006837]/10 border border-[#006837]/20 text-[#006837] dark:text-[#20B76A]">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Tag className="h-4 w-4" />
                  <span>{appliedCoupon.code}</span>
                  <span className="text-xs font-medium">
                    ({appliedCoupon.type === "percentage" ? `${appliedCoupon.value}% OFF` : `₹${appliedCoupon.value} OFF`})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                  onClick={handleRemoveCoupon}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Enter coupon (e.g. OTT10)"
                  className="rounded-xl h-10 uppercase font-mono text-sm"
                  disabled={isValidatingCoupon}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl h-10 px-4 font-semibold shrink-0"
                  onClick={handleApplyCoupon}
                  disabled={isValidatingCoupon || !couponInput.trim()}
                >
                  {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            )}
          </div>

          {/* Bill Breakdown / Summary */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2.5 text-sm">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Course Base Price</span>
              <span className="font-medium text-foreground">₹{basePrice.toLocaleString()}</span>
            </div>

            {appliedCoupon && (
              <div className="flex justify-between items-center text-[#006837] dark:text-[#20B76A] font-medium">
                <span className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  Coupon Discount ({appliedCoupon.code})
                </span>
                <span>- ₹{discountAmount.toLocaleString()}</span>
              </div>
            )}

            {additionalFee > 0 && basePrice > 0 && (
              <div className="flex justify-between items-center text-muted-foreground">
                <span>{additionalFeeLabel}</span>
                <span className="font-medium text-foreground">+ ₹{additionalFee.toLocaleString()}</span>
              </div>
            )}

            <div className="pt-2 border-t border-border/60 flex justify-between items-baseline">
              <span className="font-bold text-base text-foreground">Total Payable Amount</span>
              <div className="flex items-baseline gap-1 text-right">
                <span className="text-2xl font-extrabold font-serif text-[#006837] dark:text-[#20B76A]">
                  ₹{finalTotal.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">INR</span>
              </div>
            </div>
          </div>

          {/* Mandatory Terms & Policy Checkbox */}
          <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/15 space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                className="mt-0.5 rounded-md data-[state=checked]:bg-[#006837] border-primary/40"
              />
              <label htmlFor="terms" className="text-xs text-foreground leading-relaxed cursor-pointer select-none">
                I have read and agree to the{" "}
                <a
                  href="https://optiontamiltrader.sbs/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline hover:text-[#F37021] inline-flex items-center gap-0.5"
                >
                  Terms of Service <ExternalLink className="h-2.5 w-2.5" />
                </a>
                ,{" "}
                <a
                  href="https://optiontamiltrader.sbs/refund-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline hover:text-[#F37021] inline-flex items-center gap-0.5"
                >
                  Refund Policy <ExternalLink className="h-2.5 w-2.5" />
                </a>
                , and{" "}
                <a
                  href="https://optiontamiltrader.sbs/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline hover:text-[#F37021] inline-flex items-center gap-0.5"
                >
                  Privacy Policy <ExternalLink className="h-2.5 w-2.5" />
                </a>
                .
              </label>
            </div>
          </div>

          {/* CTA Action Button */}
          <Button
            type="button"
            variant="secondary"
            className="w-full h-12 rounded-xl text-base font-bold shadow-xl shadow-orange-500/25 active:scale-[0.98] transition-all disabled:opacity-50"
            disabled={!acceptedTerms || isProcessingPayment}
            onClick={handleProceedToPayment}
          >
            {isProcessingPayment ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Connecting to Razorpay...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CreditCard className="h-5 w-5" />
                {finalTotal > 0 ? `Pay Now • ₹${finalTotal.toLocaleString()}` : "Complete Free Enrollment"}
              </span>
            )}
          </Button>

          {/* Secure Trust Note */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground text-center">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>256-bit Secure Razorpay Checkout (UPI, Cards, NetBanking)</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

