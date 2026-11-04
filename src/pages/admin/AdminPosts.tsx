import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Megaphone,
  TrendingUp,
  Ticket,
  FileText,
  Youtube,
  Send,
  Pin,
  Flame,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PostCategory, PostItem, getCategoryConfig } from "@/components/HomePostsCarousel";

const CATEGORY_OPTIONS: { value: PostCategory; label: string; icon: any; placeholder: string; defaultCta: string }[] = [
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

export const AdminPosts = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("announcement");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [badgeText, setBadgeText] = useState("");
  const [active, setActive] = useState(true);
  const [pinned, setPinned] = useState(false);

  const { data: posts, isLoading } = useQuery<PostItem[]>({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PostItem[];
    },
  });

  const openCreateDialog = () => {
    setEditingPost(null);
    setTitle("");
    setContent("");
    setCategory("announcement");
    setLinkUrl("");
    setLinkText("Learn More");
    setImageUrl("");
    setBadgeText("");
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
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["home-posts"] });
      toast.success(editingPost ? "Post updated successfully!" : "Post published successfully!");
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save post");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: boolean }) => {
      const { error } = await supabase
        .from("posts")
        .update({ active: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["home-posts"] });
      toast.success("Post status updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["home-posts"] });
      toast.success("Post deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete post");
    },
  });

  const handleCategoryChange = (val: PostCategory) => {
    setCategory(val);
    const selected = CATEGORY_OPTIONS.find((c) => c.value === val);
    if (selected && (!linkText || linkText === "Learn More")) {
      setLinkText(selected.defaultCta);
    }
  };

  return (
    <div className="min-h-screen">
      <main className="container py-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-[#F37021]" />
              <h1 className="text-3xl font-bold font-serif tracking-tight">Manage Home Posts</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Create swipeable announcements, free indicator links, ticket links, Google Forms, and YouTube/Telegram updates.
            </p>
          </div>

          <Button
            onClick={openCreateDialog}
            className="bg-[#006837] hover:bg-[#00522c] text-white shadow-md flex items-center gap-2 rounded-xl h-11 px-5"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Post</span>
          </Button>
        </div>

        {/* Posts Table */}
        <div className="glass-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading posts...</div>
          ) : !posts || posts.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Megaphone className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h3 className="font-semibold text-lg">No posts published yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                No posts found in the database. Click "Create New Post" above to publish your first announcement, indicator link, form, or channel link!
              </p>
              <Button onClick={openCreateDialog} variant="outline" className="rounded-xl mt-2">
                Create First Post
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Category</TableHead>
                    <TableHead>Post Title & Details</TableHead>
                    <TableHead>Link Target</TableHead>
                    <TableHead className="w-[100px] text-center">Pinned</TableHead>
                    <TableHead className="w-[100px] text-center">Active</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => {
                    const config = getCategoryConfig(post.category);
                    const Icon = config.icon;

                    return (
                      <TableRow key={post.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="flex flex-col gap-1.5 items-start">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border shadow-sm ${config.badgeBg}`}
                            >
                              <Icon className="h-3 w-3" />
                              <span>{config.label}</span>
                            </span>

                            {post.badge_text && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                <Flame className="h-2.5 w-2.5 text-[#F37021]" />
                                {post.badge_text}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="max-w-md space-y-1">
                            <div className="font-semibold text-sm line-clamp-1">{post.title}</div>
                            {post.content && (
                              <div className="text-xs text-muted-foreground line-clamp-2">
                                {post.content}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          {post.link_url ? (
                            <a
                              href={post.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline max-w-[200px] truncate"
                            >
                              <span>{post.link_text || "Visit Link"}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No link</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {post.pinned ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                              <Pin className="h-3.5 w-3.5 rotate-45" /> Yes
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          <Switch
                            checked={post.active !== false}
                            onCheckedChange={(checked) =>
                              toggleActiveMutation.mutate({ id: post.id, newStatus: checked })
                            }
                          />
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(post)}
                              className="h-8 w-8 rounded-lg hover:bg-muted"
                            >
                              <Edit2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${post.title}"?`)) {
                                  deleteMutation.mutate(post.id);
                                }
                              }}
                              className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-serif">
                {editingPost ? "Edit Post" : "Create New Post"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set up announcements, indicators, forms, ticket links, or Telegram/YouTube links.
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

              {/* Link Button CTA */}
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
                  placeholder="https://images.unsplash.com/... or uploaded image URL"
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
                onClick={() => setDialogOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-[#006837] hover:bg-[#00522c] text-white rounded-xl shadow-md"
              >
                {saveMutation.isPending ? "Saving..." : editingPost ? "Save Changes" : "Publish Post"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminPosts;

