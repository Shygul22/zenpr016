import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { BookOpen, PlayCircle, Clock, ArrowLeft, Lock, XCircle, CreditCard, Sparkles, ShieldCheck, CheckCircle } from "lucide-react";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { CheckoutModal } from "@/components/CheckoutModal";

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, status } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

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
      // Use upsert to avoid 409 conflicts and allow re-requesting if previously rejected
      const { error } = await supabase.from("course_requests").upsert({
        user_id: user!.id,
        course_id: id!,
        status: "pending",
      }, { onConflict: 'user_id,course_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-request", id, user?.id] });
      toast.success("Access requested! Please wait for admin approval.");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("You have already requested access to this course.");
      } else {
        toast.error(error.message || "Failed to request access");
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

  const handlePurchaseCourse = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!course) return;

    if (!course.price || Number(course.price) <= 0) {
      await handleFreeEnrollment();
      return;
    }

    setIsProcessingPayment(true);
    try {
      await openRazorpayCheckout({
        amount: Math.round(Number(course.price) * 100), // in paise
        currency: "INR",
        name: "Option Tamil Trader",
        description: course.title,
        image: course.thumbnail_url || "/logo.jpeg",
        prefill: {
          name: user.name || "",
          email: user.email || "",
          contact: user.phone || "",
        },
        notes: {
          course_id: course.id,
          user_id: user.id,
        },
        handler: async (response) => {
          try {
            // 1. Record payment in Supabase
            const { error: paymentError } = await supabase.from("payments").insert({
              user_id: user.id,
              course_id: course.id,
              amount: Number(course.price),
              status: "completed",
              payment_method: `Razorpay (${response.razorpay_payment_id})`,
            });
            if (paymentError) console.error("Payment recording note:", paymentError);

            // 2. Automatically enroll student into course
            const { error: enrollError } = await supabase.from("enrollments").upsert(
              {
                user_id: user.id,
                course_id: course.id,
              },
              { onConflict: "user_id,course_id" }
            );

            if (enrollError) {
              console.error("Auto enrollment error:", enrollError);
              toast.error("Payment verified, but auto-enrollment had an issue. Please contact support.");
              return;
            }

            // 3. Invalidate caches so UI updates across all pages
            queryClient.invalidateQueries({ queryKey: ["enrollment", id, user?.id] });
            queryClient.invalidateQueries({ queryKey: ["user-payments", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["all-progress", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["my-courses-dashboard", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["admin-payments"] });

            toast.success(`🎉 Payment Successful! You now have full access to ${course.title}.`);

            // 4. Auto-launch first lesson
            if (lessons && lessons.length > 0) {
              navigate(`/courses/${course.id}/learn/${lessons[0].id}`);
            }
          } catch (err: any) {
            console.error("Post-payment processing failed:", err);
            toast.error("Error finalizing enrollment: " + (err.message || "Unknown error"));
          } finally {
            setIsProcessingPayment(false);
          }
        },
        onError: (err) => {
          setIsProcessingPayment(false);
          toast.error(err?.description || "Payment was cancelled or failed.");
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
          },
        },
      });
    } catch (err: any) {
      console.error("Razorpay initiation failed:", err);
      toast.error(err.message || "Failed to initiate payment. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  const handleFreeEnrollment = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!course) return;

    setIsProcessingPayment(true);
    try {
      const { error } = await supabase.from("enrollments").upsert(
        {
          user_id: user.id,
          course_id: course.id,
        },
        { onConflict: "user_id,course_id" }
      );

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["enrollment", id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-courses-dashboard", user?.id] });
      toast.success("Enrolled successfully in " + course.title);

      if (lessons && lessons.length > 0) {
        navigate(`/courses/${course.id}/learn/${lessons[0].id}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Enrollment failed");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleStartLearning = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!isAdmin && !enrollment) {
      toast.error("You are not enrolled in this course.");
      return;
    }

    if (lessons && lessons.length > 0) {
      navigate(`/courses/${id}/learn/${lessons[0].id}`);
    } else {
      toast.error("This course has no lessons yet.");
    }
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
        <div className="container py-10 text-center">
          <h1 className="text-2xl font-bold">Course not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="container py-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to courses
        </Link>

        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {(() => {
              const resolvedThumbnail = course.thumbnail_url
                ? course.thumbnail_url.replace(
                  "mfbyllgfcbihqxuukgcp.supabase.co",
                  "vowsjebbiusziwotxfhz.supabase.co"
                )
                : null;

              return (
                <div className="aspect-video overflow-hidden rounded-3xl border border-white/50 dark:border-white/10 shadow-lg relative bg-gradient-to-br from-[#006837]/10 via-muted/30 to-[#F37021]/10">
                  {/* Fallback branded banner rendered behind/if failed */}
                  {(!resolvedThumbnail || imageError || !imageLoaded) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#006837]/15 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#F37021]/15 rounded-full blur-3xl pointer-events-none" />
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="h-16 w-16 rounded-2xl bg-white shadow-xl ring-2 ring-primary/20 flex items-center justify-center overflow-hidden mb-4">
                          <img src="/logo.jpeg" alt="Option Tamil Trader" className="h-full w-full object-cover" />
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold font-serif text-foreground max-w-md">
                          {course.title}
                        </h2>
                        <span className="mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                          Option Tamil Trader
                        </span>
                      </div>
                    </div>
                  )}

                  {resolvedThumbnail && !imageError && (
                    <img
                      src={resolvedThumbnail}
                      alt=""
                      className={`relative z-10 h-full w-full object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"
                        }`}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageError(true)}
                    />
                  )}
                </div>
              );
            })()}
            <div>
              <h1 className="text-3xl font-bold font-serif tracking-tight mb-3">{course.title}</h1>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{course.description}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card rounded-3xl border border-white/50 dark:border-white/10 p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>{lessons?.length || 0} lessons</span>
                </div>
                {course.price && Number(course.price) > 0 ? (
                  <span className="glass-pill px-2.5 py-0.5 rounded-full text-xs font-bold text-[#F37021]">
                    Paid Course
                  </span>
                ) : (
                  <span className="glass-pill px-2.5 py-0.5 rounded-full text-xs font-bold text-primary">
                    Free Course
                  </span>
                )}
              </div>

              {/* Price Tag Display */}
              {(!enrollment && !isAdmin) && (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course Price</span>
                  {course.price && Number(course.price) > 0 ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold font-serif text-foreground">
                        ₹{Number(course.price).toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-[#F37021] uppercase">INR</span>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-primary font-serif">FREE</span>
                  )}
                </div>
              )}

              {enrollment && progressData && (
                <div className="space-y-2">
                  <Progress value={progressPercent} className="h-2 bg-muted/60" />
                  <p className="text-sm text-muted-foreground">
                    {progressData.completed}/{progressData.total} lessons completed
                  </p>
                </div>
              )}

              {/* 1. Enrolled users & admins: show Start / Continue Learning */}
              {isAdmin || enrollment ? (
                <Button
                  className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20"
                  size="lg"
                  onClick={handleStartLearning}
                  disabled={!lessons?.length}
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  {isAdmin ? "Preview Lessons" : (progressPercent > 0 ? "Continue Learning" : "Start Learning")}
                </Button>
              ) : user ? (
                /* 2. Logged-in students: Razorpay Instant Purchase or Free Enroll */
                Number(course.price) > 0 ? (
                  <Button
                    variant="secondary"
                    className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all"
                    size="lg"
                    onClick={() => setCheckoutOpen(true)}
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    {`Enroll Now • ₹${Number(course.price).toLocaleString()}`}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all"
                    size="lg"
                    onClick={handleFreeEnrollment}
                    disabled={isProcessingPayment}
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    {isProcessingPayment ? "Enrolling..." : "Enroll for Free"}
                  </Button>
                )
              ) : (
                /* 3. Guest / not logged in: prompt to login */
                <Button
                  variant="secondary"
                  className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-orange-500/20"
                  size="lg"
                  onClick={() => navigate("/login")}
                >
                  <Lock className="mr-2 h-5 w-5" />
                  Login to Enroll {course.price && Number(course.price) > 0 ? `• ₹${Number(course.price).toLocaleString()}` : ""}
                </Button>
              )}

              {/* Trust Badge */}
              {(!enrollment && !isAdmin) && (
                <div className="pt-3 border-t border-border/50 flex flex-col gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-primary font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Instant Automatic Access after payment</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-[#F37021]" />
                    <span>Razorpay Secure: UPI, Cards, NetBanking</span>
                  </div>
                </div>
              )}
            </div>


            {lessons && lessons.length > 0 && (
              <div className="glass-card rounded-3xl border border-white/50 dark:border-white/10 p-6 shadow-md">
                <h3 className="font-bold font-serif text-lg mb-3">Course Content</h3>
                <div className="space-y-2.5">
                  {lessons.map((lesson, idx) => (
                    <div key={lesson.id} className="flex items-center gap-3 text-sm py-2 px-3 rounded-xl hover:bg-primary/5 transition-colors">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <span className="truncate font-medium">{lesson.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {course && user && (
          <CheckoutModal
            isOpen={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            course={{
              id: course.id,
              title: course.title,
              price: Number(course.price || 0),
              thumbnail_url: course.thumbnail_url,
            }}
            user={{
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
            }}
            firstLessonId={lessons?.[0]?.id}
          />
        )}
      </main>
    </div>
  );
};

export default CourseDetail;
