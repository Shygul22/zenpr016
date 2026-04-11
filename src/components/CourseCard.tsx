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
  progress?: number; // 0-100
};

export const CourseCard = ({ id, title, description, thumbnail_url, lessonCount, progress }: CourseCardProps) => {
  const [imageError, setImageError] = useState(false);

  return (
    <Link to={`/courses/${id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
        <div className="aspect-video overflow-hidden bg-muted">
          {thumbnail_url && !imageError ? (
            <img
              src={thumbnail_url}
              alt={title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <CardContent className="p-5">
          <h3 className="font-semibold text-lg leading-snug line-clamp-2 mb-1.5">{title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        </CardContent>
        <CardFooter className="px-5 pb-5 pt-0 flex flex-col items-start gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}</span>
          </div>
          {progress !== undefined && (
            <div className="w-full space-y-1">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
};
