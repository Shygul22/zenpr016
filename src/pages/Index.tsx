import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CourseCard } from "@/components/CourseCard";
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
      <main className="container py-8 md:py-12">
        {/* Modern Glass Hero Banner */}
        <div className="relative glass-card border border-white/50 dark:border-white/10 rounded-3xl p-8 md:p-12 mb-12 shadow-xl overflow-hidden">
          {/* Subtle ambient glow spots inside card */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#006837]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-[#F37021]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 glass-pill px-3 py-1.5 rounded-full text-xs font-semibold text-foreground border border-white/40 dark:border-white/10 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-[#F37021]" />
              <span className="text-[#006837] dark:text-[#20B76A] font-bold">Premium Trading Education</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold font-serif tracking-tight leading-tight">
              Master Option Trading with{" "}
              <span className="bg-gradient-to-r from-[#006837] to-[#F37021] bg-clip-text text-transparent">
                Confidence
              </span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Learn practical option strategies, risk management, and market psychology tailored for Tamil traders.
            </p>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <span className="glass-pill text-xs px-3 py-1 rounded-full text-muted-foreground border border-white/30 dark:border-white/5">
                ⚡ Real Market Case Studies
              </span>
              <span className="glass-pill text-xs px-3 py-1 rounded-full text-muted-foreground border border-white/30 dark:border-white/5">
                📈 Practical Tamil Lessons
              </span>
              <span className="glass-pill text-xs px-3 py-1 rounded-full text-muted-foreground border border-white/30 dark:border-white/5">
                🛡️ Capital Protection Frameworks
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold font-serif tracking-tight">Available Courses</h2>
            <p className="text-sm text-muted-foreground mt-1">Explore our expert-curated modules</p>
          </div>
          {courses && courses.length > 0 && (
            <span className="glass-pill px-3 py-1 rounded-full text-xs font-semibold text-primary">
              {courses.length} {courses.length === 1 ? "Course" : "Courses"} Available
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl glass-card bg-muted/40" />
            ))}
          </div>
        ) : courses?.length === 0 ? (
          <div className="glass-card rounded-3xl flex flex-col items-center justify-center py-20 px-4 text-center border border-white/30 dark:border-white/5">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-4">
              <BookOpen className="h-12 w-12" />
            </div>
            <h2 className="text-xl font-semibold mb-1">No courses yet</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              We are finalizing exciting curriculum updates. Please check back shortly!
            </p>
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
                price={course.price}
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
