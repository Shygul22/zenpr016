import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { VideoEmbed } from "@/components/VideoEmbed";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { CheckCircle2, Circle, ArrowLeft, ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const LessonPlayer = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons } = useQuery({
    queryKey: ["lessons", courseId],
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

  const currentLesson = lessons?.find((l) => l.id === lessonId);
  const currentIndex = lessons?.findIndex((l) => l.id === lessonId) ?? -1;
  const nextLesson = lessons?.[currentIndex + 1];

  const { data: progress } = useQuery({
    queryKey: ["lesson-progress", courseId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const lessonIds = lessons?.map((l) => l.id) || [];
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", user!.id);
      const completedSet = new Set(data?.filter((p) => p.completed).map((p) => p.lesson_id));
      return completedSet;
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lesson_progress").upsert(
        {
          user_id: user!.id,
          lesson_id: lessonId!,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-progress"] });
      queryClient.invalidateQueries({ queryKey: ["course-progress"] });
      queryClient.invalidateQueries({ queryKey: ["all-progress"] });
      toast.success("Lesson completed!");
      if (nextLesson) {
        navigate(`/courses/${courseId}/learn/${nextLesson.id}`);
      }
    },
  });

  const isCompleted = progress?.has(lessonId!);

  if (!currentLesson) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Lesson not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <Link to={`/courses/${courseId}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="hidden sm:block">
            <p className="text-sm font-medium truncate max-w-xs">{course?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isCompleted && (
            <Button size="sm" onClick={() => markCompleteMutation.mutate()} disabled={markCompleteMutation.isPending}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Mark Complete
            </Button>
          )}
          {nextLesson && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/courses/${courseId}/learn/${nextLesson.id}`)}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-4xl space-y-4">
            <VideoEmbed url={currentLesson.video_url} />
            <h1 className="text-2xl font-bold font-serif">{currentLesson.title}</h1>
          </div>
        </div>

        {/* Sidebar playlist */}
        <div className="hidden md:flex w-80 flex-col border-l bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Lessons</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {lessons?.map((lesson, idx) => {
                const done = progress?.has(lesson.id);
                const active = lesson.id === lessonId;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => navigate(`/courses/${courseId}/learn/${lesson.id}`)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{idx + 1}. {lesson.title}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default LessonPlayer;
