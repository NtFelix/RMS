'use client'

import React, { useState, useEffect } from 'react'
import { 
  Menu, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Maximize2, 
  Minimize2,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useMobile } from '@/hooks/use-mobile'

interface ResponsiveToolbarProps {
  children: React.ReactNode
  className?: string
  compactMode?: boolean
}

/**
 * Responsive toolbar that adapts to different screen sizes
 */
export function ResponsiveToolbar({ children, className, compactMode }: ResponsiveToolbarProps) {
  const isMobile = useMobile()
  const [isExpanded, setIsExpanded] = useState(false)

  if (isMobile) {
    return (
      <div className={cn('border-b bg-background', className)}>
        {/* Mobile toolbar header */}
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[60vh]">
                <div className="p-4 space-y-4">
                  <h3 className="font-semibold">Formatierungsoptionen</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {children}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-sm font-medium">Formatierung</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Expandable toolbar content */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="px-2 pb-2">
            <div className="flex flex-wrap gap-1">
              {children}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    )
  }

  // Desktop toolbar
  return (
    <div className={cn(
      'flex items-center gap-1 p-2 border-b bg-background',
      compactMode && 'p-1 gap-0.5',
      className
    )}>
      {children}
    </div>
  )
}

interface ResponsiveModalProps {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  title: string
  className?: string
}

/**
 * Modal that adapts to mobile screens by becoming full-screen
 */
export function ResponsiveModal({ 
  children, 
  isOpen, 
  onClose, 
  title, 
  className 
}: ResponsiveModalProps) {
  const isMobile = useMobile()
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (isMobile) {
      setIsFullscreen(true)
    }
  }, [isMobile])

  if (!isOpen) return null

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      isMobile ? 'p-0' : 'p-4',
      'bg-black/50 backdrop-blur-sm animate-in fade-in duration-300'
    )}>
      <div className={cn(
        'bg-background border shadow-lg',
        isMobile || isFullscreen 
          ? 'w-full h-full rounded-none' 
          : 'w-full max-w-4xl h-[90vh] rounded-lg',
        'flex flex-col overflow-hidden',
        'animate-in slide-in-from-bottom duration-500',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex items-center gap-2">
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8 p-0"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

interface DevicePreviewProps {
  children: React.ReactNode
  device: 'mobile' | 'tablet' | 'desktop'
  className?: string
}

/**
 * Device preview component for testing responsive design
 */
export function DevicePreview({ children, device, className }: DevicePreviewProps) {
  const getDeviceStyles = () => {
    switch (device) {
      case 'mobile':
        return 'w-[375px] h-[667px]'
      case 'tablet':
        return 'w-[768px] h-[1024px]'
      case 'desktop':
        return 'w-full h-full'
      default:
        return 'w-full h-full'
    }
  }

  const getDeviceIcon = () => {
    switch (device) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />
      case 'tablet':
        return <Tablet className="h-4 w-4" />
      case 'desktop':
        return <Monitor className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden bg-background', className)}>
      {/* Device header */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/50">
        {getDeviceIcon()}
        <span className="text-sm font-medium capitalize">{device}</span>
        <div className="flex-1" />
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
          <div className="w-2 h-2 bg-green-500 rounded-full" />
        </div>
      </div>

      {/* Device content */}
      <div className={cn(
        'overflow-auto',
        getDeviceStyles(),
        device !== 'desktop' && 'mx-auto'
      )}>
        {children}
      </div>
    </div>
  )
}

interface TouchOptimizedButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
}

/**
 * Button optimized for touch interactions
 */
export function TouchOptimizedButton({
  children,
  onClick,
  variant = 'default',
  size = 'md',
  className,
  disabled
}: TouchOptimizedButtonProps) {
  const isMobile = useMobile()

  const getSizeClasses = () => {
    if (isMobile) {
      // Larger touch targets on mobile
      switch (size) {
        case 'sm':
          return 'h-10 px-4 text-sm'
        case 'md':
          return 'h-12 px-6 text-base'
        case 'lg':
          return 'h-14 px-8 text-lg'
        default:
          return 'h-12 px-6 text-base'
      }
    } else {
      // Standard sizes on desktop
      switch (size) {
        case 'sm':
          return 'h-8 px-3 text-sm'
        case 'md':
          return 'h-10 px-4 text-base'
        case 'lg':
          return 'h-12 px-6 text-lg'
        default:
          return 'h-10 px-4 text-base'
      }
    }
  }

  return (
    <Button
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        getSizeClasses(),
        'transition-all duration-200',
        isMobile && 'active:scale-95',
        !isMobile && 'hover:scale-105',
        className
      )}
    >
      {children}
    </Button>
  )
}

interface SwipeGestureProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  className?: string
}

/**
 * Component that handles swipe gestures on mobile
 */
export function SwipeGesture({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className
}: SwipeGestureProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > threshold
    const isRightSwipe = distanceX < -threshold
    const isUpSwipe = distanceY > threshold
    const isDownSwipe = distanceY < -threshold

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft()
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight()
    }
    if (isUpSwipe && onSwipeUp) {
      onSwipeUp()
    }
    if (isDownSwipe && onSwipeDown) {
      onSwipeDown()
    }
  }

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  )
}

interface ResponsiveGridProps {
  children: React.ReactNode
  columns?: {
    mobile: number
    tablet: number
    desktop: number
  }
  gap?: number
  className?: string
}

/**
 * Responsive grid that adapts to different screen sizes
 */
export function ResponsiveGrid({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 4,
  className
}: ResponsiveGridProps) {
  return (
    <div className={cn(
      'grid',
      `grid-cols-${columns.mobile}`,
      `md:grid-cols-${columns.tablet}`,
      `lg:grid-cols-${columns.desktop}`,
      `gap-${gap}`,
      className
    )}>
      {children}
    </div>
  )
}

// Hook for detecting device orientation
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }

    updateOrientation()
    window.addEventListener('resize', updateOrientation)
    window.addEventListener('orientationchange', updateOrientation)

    return () => {
      window.removeEventListener('resize', updateOrientation)
      window.removeEventListener('orientationchange', updateOrientation)
    }
  }, [])

  return orientation
}

// Hook for detecting viewport size
export function useViewportSize() {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateSize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateSize()
    window.addEventListener('resize', updateSize)

    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return size
}

// Export all components
export {
  ResponsiveToolbar,
  ResponsiveModal,
  DevicePreview,
  TouchOptimizedButton,
  SwipeGesture,
  ResponsiveGrid,
  useOrientation,
  useViewportSize
}