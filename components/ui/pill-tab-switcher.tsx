"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PillTabSwitcherTab {
  id: string;
  label: string;
  value: string;
}

interface PillTabSwitcherProps {
  tabs: PillTabSwitcherTab[];
  activeTab: string;
  onTabChange: (tabValue: string) => void;
  className?: string;
}

const PillTabSwitcher = React.forwardRef<
  HTMLDivElement,
  PillTabSwitcherProps
>(({ tabs, activeTab, onTabChange, className, ...props }, ref) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  // Forward the ref to the container element
  React.useImperativeHandle(ref, () => containerRef.current!)
  const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({
    opacity: 0
  })
  const [isInitialized, setIsInitialized] = React.useState(false)

  // Calculate indicator position based on active tab
  const updateIndicatorPosition = React.useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const activeIndex = tabs.findIndex(tab => tab.value === activeTab)
    
    if (activeIndex === -1) return

    const buttons = container.querySelectorAll('button[data-tab]')
    const activeButton = buttons[activeIndex] as HTMLElement
    
    if (!activeButton) return

    // Get button dimensions and position
    const buttonRect = activeButton.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    
    // Calculate position relative to the indicator's starting position (inset-2 = 8px on all sides)
    const indicatorOffset = 8 // inset-2 = 8px
    const left = buttonRect.left - containerRect.left - indicatorOffset
    const width = buttonRect.width

    setIndicatorStyle({
      transform: `translateX(${left}px)`,
      width: `${width}px`,
      height: `${buttonRect.height}px`, // Ensure height matches button exactly
      opacity: 1
    })
    
    if (!isInitialized) {
      setIsInitialized(true)
    }
  }, [activeTab, tabs, isInitialized])

  // Handle tab change - only call onTabChange if it's actually a different tab
  const handleTabClick = React.useCallback((tabValue: string) => {
    if (tabValue !== activeTab) {
      onTabChange(tabValue)
    }
  }, [activeTab, onTabChange])

  // Update indicator position when activeTab changes
  React.useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    const frame = requestAnimationFrame(() => {
      updateIndicatorPosition()
    })
    
    return () => cancelAnimationFrame(frame)
  }, [updateIndicatorPosition])

  // Handle resize events
  React.useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(updateIndicatorPosition)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateIndicatorPosition])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center",
        "h-12 p-2 rounded-full",
        "bg-muted/60 backdrop-blur-sm",
        "border border-border/50",
        "shadow-sm",
        "select-none",
        className
      )}
      {...props}
    >
      {/* Sliding indicator */}
      <div
        className={cn(
          "absolute inset-2 rounded-full",
          "bg-primary shadow-sm",
          "transition-all duration-200 ease-out",
          "z-0"
        )}
        style={indicatorStyle}
      />
      
      {/* Tab buttons */}
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value
        
        return (
          <button
            key={tab.id}
            type="button"
            data-tab={tab.value}
            onClick={() => handleTabClick(tab.value)}
            className={cn(
              "relative z-10 flex-1",
              "px-4 py-2 rounded-full",
              "text-sm font-medium",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              "disabled:pointer-events-none disabled:opacity-50",
              isActive
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
})

PillTabSwitcher.displayName = "PillTabSwitcher"

export { PillTabSwitcher, type PillTabSwitcherProps, type PillTabSwitcherTab }