import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, ArrowLeft, GripVertical } from "lucide-react";

const AdminLessons = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", video_url: "", order: 0 });

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("lessons").update({
          title: form.title,
          video_url: form.video_url,
          order: form.order,
        }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const nextOrder = (lessons?.length || 0) + 1;
        const { error } = await supabase.from("lessons").insert({
          course_id: courseId!,
          title: form.title,
          video_url: form.video_url,
          order: form.order || nextOrder,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lessons", courseId] });
      toast.success(editing ? "Lesson updated" : "Lesson added");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
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
    setForm({ title: "", video_url: "", order: (lessons?.length || 0) + 1 });
    setEditing(null);
  };

  const openEdit = (lesson: any) => {
    setEditing(lesson);
    setForm({ title: lesson.title, video_url: lesson.video_url, order: lesson.order });
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setForm({ title: "", video_url: "", order: (lessons?.length || 0) + 1 });
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-10">
        <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to courses
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold font-serif tracking-tight">Lessons</h1>
            {course && <p className="text-muted-foreground mt-1">{course.title}</p>}
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add Lesson</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
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
                {lessons?.map((lesson) => (
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
