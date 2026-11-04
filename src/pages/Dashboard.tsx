import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GamificationCard } from "@/components/GamificationCard";
import { CourseCard } from "@/components/CourseCard";
import { BookOpen, LayoutDashboard, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { user } = useAuth();

  const { data: gamificationData } = useQuery({
    queryKey: ["gamification", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: progress, error } = await supabase
        .from("lesson_progress")
        .select("completed, completed_at")
        .eq("user_id", user!.id)
        .eq("completed", true);
      
      if (error) throw error;

      // XP: 100 per completed lesson
      const xp = (progress?.length || 0) * 100;

      // Streak calculation
      let streak = 0;
      if (progress && progress.length > 0) {
        const dates = progress
          .map(p => p.completed_at ? new Date(p.completed_at).toDateString() : null)
          .filter(Boolean) as string[];
        
        const uniqueDates = Array.from(new Set(dates)).map(d => new Date(d));
        uniqueDates.sort((a, b) => b.getTime() - a.getTime());

        const today = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (uniqueDates.length > 0) {
          const latestDateStr = uniqueDates[0].toDateString();
          if (latestDateStr === today || latestDateStr === yesterdayStr) {
            streak = 1;
            for (let i = 0; i < uniqueDates.length - 1; i++) {
              const current = uniqueDates[i];
              const next = uniqueDates[i + 1];
              const diffTime = Math.abs(current.getTime() - next.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays === 1) {
                streak++;
              } else {
                break;
              }
            }
          }
        }
      }

      return {
        xp,
        streak,
        completedLessons: progress?.length || 0
      };
    },
  });

  const { data: enrolledCourses, isLoading } = useQuery({
    queryKey: ["my-courses-dashboard", user?.id],
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
    <div className="min-h-screen pb-20 md:pb-0">
      <main className="container py-10">
        <div className="flex items-center gap-3 mb-8">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold font-serif tracking-tight">My Dashboard</h1>
        </div>

        {gamificationData && (
          <GamificationCard 
            xp={gamificationData.xp} 
            streak={gamificationData.streak} 
            completedLessons={gamificationData.completedLessons}
            className="mb-12"
          />
        )}

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold font-serif">Continue Learning</h2>
            </div>
            <Link to="/my-courses">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map((i) => (
                <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl glass-card bg-muted/40" />
              ))}
            </div>
          ) : !enrolledCourses?.length ? (
            <div className="glass-card rounded-3xl flex flex-col items-center justify-center py-14 px-6 border border-white/40 dark:border-white/10 text-center shadow-lg">
              <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-4">
                <BookOpen className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold font-serif mb-1">No active courses</h3>
              <p className="text-muted-foreground mb-6 max-w-sm text-sm">You haven't enrolled in any courses yet. Start your journey today!</p>
              <Link to="/">
                <Button variant="secondary" className="shadow-lg shadow-orange-500/20 font-semibold px-6">Explore Courses</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {enrolledCourses.slice(0, 3).map((course) => (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  description={course.description}
                  thumbnail_url={course.thumbnail_url}
                  lessonCount={lessonCounts?.[course.id] || 0}
                  price={course.price}
                  progress={progressMap?.[course.id] ?? 0}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
