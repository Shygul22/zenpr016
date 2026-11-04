import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-6 text-center">
      <div className="rounded-full bg-red-100 p-6 mb-6">
        <WifiOff className="h-12 w-12 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold font-serif mb-2 text-foreground">No Internet Connection</h1>
      <p className="text-muted-foreground max-w-sm mb-8">
        Please check your network settings and reconnect to continue using the application.
      </p>
      <div className="flex gap-2">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="h-2 w-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="h-2 w-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
};
