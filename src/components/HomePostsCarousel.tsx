import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
  TrendingUp,
  Ticket,
  FileText,
  Youtube,
  Send,
  ExternalLink,
  Sparkles,
  Pin,
  Flame,
  PlusCircle,
} from "lucide-react";

export type PostCategory =
  | "announcement"
  | "free_indicator"
  | "ticket"
  | "google_form"
  | "youtube"
  | "telegram";

export interface PostItem {
  id: string;
  title: string;
  content?: string | null;
  category: PostCategory;
  link_url?: string | null;
  link_text?: string | null;
  image_url?: string | null;
  badge_text?: string | null;
  active?: boolean;
  pinned?: boolean;
  order_index?: number;
  created_at?: string;
}

export const getCategoryConfig = (category: PostCategory) => {
  switch (category) {
    case "free_indicator":
      return {
        label: "Free Indicator",
        icon: TrendingUp,
        badgeBg: "bg-[#F37021]/15 text-[#F37021] border-[#F37021]/30",
        btnColor: "bg-[#F37021] hover:bg-[#d95d13] text-white",
        gradient: "from-[#F37021]/15 via-transparent to-transparent",
        accent: "#F37021",
      };
    case "telegram":
      return {
        label: "Telegram Channel",
        icon: Send,
        badgeBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
        btnColor: "bg-sky-600 hover:bg-sky-700 text-white",
        gradient: "from-sky-500/15 via-transparent to-transparent",
        accent: "#0284c7",
      };
    case "youtube":
      return {
        label: "YouTube Video",
        icon: Youtube,
        badgeBg: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
        btnColor: "bg-red-600 hover:bg-red-700 text-white",
        gradient: "from-red-500/15 via-transparent to-transparent",
        accent: "#dc2626",
      };
    case "ticket":
      return {
        label: "Webinar / Ticket",
        icon: Ticket,
        badgeBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
        btnColor: "bg-purple-600 hover:bg-purple-700 text-white",
        gradient: "from-purple-500/15 via-transparent to-transparent",
        accent: "#9333ea",
      };
    case "google_form":
      return {
        label: "Google Form",
        icon: FileText,
        badgeBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
        gradient: "from-emerald-500/15 via-transparent to-transparent",
        accent: "#059669",
      };
    case "announcement":
    default:
      return {
        label: "Announcement",
        icon: Megaphone,
        badgeBg: "bg-[#006837]/15 text-[#006837] dark:text-[#20B76A] border-[#006837]/30",
        btnColor: "bg-[#006837] hover:bg-[#00522c] text-white",
        gradient: "from-[#006837]/15 via-transparent to-transparent",
        accent: "#006837",
      };
  }
};

