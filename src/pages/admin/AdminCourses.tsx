import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Layers, ArrowLeft, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const AdminCourses = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", thumbnail_url: "", published: false, price: 0 });
  const [isUploading, setIsUploading] = useState(false);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("courses").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success(editing ? "Course updated" : "Course created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Course deleted");
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Limit to 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-thumbnails')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-thumbnails')
        .getPublicUrl(filePath);

      setForm({ ...form, thumbnail_url: publicUrl });
      toast.success("Thumbnail uploaded");
    } catch (error: any) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setForm({ title: "", description: "", thumbnail_url: "", published: false, price: 0 });
    setEditing(null);
  };

  const openEdit = (course: any) => {
    setEditing(course);
    setForm({
      title: course.title,
      description: course.description,
      thumbnail_url: course.thumbnail_url,
      published: course.published,
      price: course.price || 0,
    });
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-10">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold font-serif tracking-tight">Courses</h1>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Course</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Course" : "New Course"}</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
              >
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Course Price (₹)</Label>
                  <Input 
                    type="number" 
                    value={form.price} 
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} 
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
                </div>
                <div className="space-y-3">
                  <Label>Course Thumbnail</Label>
                  <div className="flex flex-col gap-4">
                    {form.thumbnail_url && (
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                        <img 
                          src={form.thumbnail_url} 
                          alt="Thumbnail preview" 
                          className="h-full w-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-80 hover:opacity-100"
                          onClick={() => setForm({ ...form, thumbnail_url: "" })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                          className="hidden"
                          id="thumbnail-upload"
                        />
                        <Label
                          htmlFor="thumbnail-upload"
                          className={`flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/5 transition-colors hover:bg-muted/10 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          {isUploading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <Upload className="mb-1 h-5 w-5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Click to upload image</span>
                            </>
                          )}
                        </Label>
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Or paste URL</p>
                        <Input 
                          value={form.thumbnail_url} 
                          onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} 
                          placeholder="https://..."
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.published} onCheckedChange={(c) => setForm({ ...form, published: c })} />
                  <Label>Published</Label>
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save Course"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded" />)}
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses?.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium underline underline-offset-4 decoration-muted hover:decoration-primary transition-colors">
                      <Link to={`/admin/courses/${course.id}`}>{course.title}</Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={course.published ? "default" : "secondary"}>
                        {course.published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/courses/${course.id}/lessons`)}>
                          <Layers className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(course)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(course.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {courses?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No courses yet. Create your first one!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminCourses;
