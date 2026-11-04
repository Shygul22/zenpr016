import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Gauge,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const getEmbedUrl = (url: string): string | null => {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  // Google Drive
  const gdMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdMatch) return `https://drive.google.com/file/d/${gdMatch[1]}/preview`;

  return null;
};

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  }
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
};

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
    Vimeo: any;
  }
}

export const VideoEmbed = ({ url, thumbnailUrl }: { url: string; thumbnailUrl?: string }) => {
  const { user } = useAuth();
  const rawEmbedUrl = getEmbedUrl(url);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  // Playback Progress & Duration States
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Seek bar interaction states
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  // Resume playback state
  const [resumeTime, setResumeTime] = useState<number | null>(null);

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const vimeoPlayerRef = useRef<any>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const iframeId = useRef(`player-${Math.random().toString(36).substr(2, 9)}`);

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isVimeo = url.includes("vimeo.com");
  const isDrive = url.includes("drive.google.com");

  // Initialize YouTube or Vimeo Player API
  useEffect(() => {
    setIsPlayerReady(false);
    setIsPlaying(false);
    setIsMuted(true);
    setResumeTime(null);
    setCurrentTime(0);
    setDuration(0);

    if (isYouTube) {
      if (!window.YT) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const initYTPlayer = () => {
        if (playerRef.current) playerRef.current.destroy();
        playerRef.current = new window.YT.Player(iframeId.current, {
          events: {
            onReady: (event: any) => {
              setIsPlayerReady(true);
              const dur = event.target.getDuration();
              if (dur && dur > 0) setDuration(dur);
            },
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                const dur = playerRef.current?.getDuration();
                if (dur && dur > 0) setDuration(dur);
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              } else if (event.data === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
              }
            },
          },
        });
      };

      if (window.YT && window.YT.Player) initYTPlayer();
      else window.onYouTubeIframeAPIReady = initYTPlayer;
    }

    if (isVimeo) {
      if (!window.Vimeo) {
        const tag = document.createElement("script");
        tag.src = "https://player.vimeo.com/api/player.js";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const initVimeoPlayer = () => {
        const iframe = document.getElementById(iframeId.current) as HTMLIFrameElement;
        if (!iframe) return;
        vimeoPlayerRef.current = new window.Vimeo.Player(iframe);
        vimeoPlayerRef.current.on("play", () => setIsPlaying(true));
        vimeoPlayerRef.current.on("pause", () => setIsPlaying(false));
        vimeoPlayerRef.current.on("ended", () => setIsPlaying(false));
        vimeoPlayerRef.current.ready().then(() => {
          setIsPlayerReady(true);
          vimeoPlayerRef.current.getDuration().then((d: number) => setDuration(d));
        });
      };

      if (window.Vimeo) initVimeoPlayer();
      else {
        const checkVimeo = setInterval(() => {
          if (window.Vimeo) {
            initVimeoPlayer();
            clearInterval(checkVimeo);
          }
        }, 100);
      }
    }

    if (isDrive) {
      setTimeout(() => setIsPlayerReady(true), 1500);
    }

    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullScreenChange);

    return () => {
      if (playerRef.current?.destroy) playerRef.current.destroy();
      if (vimeoPlayerRef.current?.destroy) vimeoPlayerRef.current.destroy();
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
    };
  }, [url]);

  // Real-time playback timestamp tracking loop (250ms)
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlayerReady) {
      interval = setInterval(() => {
        if (isYouTube && playerRef.current) {
          if (typeof playerRef.current.getCurrentTime === "function") {
            const time = playerRef.current.getCurrentTime() || 0;
            if (!isScrubbing) {
              setCurrentTime(time);
            }
            if (time > 2) {
              localStorage.setItem(`resume_${url}`, time.toString());
            }
          }
          if (typeof playerRef.current.getDuration === "function") {
            const dur = playerRef.current.getDuration() || 0;
            if (dur > 0 && dur !== duration) {
              setDuration(dur);
            }
          }
        } else if (isVimeo && vimeoPlayerRef.current) {
          vimeoPlayerRef.current.getCurrentTime().then((time: number) => {
            if (!isScrubbing) {
              setCurrentTime(time || 0);
            }
            if (time > 2) {
              localStorage.setItem(`resume_${url}`, time.toString());
            }
          });
          vimeoPlayerRef.current.getDuration().then((dur: number) => {
            if (dur > 0 && dur !== duration) {
              setDuration(dur);
            }
          });
        }
      }, 250);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayerReady, isYouTube, isVimeo, isScrubbing, duration, url]);

  // Check for saved timestamp to prompt resume
  useEffect(() => {
    if (isPlayerReady) {
      const savedTime = localStorage.getItem(`resume_${url}`);
      if (savedTime) {
        const parsedTime = parseFloat(savedTime);
        if (parsedTime > 5) {
          setResumeTime(parsedTime);
        }
      }
    } else {
      setResumeTime(null);
    }
  }, [isPlayerReady, url]);

  if (!rawEmbedUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-muted-foreground">
        Invalid video URL
      </div>
    );
  }

  const togglePlayback = () => {
    if (isYouTube && playerRef.current && isPlayerReady) {
      if (typeof playerRef.current.playVideo !== "function") return;
      isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
    } else if (isVimeo && vimeoPlayerRef.current && isPlayerReady) {
      isPlaying ? vimeoPlayerRef.current.pause() : vimeoPlayerRef.current.play();
    }
  };

  const seekToTime = useCallback(
    (targetTime: number) => {
      const clampedTime = Math.max(0, Math.min(targetTime, duration || 0));
      setCurrentTime(clampedTime);

      if (isYouTube && playerRef.current) {
        if (typeof playerRef.current.seekTo === "function") {
          playerRef.current.seekTo(clampedTime, true);
        }
      } else if (isVimeo && vimeoPlayerRef.current) {
        vimeoPlayerRef.current.setCurrentTime(clampedTime);
      }
    },
    [duration, isYouTube, isVimeo]
  );

  const seekBackward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPlayerReady) return;
    seekToTime(currentTime - 10);
    toast.success("Rewound 10s");
  };

  const seekForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPlayerReady) return;
    seekToTime(currentTime + 10);
    toast.success("Skipped 10s");
  };

  const handleResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!resumeTime) return;
    seekToTime(resumeTime);
    if (isYouTube && playerRef.current) {
      playerRef.current.playVideo();
    } else if (isVimeo && vimeoPlayerRef.current) {
      vimeoPlayerRef.current.play();
    }
    setResumeTime(null);
    toast.success("Resumed playback!");
  };

  const handleDismissResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResumeTime(null);
    localStorage.removeItem(`resume_${url}`);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isYouTube && playerRef.current && isPlayerReady) {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } else if (isVimeo && vimeoPlayerRef.current && isPlayerReady) {
      vimeoPlayerRef.current.setVolume(isMuted ? 1 : 0);
      setIsMuted(!isMuted);
    }
  };

  const toggleFullScreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error entering full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (isYouTube && playerRef.current && typeof playerRef.current.setPlaybackRate === "function") {
      playerRef.current.setPlaybackRate(speed);
    } else if (isVimeo && vimeoPlayerRef.current) {
      vimeoPlayerRef.current.setPlaybackRate(speed);
    }
    toast.success(`Speed: ${speed}x`);
  };

  // Seek bar mouse click / drag logic
  const calculateTimeFromEvent = (clientX: number) => {
    if (!progressBarRef.current || duration <= 0) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = offsetX / rect.width;
    return percent * duration;
  };

  const handleProgressBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsScrubbing(true);
    const target = calculateTimeFromEvent(e.clientX);
    seekToTime(target);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const movedTarget = calculateTimeFromEvent(moveEvent.clientX);
      setCurrentTime(movedTarget);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      setIsScrubbing(false);
      const finalTarget = calculateTimeFromEvent(upEvent.clientX);
      seekToTime(finalTarget);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setHoverX(offsetX);
    setHoverTime((offsetX / rect.width) * duration);
  };

  const handleProgressBarMouseLeave = () => {
    setHoverTime(null);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlayback();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seekToTime(currentTime - 10);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seekToTime(currentTime + 10);
      } else if (e.key === "m" || e.key === "M") {
        toggleMute({ stopPropagation: () => {} } as any);
      } else if (e.key === "f" || e.key === "F") {
        toggleFullScreen({ stopPropagation: () => {} } as any);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTime, duration, isPlaying, isMuted, isPlayerReady, seekToTime]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // URL parameters for background player
  let embedUrl = rawEmbedUrl;
  const separator = embedUrl.includes("?") ? "&" : "?";
  if (isYouTube)
    embedUrl += `${separator}enablejsapi=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&autoplay=1&mute=1`;
  if (isVimeo) embedUrl += `${separator}background=1&autoplay=1&muted=1&controls=0`;
  if (isDrive) embedUrl += `${separator}autoplay=1`;

  return (
    <div
      ref={containerRef}
      className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10 group select-none ${
        isFullScreen ? "h-screen w-screen rounded-none" : ""
      }`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Resume Playback Banner Overlay */}
      {resumeTime && (
        <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between gap-4 p-3 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 shadow-2xl text-white">
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Resume Watching?</span>
            <span className="text-[11px] text-muted-foreground/80">
              You watched up to {formatTime(resumeTime)} last time.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" className="h-8 text-xs font-semibold px-3" onClick={handleResume}>
              Resume
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs font-semibold px-2 hover:bg-white/10 text-white/80"
              onClick={handleDismissResume}
            >
              Start Over
            </Button>
          </div>
        </div>
      )}

      {/* Thumbnail Fallback / Loading Spinner */}
      {thumbnailUrl && !isPlayerReady && (
        <div className="absolute inset-0 z-0 transition-opacity duration-500">
          <img
            src={thumbnailUrl}
            alt="Course Thumbnail"
            className="h-full w-full object-cover blur-sm opacity-50 scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Player IFrame */}
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          id={iframeId.current}
          src={embedUrl}
          className={`h-[118%] w-[102%] -translate-y-[7.5%] -translate-x-[1%] transition-opacity duration-1000 ${
            isPlayerReady ? "opacity-100" : "opacity-0"
          } ${isDrive ? "pointer-events-auto" : "pointer-events-none"}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video player"
        />
      </div>

      {/* Visual Corner Masks - hide native branding */}
      <div className="absolute top-0 left-0 w-full h-[15%] bg-gradient-to-b from-black via-black/40 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 w-full h-[20%] bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-10" />

      {/* Interaction Click Blocker: Click video body to toggle play/pause */}
      {!isDrive && (
        <div className="absolute inset-0 z-20 cursor-pointer bg-transparent" onClick={togglePlayback} />
      )}

      {/* Custom YouTube-Style Controls Dock */}
      {!isDrive && isPlayerReady && (
        <div
          className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 px-4 pb-3 pt-8 bg-gradient-to-t from-black/95 via-black/75 to-transparent ${
            isPlaying && !isScrubbing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. YouTube-Style Scrubbing Progress Bar */}
          <div
            ref={progressBarRef}
            onMouseDown={handleProgressBarMouseDown}
            onMouseMove={handleProgressBarMouseMove}
            onMouseLeave={handleProgressBarMouseLeave}
            className="group/bar relative w-full h-5 cursor-pointer flex items-center select-none mb-2"
          >
            {/* Hover Timestamp Tooltip */}
            {hoverTime !== null && (
              <div
                className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-black/95 text-[11px] font-mono font-bold text-white pointer-events-none shadow-xl border border-white/20 whitespace-nowrap z-40"
                style={{ left: `${hoverX}px` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}

            {/* Background Track */}
            <div className="relative w-full h-1 group-hover/bar:h-2 transition-all duration-200 bg-white/25 rounded-full overflow-hidden">
              {/* Played Progress Bar */}
              <div
                className="h-full bg-gradient-to-r from-[#006837] to-[#F37021] transition-all rounded-full relative"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Scrubber Knob / Thumb */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-[#F37021] shadow-lg ring-2 ring-white transition-transform duration-150 pointer-events-none ${
                isScrubbing ? "scale-125" : "scale-0 group-hover/bar:scale-100"
              }`}
              style={{ left: `${progressPercent}%` }}
            />
          </div>

          {/* 2. Controls Toolbar Row */}
          <div className="flex items-center justify-between text-white">
            {/* Left Controls: Play, Skips, Volume, Timestamp */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Play / Pause */}
              <button
                type="button"
                onClick={togglePlayback}
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                className="h-9 w-9 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors text-white"
              >
                {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white ml-0.5" />}
              </button>

              {/* Skip Backward 10s */}
              <button
                type="button"
                onClick={seekBackward}
                title="Rewind 10s (Left Arrow)"
                className="h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors text-white/90 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              {/* Skip Forward 10s */}
              <button
                type="button"
                onClick={seekForward}
                title="Forward 10s (Right Arrow)"
                className="h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors text-white/90 hover:text-white"
              >
                <RotateCw className="h-4 w-4" />
              </button>

              {/* Mute Toggle */}
              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? "Unmute (m)" : "Mute (m)"}
                className="h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors text-white/90 hover:text-white"
              >
                {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
              </button>

              {/* Timestamp Indicator */}
              <div className="text-xs font-mono font-medium text-white/90 ml-1">
                <span>{formatTime(currentTime)}</span>
                <span className="text-white/40 mx-1">/</span>
                <span className="text-white/60">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Playback Speed & Fullscreen */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Speed Selector Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title="Playback Speed"
                    className="h-8 px-2.5 rounded-full hover:bg-white/15 flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white transition-colors"
                  >
                    <Gauge className="h-3.5 w-3.5" />
                    <span>{playbackRate === 1 ? "1x" : `${playbackRate}x`}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="rounded-xl bg-black/90 backdrop-blur-xl border-white/20 text-white min-w-[100px]"
                >
                  {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                    <DropdownMenuItem
                      key={spd}
                      onClick={() => handleSpeedChange(spd)}
                      className={`text-xs font-mono cursor-pointer py-1.5 ${
                        playbackRate === spd ? "text-primary font-bold bg-white/10" : "text-white/80"
                      }`}
                    >
                      {spd === 1 ? "1x (Normal)" : `${spd}x`}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullScreen}
                title={isFullScreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
                className="h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors text-white/90 hover:text-white"
              >
                {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Anti-Piracy Watermark */}
      {(user?.email || user?.phone) && (
        <div className="absolute inset-0 z-20 pointer-events-none select-none overflow-hidden">
          {[
            { top: "8%", left: "5%" },
            { top: "8%", left: "55%" },
            { top: "22%", left: "28%" },
            { top: "22%", left: "72%" },
            { top: "38%", left: "5%" },
            { top: "38%", left: "45%" },
            { top: "38%", left: "82%" },
            { top: "54%", left: "18%" },
            { top: "54%", left: "60%" },
            { top: "68%", left: "5%" },
            { top: "68%", left: "38%" },
            { top: "68%", left: "75%" },
            { top: "82%", left: "20%" },
            { top: "82%", left: "58%" },
            { top: "93%", left: "8%" },
            { top: "93%", left: "48%" },
          ].map((pos, i) => (
            <div
              key={i}
              className="absolute text-[11px] md:text-sm text-white/20 font-semibold whitespace-nowrap rotate-[-30deg] uppercase tracking-wider"
              style={{
                ...pos,
                animation:
                  i % 2 === 0
                    ? `float ${20 + i * 3}s linear infinite alternate`
                    : `float-reverse ${22 + i * 2}s linear infinite alternate`,
              }}
            >
              {user.email || user.phone} — {user.id.slice(0, 8).toUpperCase()}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes float {
          0%   { transform: translate(0, 0) rotate(-30deg); }
          100% { transform: translate(40px, 40px) rotate(-30deg); }
        }
        @keyframes float-reverse {
          0%   { transform: translate(0, 0) rotate(-30deg); }
          100% { transform: translate(-40px, -40px) rotate(-30deg); }
        }
      `}</style>
    </div>
  );
};

export default VideoEmbed;
