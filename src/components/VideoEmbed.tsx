import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "./ui/button";
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
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const vimeoPlayerRef = useRef<any>(null);
  const iframeId = useRef(`player-${Math.random().toString(36).substr(2, 9)}`);
  
  // Resume playback states
  const [resumeTime, setResumeTime] = useState<number | null>(null);

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isVimeo = url.includes("vimeo.com");
  const isDrive = url.includes("drive.google.com");

  useEffect(() => {
    setIsPlayerReady(false);
    setIsPlaying(false);
    setIsMuted(true);
    setResumeTime(null);

    if (isYouTube) {
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const initYTPlayer = () => {
        if (playerRef.current) playerRef.current.destroy();
        playerRef.current = new window.YT.Player(iframeId.current, {
          events: {
            'onReady': () => setIsPlayerReady(true),
            'onStateChange': (event: any) => {
              if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
              else if (event.data === window.YT.PlayerState.PAUSED) setIsPlaying(false);
              else if (event.data === window.YT.PlayerState.ENDED) setIsPlaying(false);
            }
          }
        });
      };

      if (window.YT && window.YT.Player) initYTPlayer();
      else window.onYouTubeIframeAPIReady = initYTPlayer;
    }

    if (isVimeo) {
      if (!window.Vimeo) {
        const tag = document.createElement('script');
        tag.src = "https://player.vimeo.com/api/player.js";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const initVimeoPlayer = () => {
        const iframe = document.getElementById(iframeId.current) as HTMLIFrameElement;
        if (!iframe) return;
        vimeoPlayerRef.current = new window.Vimeo.Player(iframe);
        vimeoPlayerRef.current.on('play', () => setIsPlaying(true));
        vimeoPlayerRef.current.on('pause', () => setIsPlaying(false));
        vimeoPlayerRef.current.on('ended', () => setIsPlaying(false));
        vimeoPlayerRef.current.ready().then(() => setIsPlayerReady(true));
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

    document.addEventListener('fullscreenchange', handleFullScreenChange);

    return () => {
      if (playerRef.current?.destroy) playerRef.current.destroy();
      if (vimeoPlayerRef.current?.destroy) vimeoPlayerRef.current.destroy();
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [url]);

  // Real-time playback timestamp tracking
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && isPlayerReady) {
      interval = setInterval(() => {
        if (isYouTube && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const time = playerRef.current.getCurrentTime();
          if (time > 2) {
            localStorage.setItem(`resume_${url}`, time.toString());
          }
        } else if (isVimeo && vimeoPlayerRef.current) {
          vimeoPlayerRef.current.getCurrentTime().then((time: number) => {
            if (time > 2) {
              localStorage.setItem(`resume_${url}`, time.toString());
            }
          });
        }
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isPlayerReady, url]);

  // Check for saved timestamp on mount/ready
  useEffect(() => {
    if (isPlayerReady) {
      const savedTime = localStorage.getItem(`resume_${url}`);
      if (savedTime) {
        const parsedTime = parseFloat(savedTime);
        if (parsedTime > 5) { // Only show resume popup if watched more than 5s
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
      if (typeof playerRef.current.playVideo !== 'function') return;
      isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
    } else if (isVimeo && vimeoPlayerRef.current && isPlayerReady) {
      isPlaying ? vimeoPlayerRef.current.pause() : vimeoPlayerRef.current.play();
    }
  };

  const seekBackward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPlayerReady) return;

    if (isYouTube && playerRef.current) {
      if (typeof playerRef.current.getCurrentTime !== 'function') return;
      const currentTime = playerRef.current.getCurrentTime();
      playerRef.current.seekTo(Math.max(0, currentTime - 10), true);
      toast.success("Rewound 10 seconds");
    } else if (isVimeo && vimeoPlayerRef.current) {
      vimeoPlayerRef.current.getCurrentTime().then((time: number) => {
        vimeoPlayerRef.current.setCurrentTime(Math.max(0, time - 10));
        toast.success("Rewound 10 seconds");
      });
    }
  };

  const seekForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPlayerReady) return;

    if (isYouTube && playerRef.current) {
      if (typeof playerRef.current.getCurrentTime !== 'function') return;
      const currentTime = playerRef.current.getCurrentTime();
      const duration = playerRef.current.getDuration();
      playerRef.current.seekTo(Math.min(duration, currentTime + 10), true);
      toast.success("Skipped 10 seconds");
    } else if (isVimeo && vimeoPlayerRef.current) {
      Promise.all([
        vimeoPlayerRef.current.getCurrentTime(),
        vimeoPlayerRef.current.getDuration()
      ]).then(([time, duration]) => {
        vimeoPlayerRef.current.setCurrentTime(Math.min(duration, time + 10));
        toast.success("Skipped 10 seconds");
      });
    }
  };

  const handleResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!resumeTime) return;

    if (isYouTube && playerRef.current) {
      playerRef.current.seekTo(resumeTime, true);
      playerRef.current.playVideo();
    } else if (isVimeo && vimeoPlayerRef.current) {
      vimeoPlayerRef.current.setCurrentTime(resumeTime);
      vimeoPlayerRef.current.play();
    }
    
    setResumeTime(null);
    toast.success("Resumed from where you left off!");
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
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Construct URL based on platform correctly with parameter checking
  let embedUrl = rawEmbedUrl;
  const separator = embedUrl.includes('?') ? '&' : '?';
  if (isYouTube) embedUrl += `${separator}enablejsapi=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&autoplay=1&mute=1`;
  if (isVimeo) embedUrl += `${separator}background=1&autoplay=1&muted=1&controls=0`;
  if (isDrive) embedUrl += `${separator}autoplay=1`;

  return (
    <div 
      ref={containerRef}
      className={`relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10 group ${isFullScreen ? 'h-screen w-screen rounded-none' : ''}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Resume Playback Banner Overlay */}
      {resumeTime && (
        <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between gap-4 p-3 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 shadow-2xl text-white">
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Resume Watching?</span>
            <span className="text-[11px] text-muted-foreground/80">You watched up to {Math.floor(resumeTime / 60)}m {Math.floor(resumeTime % 60)}s last time.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              size="sm" 
              className="h-8 text-xs font-semibold px-3"
              onClick={handleResume}
            >
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

      {/* Thumbnail Fallback / Loading State */}
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

      {/* Refined Clipping - Slightly less aggressive to ensure content visibility */}
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          id={iframeId.current}
          src={embedUrl}
          className={`h-[118%] w-[102%] -translate-y-[7.5%] -translate-x-[1%] transition-opacity duration-1000 ${isPlayerReady ? 'opacity-100' : 'opacity-0'} ${isDrive ? 'pointer-events-auto' : 'pointer-events-none'}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video player"
        />
      </div>
      
      {/* Visual Corner Masks - completely hide Share, Watch Later, and YouTube Logo */}
      <div className="absolute top-0 left-0 w-full h-[15%] bg-gradient-to-b from-black via-black/40 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 w-full h-[15%] bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none z-10" />
      
      {/* Corner Blockers for persistent logos/buttons */}
      <div className="absolute bottom-0 left-0 w-[20%] h-[20%] bg-black/60 backdrop-blur-sm pointer-events-none z-10 rounded-tr-3xl" />
      <div className="absolute bottom-0 right-0 w-[20%] h-[20%] bg-black/60 backdrop-blur-sm pointer-events-none z-10 rounded-tl-3xl" />
      <div className="absolute top-0 right-0 w-[15%] h-[15%] bg-black/40 backdrop-blur-sm pointer-events-none z-10" />

      {/* Interaction Blocker - ensures user only uses our custom controls */}
      {!isDrive && (
        <div 
          className="absolute inset-0 z-20 cursor-pointer bg-transparent" 
          onClick={togglePlayback}
        />
      )}

      {/* Custom Controls Layer */}
      {!isDrive && isPlayerReady && (
        <div className="absolute bottom-6 left-0 right-0 z-30 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          {/* Skip Backward 10s */}
          <Button 
            size="icon" 
            variant="secondary" 
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/10 shadow-xl shrink-0"
            onClick={seekBackward}
            title="Rewind 10s"
          >
            <RotateCcw className="h-5 w-5 text-white" />
          </Button>

          {/* Play / Pause */}
          <Button 
            size="icon" 
            variant="secondary" 
            className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 shadow-2xl shrink-0"
            onClick={(e) => { e.stopPropagation(); togglePlayback(); }}
          >
            {isPlaying ? <Pause className="h-7 w-7 fill-white" /> : <Play className="h-7 w-7 fill-white ml-0.5" />}
          </Button>

          {/* Skip Forward 10s */}
          <Button 
            size="icon" 
            variant="secondary" 
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/10 shadow-xl shrink-0"
            onClick={seekForward}
            title="Forward 10s"
          >
            <RotateCw className="h-5 w-5 text-white" />
          </Button>

          <Button 
            size="icon" 
            variant="secondary" 
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/10 shadow-xl shrink-0"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
          </Button>

          <Button 
            size="icon" 
            variant="secondary" 
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/10 shadow-xl shrink-0"
            onClick={toggleFullScreen}
          >
            {isFullScreen ? <Minimize className="h-5 w-5 text-white" /> : <Maximize className="h-5 w-5 text-white" />}
          </Button>
        </div>
      )}

      {/* Watermark — dense grid with increased opacity */}
      {(user?.email || user?.phone) && (
        <div className="absolute inset-0 z-20 pointer-events-none select-none overflow-hidden">
          {[
            { top: '8%',  left: '5%'  },
            { top: '8%',  left: '55%' },
            { top: '22%', left: '28%' },
            { top: '22%', left: '72%' },
            { top: '38%', left: '5%'  },
            { top: '38%', left: '45%' },
            { top: '38%', left: '82%' },
            { top: '54%', left: '18%' },
            { top: '54%', left: '60%' },
            { top: '68%', left: '5%'  },
            { top: '68%', left: '38%' },
            { top: '68%', left: '75%' },
            { top: '82%', left: '20%' },
            { top: '82%', left: '58%' },
            { top: '93%', left: '8%'  },
            { top: '93%', left: '48%' },
          ].map((pos, i) => (
            <div 
              key={i}
              className="absolute text-[11px] md:text-sm text-white/30 font-semibold whitespace-nowrap rotate-[-30deg] uppercase tracking-wider"
              style={{ 
                ...pos, 
                animation: i % 2 === 0
                  ? `float ${20 + (i * 3)}s linear infinite alternate`
                  : `float-reverse ${22 + (i * 2)}s linear infinite alternate`
              }}
            >
              {user.email || user.phone} — {user.id.slice(0,8).toUpperCase()}
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
