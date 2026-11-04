import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
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
  Settings,
  Trash2,
  Edit3,
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

export const CATEGORY_OPTIONS: {
  value: PostCategory;
  label: string;
  icon: any;
  placeholder: string;
  defaultCta: string;
}[] = [
    {
      value: "announcement",
      label: "📢 Announcement",
      icon: Megaphone,
      placeholder: "https://optiontamiltrader.sbs/notice",
      defaultCta: "Read Announcement",
    },
    {
      value: "free_indicator",
      label: "📈 Free Indicator Link",
      icon: TrendingUp,
      placeholder: "https://in.tradingview.com/script/...",
      defaultCta: "Get Free Indicator",
    },
    {
      value: "ticket",
      label: "🎟️ Event / Ticket Link",
      icon: Ticket,
      placeholder: "https://events.optiontamiltrader.sbs/ticket",
      defaultCta: "Get Tickets",
    },
    {
      value: "google_form",
      label: "📝 Google Form",
      icon: FileText,
      placeholder: "https://forms.gle/...",
      defaultCta: "Fill Google Form",
    },
    {
      value: "youtube",
      label: "🎥 YouTube Video / Live",
      icon: Youtube,
      placeholder: "https://youtube.com/watch?v=...",
      defaultCta: "Watch on YouTube",
    },
    {
      value: "telegram",
      label: "✈️ Telegram Channel Link",
      icon: Send,
      placeholder: "https://t.me/optiontamiltrader",
      defaultCta: "Join Telegram Channel",
    },
  ];

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
  const queryClient = useQueryClient();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Direct modal controls for Admin
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("telegram");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("Join Telegram Channel");
  const [imageUrl, setImageUrl] = useState("");
  const [badgeText, setBadgeText] = useState("Active Community");
  const [active, setActive] = useState(true);
  const [pinned, setPinned] = useState(false);

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
        console.warn("Notice: posts table query:", error.message);
        return [];
      }

      return (data || []) as PostItem[];
    },
  });

  const openCreateDialog = () => {
    setEditingPost(null);
    setTitle("");
    setContent("");
    setCategory("telegram");
    setLinkUrl("https://t.me/optiontamiltrader");
    setLinkText("Join Telegram Channel");
    setImageUrl("");
    setBadgeText("Active Community");
    setActive(true);
    setPinned(false);
    setDialogOpen(true);
  };

  const openEditDialog = (post: PostItem) => {
    setEditingPost(post);
    setTitle(post.title || "");
    setContent(post.content || "");
    setCategory(post.category);
    setLinkUrl(post.link_url || "");
    setLinkText(post.link_text || "");
    setImageUrl(post.image_url || "");
    setBadgeText(post.badge_text || "");
    setActive(post.active !== false);
    setPinned(!!post.pinned);
    setDialogOpen(true);
  };

  const handleCategoryChange = (val: PostCategory) => {
    setCategory(val);
    const selected = CATEGORY_OPTIONS.find((c) => c.value === val);
    if (selected) {
      setLinkText(selected.defaultCta);
      if (!linkUrl || linkUrl.startsWith("https://")) {
        setLinkUrl(selected.placeholder);
      }
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) {
        throw new Error("Title is required");
      }

      const payload = {
        title: title.trim(),
        content: content.trim() || null,
        category,
        link_url: linkUrl.trim() || null,
        link_text: linkText.trim() || null,
        image_url: imageUrl.trim() || null,
        badge_text: badgeText.trim() || null,
        active,
        pinned,
      };

      if (editingPost) {
        const { error } = await supabase
          .from("posts")
          .update(payload)
          .eq("id", editingPost.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success(editingPost ? "Post updated successfully!" : "Post published to Home Screen!");
      setDialogOpen(false);
    },
    onError: (err: any) => {
      if (err.message?.includes("does not exist") || err.code === "42P01") {
        toast.error("Please run the Supabase SQL script in your Supabase Dashboard to create the 'posts' table first!");
      } else {
        toast.error(err.message || "Failed to save post");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success("Post deleted from carousel");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete post");
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
  if (!posts || posts.length === 0) {
    if (!isAdmin) return null;

    return (
      <section className="mb-14">
        <div className="glass-card rounded-3xl border border-dashed border-primary/40 p-8 text-center bg-primary/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#006837]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <Megaphone className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="font-bold text-lg font-serif">Home Posts Carousel (Admin Notice)</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
              No active posts found in the database. Click below to publish your first announcement, indicator link, Google form, or Telegram/YouTube link!
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button
                onClick={openCreateDialog}
                className="bg-[#006837] hover:bg-[#00522c] text-white rounded-xl gap-2 shadow-md h-10 px-5"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Create First Post</span>
              </Button>
              <Link to="/admin/posts">
                <Button variant="outline" className="rounded-xl gap-2 h-10 px-4">
                  <Settings className="h-4 w-4" />
                  <span>Admin Panel</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Dialog Component rendered when modal opens */}
        <PostDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingPost={editingPost}
          title={title}
          setTitle={setTitle}
          content={content}
          setContent={setContent}
          category={category}
          handleCategoryChange={handleCategoryChange}
          linkUrl={linkUrl}
          setLinkUrl={setLinkUrl}
          linkText={linkText}
          setLinkText={setLinkText}
          badgeText={badgeText}
          setBadgeText={setBadgeText}
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
          pinned={pinned}
          setPinned={setPinned}
          active={active}
          setActive={setActive}
          onSave={() => saveMutation.mutate()}
          isSaving={saveMutation.isPending}
        />
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
            <div className="flex items-center gap-1.5">
              <Button
                onClick={openCreateDialog}
                size="sm"
                className="bg-[#006837] hover:bg-[#00522c] text-white text-xs gap-1.5 h-8 rounded-full shadow-sm"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Add Post</span>
              </Button>
              <Link to="/admin/posts">
                <Button variant="outline" size="sm" className="text-xs gap-1 h-8 rounded-full border-border/60">
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Manage</span>
                </Button>
              </Link>
            </div>
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

                      <div className="flex items-center gap-1">
                        {post.pinned && (
                          <div
                            title="Pinned"
                            className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary"
                          >
                            <Pin className="h-3.5 w-3.5 rotate-45" />
                          </div>
                        )}

                        {/* Direct admin quick edit & delete buttons */}
                        {isAdmin && (
                          <div className="flex items-center gap-1 ml-1">
                            <button
                              onClick={() => openEditDialog(post)}
                              title="Edit Post"
                              className="h-6 w-6 rounded-full bg-muted/60 hover:bg-primary/20 hover:text-primary flex items-center justify-center text-muted-foreground transition-colors"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete post "${post.title}"?`)) {
                                  deleteMutation.mutate(post.id);
                                }
                              }}
                              title="Delete Post"
                              className="h-6 w-6 rounded-full bg-muted/60 hover:bg-destructive/20 hover:text-destructive flex items-center justify-center text-muted-foreground transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
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

      {/* Post Modal for Admin */}
      <PostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingPost={editingPost}
        title={title}
        setTitle={setTitle}
        content={content}
        setContent={setContent}
        category={category}
        handleCategoryChange={handleCategoryChange}
        linkUrl={linkUrl}
        setLinkUrl={setLinkUrl}
        linkText={linkText}
        setLinkText={setLinkText}
        badgeText={badgeText}
        setBadgeText={setBadgeText}
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        pinned={pinned}
        setPinned={setPinned}
        active={active}
        setActive={setActive}
        onSave={() => saveMutation.mutate()}
        isSaving={saveMutation.isPending}
      />
    </section>
  );
};

// Reusable Post Creation & Editing Modal
interface PostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPost: PostItem | null;
  title: string;
  setTitle: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  category: PostCategory;
  handleCategoryChange: (v: PostCategory) => void;
  linkUrl: string;
  setLinkUrl: (v: string) => void;
  linkText: string;
  setLinkText: (v: string) => void;
  badgeText: string;
  setBadgeText: (v: string) => void;
  imageUrl: string;
  setImageUrl: (v: string) => void;
  pinned: boolean;
  setPinned: (v: boolean) => void;
  active: boolean;
  setActive: (v: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
}

const PostDialog = ({
  open,
  onOpenChange,
  editingPost,
  title,
  setTitle,
  content,
  setContent,
  category,
  handleCategoryChange,
  linkUrl,
  setLinkUrl,
  linkText,
  setLinkText,
  badgeText,
  setBadgeText,
  imageUrl,
  setImageUrl,
  pinned,
  setPinned,
  active,
  setActive,
  onSave,
  isSaving,
}: PostDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-serif">
            {editingPost ? "Edit Post" : "Create New Post"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Publish announcements, TradingView indicators, Google forms, ticket links, or Telegram/YouTube links directly to the Home Screen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Category Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Post Category</Label>
            <Select value={category} onValueChange={(val) => handleCategoryChange(val as PostCategory)}>
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="py-2.5">
                    <div className="flex items-center gap-2">
                      <opt.icon className="h-4 w-4 text-primary" />
                      <span>{opt.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Post Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Free Scalping Strategy Indicator v2.0"
              className="rounded-xl h-10"
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description / Details</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe the update, indicator details, or announcement..."
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>

          {/* Link URL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Destination URL / Link</Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder={
                CATEGORY_OPTIONS.find((c) => c.value === category)?.placeholder || "https://..."
              }
              className="rounded-xl h-10"
            />
          </div>

          {/* Link Button CTA & Highlight Badge */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Button CTA Text</Label>
              <Input
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="e.g. Open Link / Join"
                className="rounded-xl h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Highlight Badge (Optional)</Label>
              <Input
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="e.g. FREE, HOT, LIVE"
                className="rounded-xl h-10"
              />
            </div>
          </div>

          {/* Banner Image URL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Banner Image URL (Optional)</Label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... image URL (optional)"
              className="rounded-xl h-10"
            />
          </div>

          {/* Switches for Pinned & Active */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/50">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold">Pin to Front of Carousel</div>
              <div className="text-xs text-muted-foreground">
                Pinned posts appear at the very start of the swipeable carousel.
              </div>
            </div>
            <Switch checked={pinned} onCheckedChange={setPinned} />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/50">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold">Publish & Make Active</div>
              <div className="text-xs text-muted-foreground">
                Visible immediately to students and visitors on the Home Screen.
              </div>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="bg-[#006837] hover:bg-[#00522c] text-white rounded-xl shadow-md"
          >
            {isSaving ? "Saving..." : editingPost ? "Save Changes" : "Publish Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
