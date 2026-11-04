export const Footer = () => {
  return (
    <footer className="w-full border-t border-border/40 bg-background/60 backdrop-blur-xl py-10 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative group">
            <img
              src="/logo.jpeg"
              alt="Option Tamil Trader Logo"
              className="h-12 w-12 rounded-2xl object-cover shadow-md ring-1 ring-primary/20 group-hover:ring-primary/50 transition-all duration-300"
            />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#F37021]"></span>
            </span>
          </div>
          <p className="text-sm font-bold tracking-tight font-serif bg-gradient-to-r from-primary via-primary to-[#F37021] bg-clip-text text-transparent">
            Option Tamil Trader
          </p>
          <p className="text-xs font-medium text-muted-foreground tracking-wide">
            © 2026 <span className="text-foreground font-semibold">Option Tamil Trader & ZenJourney Infotech</span> — All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
