import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Menu, Receipt, Settings, User, LayoutDashboard, BookOpen } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BottomNavbar } from "./BottomNavbar";



export const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-[0_4px_24px_-4px_rgba(0,104,55,0.06)]">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <img
                  src="/logo.jpeg"
                  alt="Option Tamil Trader"
                  className="h-10 w-10 rounded-xl object-cover shadow-sm ring-1 ring-primary/20 group-hover:ring-primary/50 transition-all duration-300"
                />
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F37021] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#F37021]"></span>
                </span>
              </div>
              <span className="text-xl font-bold tracking-tight font-serif bg-gradient-to-r from-primary via-primary to-[#F37021] bg-clip-text text-transparent">
                Option Tamil Trader
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-1.5">
              <Link
                to="/"
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200"
              >
                Courses
              </Link>
              {user && (
                <>
                  <Link
                    to="/dashboard"
                    className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/my-courses"
                    className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200"
                  >
                    My Courses
                  </Link>
                </>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full ring-1 ring-border/50 hover:ring-primary/40 bg-card/50 backdrop-blur-md">
                    <User className="h-5 w-5 text-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-2xl border-border/60 bg-card/90 backdrop-blur-xl shadow-xl p-1.5">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground truncate uppercase tracking-wider">
                    {user.email}
                  </div>
                  <DropdownMenuSeparator className="bg-border/60" />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="rounded-lg cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
                    My Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-lg cursor-pointer">
                    <User className="mr-2 h-4 w-4 text-primary" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/fees")} className="rounded-lg cursor-pointer">
                    <Receipt className="mr-2 h-4 w-4 text-primary" />
                    My Fees
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/my-courses")} className="rounded-lg cursor-pointer">
                    <BookOpen className="mr-2 h-4 w-4 text-primary" />
                    My Courses
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")} className="rounded-lg cursor-pointer">
                      <Settings className="mr-2 h-4 w-4 text-primary" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-border/60" />
                  <DropdownMenuItem onClick={handleSignOut} className="rounded-lg cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2.5">
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="hover:bg-primary/10">
                  Log In
                </Button>
                <Button size="sm" variant="secondary" onClick={() => navigate("/signup")} className="shadow-md shadow-orange-500/20 font-semibold">
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      <BottomNavbar />
    </>
  );
};
