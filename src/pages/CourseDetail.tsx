import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { BookOpen, PlayCircle, Clock, ArrowLeft } from "lucide-react";

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons } = useQuery({
    queryKey: ["lessons", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", id!)
        .order("order");
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: request } = useQuery({
    queryKey: ["course-request", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("course_requests")
        .select("*")
        .eq("course_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: progressData } = useQuery({
    queryKey: ["course-progress", id, user?.id],
    enabled: !!user && !!enrollment,
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", user!.id);
      const lessonIds = lessons?.map((l) => l.id) || [];
      const completed = data?.filter((p) => p.completed && lessonIds.includes(p.lesson_id)).length || 0;
      return { completed, total: lessonIds.length };
    },
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("course_requests").insert({
        user_id: user!.id,
        course_id: id!,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-request", id] });
      toast.success("Access requested! Please wait for admin approval.");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("You have already requested access to this course.");
      } else {
        toast.error("Failed to request access");
      }
    },
  });

  const handleRequestAccess = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    requestMutation.mutate();
  };

  const firstIncompleteLesson = (() => {
    if (!lessons || !progressData) return lessons?.[0];
    // Find first lesson not completed
    const completedIds = new Set<string>();
    // We need to re-fetch progress per lesson
    return lessons[0]; // fallback
  })();

  const progressPercent = progressData && progressData.total > 0
    ? (progressData.completed / progressData.total) * 100
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-muted rounded" />
            <div className="h-4 w-96 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-10 text-center">
          <h1 className="text-2xl font-bold">Course not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to courses
        </Link>

        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {course.thumbnail_url && (
              <div className="aspect-video overflow-hidden rounded-xl bg-muted">
                <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold font-serif tracking-tight mb-3">{course.title}</h1>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{course.description}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6 space-y-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>{lessons?.length || 0} lessons</span>
              </div>

              {enrollment && progressData && (
                <div className="space-y-2">
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    {progressData.completed}/{progressData.total} lessons completed
                  </p>
                </div>
              )}

              {enrollment ? (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => navigate(`/courses/${id}/learn/${lessons?.[0]?.id}`)}
                  disabled={!lessons?.length}
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  {progressPercent > 0 ? "Continue Learning" : "Start Learning"}
                </Button>
              ) : request ? (
                <Button className="w-full" size="lg" disabled variant="secondary">
                  Access Requested
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleRequestAccess} 
                  disabled={requestMutation.isPending}
                >
                  {requestMutation.isPending ? "Requesting..." : "Request Access"}
                </Button>
              )}
            </div>

            {lessons && lessons.length > 0 && (
              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold mb-3">Course Content</h3>
                <div className="space-y-2">
                  {lessons.map((lesson, idx) => (
                    <div key={lesson.id} className="flex items-center gap-3 text-sm py-1.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {idx + 1}
                      </span>
                      <span className="truncate">{lesson.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CourseDetail;
