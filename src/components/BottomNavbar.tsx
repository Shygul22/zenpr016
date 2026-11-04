import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, User, Receipt, Menu, Library, LayoutDashboard } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Button } from "./ui/button";

export const BottomNavbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (location.pathname.startsWith("/admin")) return null;

  const navItems = [
    { label: "Dash", icon: LayoutDashboard, href: "/dashboard", auth: true },
    { label: "My Learning", icon: Library, href: "/my-courses", auth: true },
    { label: "Explore", icon: BookOpen, href: "/" },
    { label: "Profile", icon: User, href: "/profile", auth: true },
  ];


  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-50">
      <nav className="glass-dock rounded-2xl flex items-center justify-around h-16 px-1.5 shadow-2xl border border-white/40 dark:border-white/10">
        {navItems.map((item) => {
          if (item.auth && !user) return null;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all duration-300",
                isActive 
                  ? "bg-primary/15 text-primary font-semibold shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-white/30 dark:hover:bg-white/5"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-primary animate-in zoom-in-75 duration-300")} />
              <span className="text-[10px] uppercase tracking-wider font-semibold">{item.label}</span>
            </Link>
          );
        })}

        {/* More Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/30 dark:hover:bg-white/5 transition-all duration-300">
              <Menu className="h-5 w-5" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[auto] max-h-[85vh] rounded-t-[28px] border-t border-white/30 dark:border-white/10 bg-card/90 backdrop-blur-2xl shadow-2xl">
            <SheetHeader>
              <SheetTitle className="text-left flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-6 w-6" />
                </div>
                <span className="bg-gradient-to-r from-primary to-[#F37021] bg-clip-text text-transparent font-serif">
                  Option Tamil Trader
                </span>
              </SheetTitle>
              <SheetDescription className="sr-only">
                Mobile navigation menu for courses, dashboard, and settings.
              </SheetDescription>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-3.5 mt-6 pb-6">
              <Link to="/dashboard" className="p-4 rounded-2xl glass-card flex flex-col items-center gap-2 hover:border-primary/40 transition-all">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">My Dashboard</span>
              </Link>
              <Link to="/" className="p-4 rounded-2xl glass-card flex flex-col items-center gap-2 hover:border-primary/40 transition-all">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">Explore Courses</span>
              </Link>
              {user && (
                <>
                  <Link to="/my-courses" className="p-4 rounded-2xl glass-card flex flex-col items-center gap-2 hover:border-primary/40 transition-all">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Library className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">My Courses</span>
                  </Link>
                  <Link to="/fees" className="p-4 rounded-2xl glass-card flex flex-col items-center gap-2 hover:border-[#F37021]/40 transition-all">
                    <div className="p-2 rounded-xl bg-[#F37021]/10 text-[#F37021]">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">My Fees</span>
                  </Link>
                  <Link to="/profile" className="p-4 rounded-2xl glass-card flex flex-col items-center gap-2 hover:border-primary/40 transition-all">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">Profile</span>
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="p-4 rounded-2xl glass-card flex flex-col items-center gap-2 hover:border-primary/40 transition-all">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Menu className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium">Admin Panel</span>
                    </Link>
                  )}
                  <button 
                    onClick={handleSignOut}
                    className="p-3.5 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center gap-2 hover:bg-destructive/20 transition-all col-span-2 mt-2 font-medium"
                  >
                    <span>Sign Out</span>
                  </button>
                </>
              )}
              {!user && (
                <>
                  <Link to="/login" className="p-4 rounded-2xl glass-card flex flex-col items-center gap-2 hover:border-primary/40 transition-all">
                    <span className="text-sm font-medium">Log In</span>
                  </Link>
                  <Link to="/signup" className="p-4 rounded-2xl bg-[#F37021] text-white flex flex-col items-center gap-2 shadow-lg shadow-orange-500/25 hover:bg-[#e05f12] transition-all">
                    <span className="text-sm font-semibold">Sign Up</span>
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
};
