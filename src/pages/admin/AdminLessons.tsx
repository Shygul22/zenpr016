import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Plus, Pencil, Trash2, ArrowLeft, Search, XCircle, Eye } from "lucide-react";

const AdminLessons = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", video_url: "", description: "", order: 0 });

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["admin-lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId!)
        .order("order");
      if (error) throw error;
      return data;
    },
  });

  const filteredLessons = lessons?.filter((l) => 
    l.title.toLowerCase().includes(search.toLowerCase())
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log("saveMutation execution started. Form state:", form);
        
        // Ensure form values are clean and sanitized
        const payload: any = {
          title: form.title?.trim() || "",
          video_url: form.video_url?.trim() || "",
          description: form.description || "",
          order: typeof form.order === "number" ? form.order : parseInt(form.order as any) || 0,
        };

        if (editing) {
          console.log(`Updating lesson (ID: ${editing.id}) with payload:`, payload);
          const { data, error } = await supabase
            .from("lessons")
            .update(payload)
            .eq("id", editing.id)
            .select();
            
          console.log("Supabase update response:", { data, error });
          if (error) throw error;
          return data;
        } else {
          const nextOrder = (lessons?.length || 0) + 1;
          const insertPayload = {
            course_id: courseId!,
            ...payload,
            order: payload.order || nextOrder,
          };
          console.log("Inserting new lesson with payload:", insertPayload);
          const { data, error } = await supabase
            .from("lessons")
            .insert(insertPayload)
            .select();

          console.log("Supabase insert response:", { data, error });
          if (error) throw error;
          return data;
        }
      } catch (err) {
        console.error("Critical error in saveMutation mutationFn:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log("saveMutation onSuccess callback. Result data:", data);
      queryClient.invalidateQueries({ queryKey: ["admin-lessons", courseId] });
      toast.success(editing ? "Lesson updated" : "Lesson added");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => {
      console.error("saveMutation onError callback. Error details:", e);
      toast.error(e.message || "Failed to save lesson");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lessons", courseId] });
      toast.success("Lesson deleted");
    },
  });

  const resetForm = () => {
    setForm({ title: "", video_url: "", description: "", order: (lessons?.length || 0) + 1 });
    setEditing(null);
  };

  const openEdit = (lesson: any) => {
    console.log("Opening edit dialog for lesson:", lesson);
    setEditing(lesson);
    setForm({
      title: lesson.title || "",
      video_url: lesson.video_url || "",
      description: lesson.description || "",
      order: lesson.order || 0,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    console.log("Opening new lesson dialog.");
    resetForm();
    setForm({
      title: "",
      video_url: "",
      description: "",
      order: (lessons?.length || 0) + 1,
    });
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen">
      <main className="container py-10">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to courses
          </Link>
          <span className="text-muted-foreground">·</span>
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Eye className="h-4 w-4" /> Preview Course
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold font-serif tracking-tight">Lessons</h1>
            {course && <p className="text-muted-foreground mt-1">{course.title}</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search lessons..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {search && (
                <button 
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add Lesson</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
                  <DialogDescription>
                    {editing ? "Update the lesson title, video URL, and display order." : "Fill in the details below to add a new lesson to this course."}
                  </DialogDescription>
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
                    <Label>Video URL (YouTube, Vimeo, or Drive)</Label>
                    <Input 
                      value={form.video_url} 
                      onChange={(e) => setForm({ ...form, video_url: e.target.value })} 
                      required 
                      placeholder="e.g. https://drive.google.com/file/d/..." 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      value={form.description} 
                      onChange={(e) => setForm({ ...form, description: e.target.value })} 
                      placeholder="Provide details about what's covered in this lesson..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Order</Label>
                    <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} />
                  </div>
                  <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : "Save Lesson"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded" />)}
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Video URL</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLessons?.map((lesson) => (
                  <TableRow key={lesson.id}>
                    <TableCell className="text-muted-foreground">{lesson.order}</TableCell>
                    <TableCell className="font-medium">{lesson.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{lesson.video_url}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(lesson)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(lesson.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {lessons?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No lessons yet. Add your first one!
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

export default AdminLessons;
