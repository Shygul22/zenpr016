import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type CourseCardProps = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  lessonCount: number;
  price?: number;
  progress?: number; // 0-100
};

export const CourseCard = ({ id, title, description, thumbnail_url, lessonCount, price, progress }: CourseCardProps) => {
  const [imageError, setImageError] = useState(false);

  return (
    <Link to={`/courses/${id}`} className="block group">
      <div className="glass-card glass-card-hover rounded-2xl overflow-hidden border border-border/60 hover:border-primary/50 relative flex flex-col h-full">
        {/* Subtle top shimmer highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent z-10" />

        <div className="aspect-video overflow-hidden bg-muted relative">
          {thumbnail_url && !imageError ? (
            <img
              src={thumbnail_url}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-[#F37021]/10">
              <BookOpen className="h-12 w-12 text-primary/40" />
            </div>
          )}

          {/* Floating Glass Pill for Lesson Count */}
          <div className="absolute top-3 right-3 glass-pill px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs font-semibold text-foreground shadow-sm">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span>{lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}</span>
          </div>

          {/* Floating Price Pill */}
          {price !== undefined && (
            <div className="absolute bottom-3 left-3 glass-pill px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm">
              {price > 0 ? (
                <span className="text-foreground">₹{price.toLocaleString()}</span>
              ) : (
                <span className="text-primary">FREE</span>
              )}
            </div>
          )}
        </div>

        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors duration-200">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {description}
            </p>
          </div>

          {progress !== undefined && (
            <div className="w-full space-y-1.5 pt-2 border-t border-border/40">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Progress</span>
                <span className="font-semibold text-[#F37021]">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-muted/60" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};
