import { useEffect, useState } from "react";

export const Preloader = () => {
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Artificial delay to ensure a smooth transition
    const timer = setTimeout(() => {
      setLoading(false);
      // Wait for fade animation to complete before removing from DOM
      const hideTimer = setTimeout(() => setIsVisible(false), 800);
      return () => clearTimeout(hideTimer);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-all duration-700 ease-in-out ${
        loading ? "opacity-100" : "opacity-0 pointer-events-none scale-110"
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Animated Orbs for a premium glass feel */}
        <div className="absolute -z-10 h-36 w-36 animate-[ping_3s_infinite] rounded-full bg-[#006837]/20 blur-2xl" />
        <div className="absolute -z-10 h-52 w-52 animate-[pulse_4s_infinite] rounded-full bg-[#F37021]/15 blur-3xl" />
        
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-2xl ring-2 ring-primary/30 animate-[bounce_2s_infinite] overflow-hidden">
          <img
            src="/logo.jpeg"
            alt="Option Tamil Trader Logo"
            className="h-full w-full object-cover rounded-2xl"
          />
        </div>
        
        <h1 className="text-4xl font-bold font-serif tracking-tight text-foreground text-center">
          Option Tamil Trader
        </h1>
        
        <div className="mt-8 flex items-center gap-2">
          <div className="h-1.5 w-1.5 animate-[bounce_1s_infinite] rounded-full bg-primary" />
          <div className="h-1.5 w-1.5 animate-[bounce_1s_infinite_100ms] rounded-full bg-[#F37021]" />
          <div className="h-1.5 w-1.5 animate-[bounce_1s_infinite_200ms] rounded-full bg-primary" />
        </div>
        
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
          Starting your journey
        </p>
      </div>
    </div>
  );
};
