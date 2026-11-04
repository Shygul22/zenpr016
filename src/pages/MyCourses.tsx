import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CourseCard } from "@/components/CourseCard";
import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const MyCourses = () => {
  const { user } = useAuth();

  const { data: enrolledCourses, isLoading } = useQuery({
    queryKey: ["my-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: enrollments, error } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      if (!enrollments.length) return [];

      const courseIds = enrollments.map((e) => e.course_id);
      const { data: courses } = await supabase
        .from("courses")
        .select("*")
        .in("id", courseIds);

      return courses || [];
    },
  });

  const { data: lessonCounts } = useQuery({
    queryKey: ["lesson-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("course_id");
      const counts: Record<string, number> = {};
      data?.forEach((l) => (counts[l.course_id] = (counts[l.course_id] || 0) + 1));
      return counts;
    },
  });

  const { data: progressMap } = useQuery({
    queryKey: ["all-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", user!.id);
      const { data: lessons } = await supabase.from("lessons").select("id, course_id");

      const lessonToCourse: Record<string, string> = {};
      lessons?.forEach((l) => (lessonToCourse[l.id] = l.course_id));

      const courseProgress: Record<string, { completed: number; total: number }> = {};
      lessons?.forEach((l) => {
        if (!courseProgress[l.course_id]) courseProgress[l.course_id] = { completed: 0, total: 0 };
        courseProgress[l.course_id].total++;
      });
      progress?.forEach((p) => {
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
      <main className="container py-10">
        <h1 className="text-3xl font-bold font-serif tracking-tight mb-8">My Courses</h1>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : !enrolledCourses?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-1">No courses yet</h2>
            <p className="text-muted-foreground mb-4">Enroll in a course to start learning</p>
            <Link to="/">
              <Button>Browse Courses</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                description={course.description}
                thumbnail_url={course.thumbnail_url}
                lessonCount={lessonCounts?.[course.id] || 0}
                progress={progressMap?.[course.id] ?? 0}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyCourses;
