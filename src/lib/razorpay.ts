import { toast } from "sonner";

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayOptions {
  key?: string;
  amount: number; // in paise (e.g. ₹500 = 50000)
  currency?: string;
  name?: string;
  description?: string;
  image?: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler?: (response: RazorpayResponse) => void;
  onError?: (error: any) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Dynamically loads the Razorpay checkout script
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Initiates Razorpay checkout
 */
export const openRazorpayCheckout = async (options: RazorpayOptions): Promise<void> => {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    throw new Error("Razorpay SDK failed to load. Please check your internet connection.");
  }

  const razorpayKey =
    options.key ||
    import.meta.env.VITE_RAZORPAY_KEY_ID ||
    "rzp_live_Tw5PL37EvvumV3";

  const rzpOptions = {
    key: razorpayKey,
    amount: options.amount,
    currency: options.currency || "INR",
    name: options.name || "Option Tamil Trader",
    description: options.description || "Course Enrollment",
    image: options.image || "/logo.jpeg",
    prefill: {
      name: options.prefill?.name || "",
      email: options.prefill?.email || "",
      contact: options.prefill?.contact || "",
    },
    notes: options.notes || {},
    theme: {
      color: options.theme?.color || "#006837", // Forest Green brand color
    },
    handler: options.handler,
    modal: {
      ondismiss: options.modal?.ondismiss,
    },
  };

  const razorpayInstance = new window.Razorpay(rzpOptions);

  razorpayInstance.on("payment.failed", function (response: any) {
    console.warn("Razorpay Payment Failed:", response.error);
    const reason = response.error?.description || "Payment was cancelled or failed.";
    if (options.onError) {
      options.onError(response.error);
    } else {
      toast.error(reason);
    }
  });

  razorpayInstance.open();
};
