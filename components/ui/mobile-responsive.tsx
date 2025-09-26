"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Mobile-responsive container component
interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "dashboard" | "form" | "table"
}

const ResponsiveContainer = React.forwardRef<HTMLDivElement, ResponsiveContainerProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "p-4 md:p-6",
      dashboard: "p-4 md:p-8 space-y-4 md:space-y-8",
      form: "p-4 md:p-6 space-y-4 md:space-y-6",
      table: "p-2 md:p-4"
    }

    return (
      <div
        ref={ref}
        className={cn(variants[variant], className)}
        {...props}
      />
    )
  }
)
ResponsiveContainer.displayName = "ResponsiveContainer"

// Mobile-responsive grid component
interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: "sm" | "md" | "lg"
}

const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ className, cols = { mobile: 1, tablet: 2, desktop: 3 }, gap = "md", ...props }, ref) => {
    const gapClasses = {
      sm: "gap-2 md:gap-3",
      md: "gap-4 md:gap-6",
      lg: "gap-6 md:gap-8"
    }

    const gridCols = `grid-cols-${cols.mobile} md:grid-cols-${cols.tablet} lg:grid-cols-${cols.desktop}`

    return (
      <div
        ref={ref}
        className={cn("grid", gridCols, gapClasses[gap], className)}
        {...props}
      />
    )
  }
)
ResponsiveGrid.displayName = "ResponsiveGrid"

// Mobile-responsive text component
interface ResponsiveTextProps extends React.HTMLAttributes<HTMLElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span"
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl"
  weight?: "normal" | "medium" | "semibold" | "bold"
}

const ResponsiveText = React.forwardRef<HTMLElement, ResponsiveTextProps>(
  ({ className, as: Component = "p", size = "base", weight = "normal", ...props }, ref) => {
    const sizeClasses = {
      xs: "text-xs md:text-sm",
      sm: "text-sm md:text-base",
      base: "text-base md:text-lg",
      lg: "text-lg md:text-xl",
      xl: "text-xl md:text-2xl",
      "2xl": "text-2xl md:text-3xl",
      "3xl": "text-3xl md:text-4xl"
    }

    const weightClasses = {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold"
    }

    return (
      <Component
        ref={ref as any}
        className={cn(sizeClasses[size], weightClasses[weight], className)}
        {...props}
      />
    )
  }
)
ResponsiveText.displayName = "ResponsiveText"

// Mobile-responsive spacing component
interface ResponsiveSpacingProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  direction?: "vertical" | "horizontal" | "both"
}

const ResponsiveSpacing = React.forwardRef<HTMLDivElement, ResponsiveSpacingProps>(
  ({ className, size = "md", direction = "vertical", ...props }, ref) => {
    const spacingClasses = {
      xs: {
        vertical: "space-y-1 md:space-y-2",
        horizontal: "space-x-1 md:space-x-2",
        both: "gap-1 md:gap-2"
      },
      sm: {
        vertical: "space-y-2 md:space-y-3",
        horizontal: "space-x-2 md:space-x-3",
        both: "gap-2 md:gap-3"
      },
      md: {
        vertical: "space-y-4 md:space-y-6",
        horizontal: "space-x-4 md:space-x-6",
        both: "gap-4 md:gap-6"
      },
      lg: {
        vertical: "space-y-6 md:space-y-8",
        horizontal: "space-x-6 md:space-x-8",
        both: "gap-6 md:gap-8"
      },
      xl: {
        vertical: "space-y-8 md:space-y-12",
        horizontal: "space-x-8 md:space-x-12",
        both: "gap-8 md:gap-12"
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          direction === "both" ? "flex flex-col md:flex-row" : "flex flex-col",
          spacingClasses[size][direction],
          className
        )}
        {...props}
      />
    )
  }
)
ResponsiveSpacing.displayName = "ResponsiveSpacing"

// Mobile-responsive card wrapper
interface MobileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  compact?: boolean
}

const MobileCard = React.forwardRef<HTMLDivElement, MobileCardProps>(
  ({ className, interactive = false, compact = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg md:rounded-2xl border bg-card text-card-foreground shadow-sm",
          compact ? "p-3 md:p-4" : "p-4 md:p-6",
          interactive && "touch-feedback hover-desktop cursor-pointer transition-all duration-200",
          interactive && "hover:shadow-md active:scale-[0.98]",
          className
        )}
        {...props}
      />
    )
  }
)
MobileCard.displayName = "MobileCard"

// Hook for responsive behavior
export function useResponsive() {
  const [isMobile, setIsMobile] = React.useState(false)
  const [isTablet, setIsTablet] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    
    const checkScreenSize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
    }
    
    checkScreenSize()
    
    let resizeTimeout: NodeJS.Timeout
    const debouncedHandleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        checkScreenSize()
      }, 150) // 150ms debounce delay
    }
    
    window.addEventListener('resize', debouncedHandleResize, { passive: true })
    
    return () => {
      window.removeEventListener('resize', debouncedHandleResize)
      clearTimeout(resizeTimeout)
    }
  }, [])

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    mounted
  }
}

export {
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveText,
  ResponsiveSpacing,
  MobileCard
}