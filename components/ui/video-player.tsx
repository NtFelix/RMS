"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import { VideoPoster } from "./video-poster"

interface VideoPlayerProps {
  src: string
  srcLowQuality?: string
  poster?: string
  className?: string
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  controls?: boolean
  playsInline?: boolean
  showPosterFallback?: boolean
}

export function VideoPlayer({
  src,
  srcLowQuality,
  poster,
  className,
  autoplay = false,
  muted = true,
  loop = true,
  controls = false,
  playsInline = true,
  showPosterFallback = true,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(muted)
  const [showControls, setShowControls] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [shouldAutoplay, setShouldAutoplay] = useState(false)
  const [shouldAutoLoad, setShouldAutoLoad] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Check if user is on cellular connection (if available)
  const isOnCellular = () => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      return connection?.effectiveType === 'slow-2g' || 
             connection?.effectiveType === '2g' || 
             connection?.effectiveType === '3g' ||
             connection?.saveData === true
    }
    return false
  }

  // Get appropriate video source based on connection
  const getVideoSrc = () => {
    if (srcLowQuality && (isOnCellular() || isMobile())) {
      return srcLowQuality
    }
    return src
  }

  // Get preload strategy based on device
  const getPreloadStrategy = () => {
    // On desktop, use metadata preload for faster initial loading
    // On mobile, use none to save bandwidth
    return !isMobile() && !isOnCellular() ? "metadata" : "none"
  }

  // Check if device is mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  useEffect(() => {
    const isDesktop = !isMobile() && !isOnCellular()
    
    // Only autoplay if on desktop with good connection
    if (autoplay && isDesktop) {
      setShouldAutoplay(true)
    }
    
    // Auto-load on desktop after a short delay to let page settle
    if (isDesktop) {
      const timer = setTimeout(() => {
        setShouldAutoLoad(true)
      }, 1000) // 1 second delay after component mount
      
      return () => clearTimeout(timer)
    }
  }, [autoplay])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadStart = () => {
      setIsLoading(true)
      setHasError(false)
    }

    const handleCanPlay = () => {
      setIsLoading(false)
      setIsBuffering(false)
      if (shouldAutoplay && !isPlaying) {
        video.play().then(() => {
          setIsPlaying(true)
        }).catch(() => {
          // Autoplay failed, show controls
          setShowControls(true)
        })
      }
    }

    const handleWaiting = () => {
      setIsBuffering(true)
    }

    const handlePlaying = () => {
      setIsBuffering(false)
    }

    const handlePlay = () => {
      setIsPlaying(true)
      setIsLoading(false)
    }
    
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)
    
    const handleError = () => {
      setIsLoading(false)
      setIsBuffering(false)
      setHasError(true)
    }

    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
    }
  }, [shouldAutoplay])

  // Auto-load video on desktop
  useEffect(() => {
    const video = videoRef.current
    if (!video || !shouldAutoLoad) return

    // Start loading the video if not already loaded
    if (video.readyState === 0) {
      video.load()
    }
  }, [shouldAutoLoad])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      // Start loading if not already loaded
      if (video.readyState === 0) {
        video.load()
      }
      video.play().catch(() => {
        // Play failed, show controls
        setShowControls(true)
      })
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  // Show poster fallback if there's an error and fallback is enabled
  if (hasError && showPosterFallback) {
    return (
      <VideoPoster 
        className={className}
        onClick={togglePlay}
      />
    )
  }

  return (
    <div 
      className={cn("relative group", className)}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={getVideoSrc()}
        poster={poster}
        muted={isMuted}
        loop={loop}
        playsInline={playsInline}
        controls={controls}
        className="w-full h-full object-cover rounded-lg"
        preload={getPreloadStrategy()}
      />
      
      {/* Loading overlay */}
      {(isLoading || isBuffering) && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 rounded-lg" role="status" aria-label={isLoading ? "Loading video" : "Buffering"}>
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">
              {isLoading ? "Loading..." : "Buffering..."}
            </span>
          </div>
        </div>
      )}

      {/* Custom controls overlay */}
      {!controls && (showControls || !isPlaying) && !isLoading && !isBuffering && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg transition-opacity duration-200">
          <div className="flex items-center gap-2 bg-black/60 rounded-full px-4 py-2 backdrop-blur-sm">
            <button
              onClick={togglePlay}
              className="text-white hover:text-primary transition-colors"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>
            
            <button
              onClick={toggleMute}
              className="text-white hover:text-primary transition-colors"
              aria-label={isMuted ? "Unmute video" : "Mute video"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Click to play overlay for mobile/cellular */}
      {!shouldAutoplay && !isPlaying && !isLoading && !isBuffering && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg cursor-pointer"
          onClick={togglePlay}
        >
          <div className="bg-white/90 rounded-full p-4 hover:bg-white transition-colors">
            <Play className="w-8 h-8 text-black ml-1" />
          </div>
        </div>
      )}
    </div>
  )
}