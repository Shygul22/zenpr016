import { Trophy, Zap, Award, Flame, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface GamificationCardProps {
  xp: number;
  streak: number;
  completedLessons: number;
  className?: string;
}

export const GamificationCard = ({ xp, streak, completedLessons, className }: GamificationCardProps) => {
  const level = Math.floor(xp / 500) + 1;
  const currentLevelXp = xp % 500;
  const progressToNextLevel = (currentLevelXp / 500) * 100;

  const achievements = [
    { id: "learner", label: "Early Learner", icon: Star, unlocked: completedLessons >= 1, color: "text-amber-500" },
    { id: "dedicated", label: "Dedicated", icon: Flame, unlocked: streak >= 3, color: "text-[#F37021]" },
    { id: "master", label: "Course Master", icon: Trophy, unlocked: completedLessons >= 10, color: "text-primary" },
    { id: "expert", label: "Trading Expert", icon: Award, unlocked: completedLessons >= 20, color: "text-purple-500" },
  ];

  return (
    <div className={cn("relative overflow-hidden group rounded-3xl", className)}>
      {/* Background Orbs */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#006837]/15 rounded-full blur-3xl group-hover:bg-[#006837]/25 transition-colors duration-500" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#F37021]/15 rounded-full blur-3xl group-hover:bg-[#F37021]/25 transition-colors duration-500" />

      <div className="relative glass-card border border-white/40 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          
          {/* Level and XP Section */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <Zap className="h-6 w-6 fill-primary" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Level</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight">Level {level}</span>
                  <span className="text-sm font-medium text-[#F37021]">{xp} Total XP</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Progress to Level {level + 1}</span>
                <span className="text-primary font-semibold">{Math.round(currentLevelXp)} / 500 XP</span>
              </div>
              <Progress value={progressToNextLevel} className="h-2.5 bg-muted/60" />
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="hidden md:block w-px h-20 bg-border/60" />

          {/* Stats Section */}
          <div className="flex items-center gap-8 px-2">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#F37021]/15 text-[#F37021] border border-[#F37021]/20 shadow-sm mb-1">
                <Flame className={cn("h-6 w-6", streak > 0 && "fill-[#F37021] animate-pulse")} />
              </div>
              <span className="text-2xl font-bold text-foreground">{streak}</span>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Day Streak</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm mb-1">
                <Trophy className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-foreground">{completedLessons}</span>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Completed</span>
            </div>
          </div>

          {/* Achievements Section */}
          <div className="flex flex-col gap-3 min-w-[180px]">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">Achievements</h4>
            <div className="flex gap-2">
              {achievements.map((badge) => (
                <div 
                  key={badge.id}
                  className={cn(
                    "flex items-center justify-center w-11 h-11 rounded-2xl border transition-all duration-300",
                    badge.unlocked 
                      ? cn("glass-card shadow-sm border-white/60 dark:border-white/10", badge.color) 
                      : "bg-muted/40 border-transparent grayscale opacity-30"
                  )}
                  title={badge.label}
                >
                  <badge.icon className="h-5 w-5" />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
