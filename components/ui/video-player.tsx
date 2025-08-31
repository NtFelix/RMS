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
  const [isLoading, setIsLoading] = useState(true)
  const [shouldAutoplay, setShouldAutoplay] = useState(false)
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

  // Check if device is mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  useEffect(() => {
    // Only autoplay if not on mobile cellular connection
    if (autoplay && !isMobile() && !isOnCellular()) {
      setShouldAutoplay(true)
    }
  }, [autoplay])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedData = () => {
      setIsLoading(false)
      setHasError(false)
      if (shouldAutoplay) {
        video.play().then(() => {
          setIsPlaying(true)
        }).catch(() => {
          // Autoplay failed, show controls
          setShowControls(true)
        })
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)
    const handleError = () => {
      setIsLoading(false)
      setHasError(true)
    }

    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
    }
  }, [shouldAutoplay])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
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
        preload="metadata"
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 rounded-lg" role="status" aria-label="Loading video">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Custom controls overlay */}
      {!controls && (showControls || !isPlaying) && !isLoading && (
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
      {!shouldAutoplay && !isPlaying && !isLoading && (
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