export const HomePostsCarousel = () => {
  const { isAdmin } = useAuth();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // 100% Dynamic: Fetches purely from Supabase posts table
  const { data: posts, isLoading } = useQuery<PostItem[]>({
    queryKey: ["home-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("active", true)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading posts from database:", error);
        return [];
      }

      return (data || []) as PostItem[];
    },
  });

  // If loading, render elegant shimmer skeleton
  if (isLoading) {
    return (
      <section className="mb-14">
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted animate-pulse rounded-lg" />
            <div className="h-4 w-72 bg-muted/60 animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-3xl glass-card bg-muted/30 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  // If no posts in database:
  // If user is Admin, show prompt to add posts. If visitor, hide section cleanly.
  if (!posts || posts.length === 0) {
    if (!isAdmin) return null;

    return (
      <section className="mb-14">
        <div className="glass-card rounded-3xl border border-dashed border-primary/40 p-8 text-center bg-primary/5">
          <Megaphone className="h-10 w-10 text-primary mx-auto mb-3" />
          <h3 className="font-bold text-lg font-serif">Home Posts Carousel (Admin Notice)</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
            No active posts found in the database. When you create announcements, free indicator links, or community posts, they will swipe here.
          </p>
          <Link to="/admin/posts">
            <Button className="bg-[#006837] hover:bg-[#00522c] text-white rounded-xl gap-2 shadow-md">
              <PlusCircle className="h-4 w-4" />
              <span>Create First Post</span>
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-14">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#F37021] animate-pulse" />
            <h2 className="text-xl md:text-2xl font-bold font-serif tracking-tight text-foreground">
              Updates & Free Resources
            </h2>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Swipe left/right to explore announcements, TradingView indicators, and community updates
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/admin/posts">
              <Button variant="ghost" size="sm" className="text-xs text-primary gap-1 h-8 rounded-full">
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Manage Posts</span>
              </Button>
            </Link>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/40 px-3 py-1 rounded-full border border-border/40">
            <Sparkles className="h-3.5 w-3.5 text-[#F37021]" />
            <span>{posts.length} {posts.length === 1 ? "Post" : "Posts"}</span>
          </div>
        </div>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: posts.length > 2,
        }}
        className="w-full relative"
      >
        <CarouselContent className="-ml-3 md:-ml-4">
          {posts.map((post) => {
            const config = getCategoryConfig(post.category);
            const Icon = config.icon;
            const hasCustomImage = post.image_url && !imageErrors[post.id];

            return (
              <CarouselItem
                key={post.id}
                className="pl-3 md:pl-4 basis-full sm:basis-[85%] md:basis-[48%] lg:basis-[33.33%]"
              >
                <div className="glass-card glass-card-hover rounded-3xl border border-white/60 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-[360px] overflow-hidden relative group">
                  {/* Category Ambient Gradient Header */}
                  <div
                    className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${config.gradient} pointer-events-none`}
                  />

                  {/* Top Header Row with Badges */}
                  <div className="p-5 pb-3 relative z-10">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border shadow-sm ${config.badgeBg}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{config.label}</span>
                        </span>

                        {post.badge_text && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#006837]/10 text-[#006837] dark:text-[#20B76A] border border-[#006837]/20">
                            <Flame className="h-3 w-3 text-[#F37021]" />
                            {post.badge_text}
                          </span>
                        )}
                      </div>

                      {post.pinned && (
                        <div
                          title="Pinned"
                          className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary"
                        >
                          <Pin className="h-3.5 w-3.5 rotate-45" />
                        </div>
                      )}
                    </div>

                    {/* Banner Image (if provided) */}
                    {hasCustomImage && (
                      <div className="w-full h-24 rounded-2xl overflow-hidden mb-3 border border-border/50 shadow-inner bg-muted">
                        <img
                          src={post.image_url!}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={() =>
                            setImageErrors((prev) => ({ ...prev, [post.id]: true }))
                          }
                        />
                      </div>
                    )}

                    <h3 className="font-bold text-base md:text-lg font-serif tracking-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>

                    {post.content && (
                      <p className="text-xs md:text-sm text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                        {post.content}
                      </p>
                    )}
                  </div>

                  {/* Bottom Action Section */}
                  <div className="p-5 pt-0 relative z-10">
                    <div className="pt-3 border-t border-border/40">
                      {post.link_url ? (
                        <a
                          href={post.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full block"
                        >
                          <Button
                            className={`w-full rounded-xl font-medium shadow-md flex items-center justify-center gap-2 text-xs md:text-sm h-10 ${config.btnColor} transition-transform duration-200 active:scale-95`}
                          >
                            <span>{post.link_text || "Open Link"}</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      ) : (
                        <Button
                          variant="outline"
                          disabled
                          className="w-full rounded-xl text-xs h-10"
                        >
                          Announcement Only
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {posts.length > 1 && (
          <div className="hidden sm:block">
            <CarouselPrevious className="-left-4 bg-background/80 backdrop-blur-md border-border/60 hover:bg-primary hover:text-white transition-colors" />
            <CarouselNext className="-right-4 bg-background/80 backdrop-blur-md border-border/60 hover:bg-primary hover:text-white transition-colors" />
          </div>
        )}
      </Carousel>
    </section>
  );
};
