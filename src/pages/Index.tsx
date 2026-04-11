import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CourseCard } from "@/components/CourseCard";
import { Navbar } from "@/components/Navbar";
import { BookOpen } from "lucide-react";

const Index = () => {
  const { user } = useAuth();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: lessonCounts } = useQuery({
    queryKey: ["lesson-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("course_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((l) => {
        counts[l.course_id] = (counts[l.course_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((e) => e.course_id);
    },
  });

  const { data: progressMap } = useQuery({
    queryKey: ["all-progress", user?.id],
    enabled: !!user && !!enrollments?.length,
    queryFn: async () => {
      const { data: progress, error } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", user!.id);
      if (error) throw error;

      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, course_id");

      const lessonToCourse: Record<string, string> = {};
      lessons?.forEach((l) => (lessonToCourse[l.id] = l.course_id));

      const courseProgress: Record<string, { completed: number; total: number }> = {};
      lessons?.forEach((l) => {
        if (!courseProgress[l.course_id]) courseProgress[l.course_id] = { completed: 0, total: 0 };
        courseProgress[l.course_id].total++;
      });
      progress.forEach((p) => {
        const cid = lessonToCourse[p.lesson_id];
        if (cid && p.completed && courseProgress[cid]) courseProgress[cid].completed++;
      });

      const result: Record<string, number> = {};
      Object.entries(courseProgress).forEach(([cid, { completed, total }]) => {
        result[cid] = total > 0 ? (completed / total) * 100 : 0;
      });
      return result;
    },
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold font-serif tracking-tight mb-2">Explore Courses</h1>
          <p className="text-lg text-muted-foreground">Learn at your own pace with our curated courses</p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : courses?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-1">No courses yet</h2>
            <p className="text-muted-foreground">Check back soon for new content!</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses?.map((course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                description={course.description}
                thumbnail_url={course.thumbnail_url}
                lessonCount={lessonCounts?.[course.id] || 0}
                progress={enrollments?.includes(course.id) ? progressMap?.[course.id] : undefined}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
