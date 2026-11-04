import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

interface MainLayoutProps {
  children: React.ReactNode;
  showNavbar?: boolean;
  showFooter?: boolean;
}

export const MainLayout = ({ 
  children, 
  showNavbar = true, 
  showFooter = true 
}: MainLayoutProps) => {
  return (
    <div className="relative flex flex-col min-h-screen overflow-x-hidden">
      {/* Ambient glass background glow elements */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#006837]/10 dark:bg-[#006837]/15 blur-[120px] transition-all" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-[#F37021]/10 dark:bg-[#F37021]/10 blur-[140px] transition-all" />
        <div className="absolute -bottom-32 left-1/4 w-[30rem] h-[30rem] rounded-full bg-[#006837]/5 dark:bg-[#006837]/10 blur-[150px] transition-all" />
      </div>

      {showNavbar && <Navbar />}
      <div className="flex-grow">
        {children}
      </div>
      {showFooter && <Footer />}
    </div>
  );
};
