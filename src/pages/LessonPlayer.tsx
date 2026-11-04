import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { VideoEmbed } from "@/components/VideoEmbed";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { CheckCircle2, Circle, ArrowLeft, ChevronRight, BookOpen, ShieldAlert, List, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { CourseChat } from "@/components/CourseChat";

const LessonPlayer = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isFocused, setIsFocused] = useState(true);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => prev - 1);
      }, 1000);
    } else if (lockoutTimer === 0 && securityAlert) {
      setSecurityAlert(null);
      setIsFocused(true);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lockoutTimer, securityAlert]);

  useEffect(() => {
    const handleFocus = () => {
      if (lockoutTimer === 0) setIsFocused(true);
    };
    const handleBlur = () => setIsFocused(false);
    
    const handleSecurityThreat = (message: string) => {
      setSecurityAlert(message);
      setIsFocused(false);
      setLockoutTimer(5);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        handleSecurityThreat("Screenshot attempt detected. Your activity is being logged for security.");
        e.preventDefault();
        return false;
      }
      if (e.altKey && e.key === 'r') {
         handleSecurityThreat("Screen recording shortcut detected.");
      }
    };

    const handleResize = () => {
      if (isFocused && (window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160)) {
        handleSecurityThreat("System inspection detected. Video hidden for privacy.");
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsFocused(false);
      } else if (lockoutTimer === 0 && !securityAlert) {
        setIsFocused(true);
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isFocused, securityAlert, lockoutTimer]);

  const { data: course, isLoading: isCourseLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollment, isLoading: isEnrollmentLoading } = useQuery({
    queryKey: ["enrollment", courseId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", courseId!)
        .eq("user_id", user!.id)
        .maybeSingle();
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
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", user!.id);
      return new Set(data?.filter((p) => p.completed).map((p) => p.lesson_id));
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

  const LessonList = () => (
    <div className="p-2 space-y-1">
      {lessons?.map((lesson, idx) => {
        const done = progress?.has(lesson.id);
        const active = lesson.id === lessonId;
        return (
          <button
            key={lesson.id}
            onClick={() => {
              navigate(`/courses/${courseId}/learn/${lesson.id}`);
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-all duration-200",
              active 
                ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20" 
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            ) : (
              <Circle className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate flex-1">{idx + 1}. {lesson.title}</span>
          </button>
        );
      })}
    </div>
  );

  if (!currentLesson) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Lesson not found
      </div>
    );
  }

  if (!isCourseLoading && !isEnrollmentLoading && !enrollment && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-center p-4">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You are not enrolled in this course.</p>
        <Button onClick={() => navigate(`/courses/${courseId}`)}>Return to Course</Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col relative overflow-hidden bg-background">
      {/* Security Overlay */}
      {(!isFocused || securityAlert) && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md text-white p-6 text-center">
          <ShieldAlert className="h-20 w-20 text-primary mb-6 animate-pulse" />
          <h2 className="text-3xl font-bold mb-4 tracking-tight">Security Protection Active</h2>
          <p className="max-w-md text-lg text-muted-foreground italic mb-8">
            {securityAlert || "Playback is paused because your browser window lost focus."}
          </p>
          {lockoutTimer > 0 && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex items-center justify-center">
                 <div className="h-24 w-24 rounded-full border-4 border-primary/20 animate-[spin_5s_linear_infinite]" />
                 <span className="absolute text-5xl font-mono font-bold text-primary">{lockoutTimer}</span>
              </div>
              <p className="text-sm font-medium text-primary uppercase tracking-[0.2em]">Lockout Active</p>
            </div>
          )}
          {lockoutTimer === 0 && (
            <p className="text-sm text-muted-foreground animate-bounce">Click back on the window to continue learning</p>
          )}
        </div>
      )}

      <div className={cn("flex flex-col h-full transition-all duration-500", (!isFocused || securityAlert) && "blur-2xl scale-105 grayscale pointer-events-none")}>
        {/* Top bar */}
        <div className="flex h-16 items-center justify-between border-b px-4 shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <Link to={`/courses/${courseId}`} className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Link>
            <div className="max-w-[150px] md:max-w-xs">
              <p className="text-sm font-bold truncate">{course?.title}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Lesson {currentIndex + 1} of {lessons?.length}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isCompleted && (
              <Button size="sm" className="hidden sm:flex" onClick={() => markCompleteMutation.mutate()} disabled={markCompleteMutation.isPending}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Complete
              </Button>
            )}
            {nextLesson && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/courses/${courseId}/learn/${nextLesson.id}`)}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden bg-muted/20">
          <div className="flex-1 overflow-auto p-4 md:p-8 lg:p-12">
            <div className="mx-auto max-w-5xl space-y-6">
              <VideoEmbed url={currentLesson.video_url} thumbnailUrl={course?.thumbnail_url} />
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h1 className="text-2xl md:text-3xl font-bold font-serif tracking-tight">{currentLesson.title}</h1>

                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                   <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {course?.title}</span>
                </div>
                {currentLesson.description && (
                  <div className="mt-6 p-6 rounded-xl border bg-card/50 backdrop-blur-sm shadow-sm space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary/70">Lesson Overview</h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{currentLesson.description}</p>
                  </div>
                )}
              </div>
              {!isCompleted && (
                <Button className="w-full sm:hidden" onClick={() => markCompleteMutation.mutate()} disabled={markCompleteMutation.isPending}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Complete
                </Button>
              )}
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden md:flex w-80 lg:w-96 flex-col border-l bg-card shadow-sm overflow-hidden">
            <Tabs defaultValue="lessons" className="flex flex-col h-full">
              <div className="px-4 py-2 border-b bg-muted/30">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="lessons" className="text-xs font-bold uppercase tracking-wider">
                    <List className="h-3.5 w-3.5 mr-2" /> Lessons
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="text-xs font-bold uppercase tracking-wider">
                    <MessageSquare className="h-3.5 w-3.5 mr-2" /> Chat
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="lessons" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-2 pt-4">
                    <div className="flex items-center gap-2 px-3 mb-4">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Course Content</span>
                    </div>
                    <LessonList />
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
                <CourseChat courseId={courseId!} />
              </TabsContent>
              
              <div className="p-4 border-t bg-muted/10 text-center shrink-0">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Zenjourney Study Platform</p>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet>
        <div className="fixed bottom-24 right-6 z-50 md:hidden">
          <SheetTrigger asChild>
            <Button size="icon" className="h-14 w-14 rounded-full shadow-2xl animate-bounce">
              <List className="h-6 w-6" />
            </Button>
          </SheetTrigger>
        </div>
        <SheetContent side="right" className="w-[90%] p-0">
          <Tabs defaultValue="lessons" className="flex flex-col h-full">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="text-left font-serif mb-2">Study Center</SheetTitle>
              <SheetDescription className="sr-only">
                Access course lessons and chat with fellow students in the Study Center.
              </SheetDescription>
              <TabsList className="grid w-full grid-cols-2">

                <TabsTrigger value="lessons">Lessons</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
              </TabsList>
            </SheetHeader>

            <TabsContent value="lessons" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full"><LessonList /></ScrollArea>
            </TabsContent>
            <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
              <CourseChat courseId={courseId!} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default LessonPlayer;
