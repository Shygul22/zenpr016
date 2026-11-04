import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CourseChat } from "@/components/CourseChat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Layout, ChevronRight, User, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const AdminSupport = () => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["admin-chat-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description")
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="flex h-screen flex-col bg-background">
      <main className="flex-1 container py-8 overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-serif tracking-tight">Support Center</h1>
            <p className="text-sm text-muted-foreground">Manage student conversations across all courses</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100%-80px)]">
          {/* Course List */}
          <div className="md:col-span-4 lg:col-span-3 h-full">
            <Card className="h-full border-none shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-muted/50 border-b">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Select a Course
                </h3>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {coursesLoading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-12 w-full animate-pulse bg-muted rounded-lg" />)
                  ) : (
                    courses?.map((course) => (
                      <button
                        key={course.id}
                        onClick={() => setSelectedCourseId(course.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl text-left transition-all group",
                          selectedCourseId === course.id
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "hover:bg-muted"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold line-clamp-1">{course.title}</span>
                          <span className={cn(
                            "text-[10px] uppercase tracking-wider font-bold",
                            selectedCourseId === course.id ? "text-primary-foreground/70" : "text-muted-foreground/60"
                          )}>
                            Course ID: {course.id.slice(0, 8)}
                          </span>
                        </div>
                        <ChevronRight className={cn(
                          "h-4 w-4 transition-transform",
                          selectedCourseId === course.id ? "rotate-90" : "group-hover:translate-x-1"
                        )} />
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Chat Window */}
          <div className="md:col-span-8 lg:col-span-9 h-full">
            {selectedCourseId ? (
              <Card className="h-full border-none shadow-sm overflow-hidden bg-background flex flex-col">
                <div className="p-4 border-b flex items-center justify-between bg-card text-foreground">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Layout className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">
                      {courses?.find(c => c.id === selectedCourseId)?.title}
                    </h3>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <CourseChat courseId={selectedCourseId} />
                </div>
              </Card>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-background/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-muted">
                <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                  <MessageSquare className="h-10 w-10 text-primary/30" />
                </div>
                <h3 className="text-xl font-bold mb-2">No Course Selected</h3>
                <p className="text-muted-foreground max-w-xs mx-auto text-sm">
                  Choose a course from the list on the left to view and manage its chat messages.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminSupport;
