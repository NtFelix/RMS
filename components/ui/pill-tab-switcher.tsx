"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "./use-mobile"

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
  'aria-label'?: string;
}

const PillTabSwitcher = React.memo(React.forwardRef<
  HTMLDivElement,
  PillTabSwitcherProps
>(({ tabs, activeTab, onTabChange, className, ...props }, ref) => {
  // Responsive design hook for mobile optimization
  const isMobile = useIsMobile()
  
  // State management for tracking active tab
  const [currentActiveTab, setCurrentActiveTab] = React.useState(activeTab)
  
  // Ref for the container to calculate tab positions
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  // State for sliding background indicator position
  const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({})
  

  
  // Touch interaction state for better mobile feedback
  const [touchedTab, setTouchedTab] = React.useState<string | null>(null)
  
  // Update internal state when activeTab prop changes
  React.useEffect(() => {
    setCurrentActiveTab(activeTab)
  }, [activeTab])

  // Memoized function to calculate and update indicator position
  const updateIndicatorPosition = React.useCallback((tabValue: string) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const activeIndex = tabs.findIndex(tab => tab.value === tabValue);

    if (activeIndex === -1) return;

    const tabButtons = container.querySelectorAll('button[data-tab]');
    const activeButton = tabButtons[activeIndex] as HTMLElement;

    if (!activeButton) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(container);
    const paddingLeft = parseFloat(computedStyle.paddingLeft);
    const left = buttonRect.left - containerRect.left - paddingLeft;
    const width = buttonRect.width;

    setIndicatorStyle({
      transform: `translateX(${left}px)`,
      width: `${width}px`,
    });
  }, [tabs]);

  const handleTabChange = React.useCallback((tabValue: string) => {
    setCurrentActiveTab(tabValue);
    onTabChange(tabValue);
    updateIndicatorPosition(tabValue);
  }, [onTabChange, updateIndicatorPosition]);

  React.useEffect(() => {
    // Initial position update
    updateIndicatorPosition(activeTab);

    // Update on resize
    const handleResize = () => requestAnimationFrame(() => updateIndicatorPosition(activeTab));
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab, updateIndicatorPosition]);

  // Touch interaction handlers for better mobile feedback
  const handleTouchStart = React.useCallback((tabValue: string) => {
    setTouchedTab(tabValue)
  }, [])

  const handleTouchEnd = React.useCallback(() => {
    setTouchedTab(null)
  }, [])

  const handleTouchCancel = React.useCallback(() => {
    setTouchedTab(null)
  }, [])



  return (
    <div
      ref={containerRef}
      className={cn(
        // Core pill container styling with responsive height
        "relative inline-flex items-center justify-center",
        // Add gap between tabs for better visual separation
        isMobile ? "gap-2" : "gap-1.5",
        // Responsive height: larger on mobile for better touch targets
        isMobile ? "h-14" : "h-12",
        // Pill shape with rounded corners
        "rounded-full",
        // Semi-transparent background with backdrop blur
        "bg-muted/60 backdrop-blur-md",
        // Responsive padding: more on mobile for better touch spacing
        isMobile ? "p-2.5" : "p-2",
        // Subtle shadow for elevation
        "shadow-md shadow-black/5",
        // Border for better definition
        "border border-border/50",
        // Responsive width: full width on small screens, auto on larger
        "w-full sm:w-auto",
        // Responsive max width to prevent excessive stretching on mobile
        "max-w-sm sm:max-w-none",
        // Touch optimization: prevent text selection and improve touch response
        "select-none touch-manipulation",
        className
      )}
      {...props}
      role="tablist"
    >
      {/* Sliding background indicator */}
      <div
        className={cn(
          // Responsive positioning and layering based on container padding
          "absolute rounded-full bg-primary",
          // Responsive positioning: adjust for different padding on mobile vs desktop
          isMobile ? "left-2.5 top-2.5 bottom-2.5" : "left-2 top-2 bottom-2",
          // Smooth sliding animation
          "transition-all duration-300 ease-out motion-reduce:transition-none",
          // Subtle shadow for the indicator
          "shadow-sm shadow-primary/20",
          // Ensure it's behind the tab buttons
          "z-0"
        )}
        style={indicatorStyle}
        role="presentation"
      />
      

      {tabs.map((tab, index) => {
        const isActive = currentActiveTab === tab.value
        
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.value}`}
            id={`tab-${tab.value}`}
            data-tab={tab.value}
            onClick={() => handleTabChange(tab.value)}

            onTouchStart={() => handleTouchStart(tab.value)}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            className={cn(
              // Base tab item structure
              "relative z-10 inline-flex items-center justify-center whitespace-nowrap",
              // Pill shape matching container
              "rounded-full",
              // Responsive spacing and typography for tab labels
              // Mobile: larger padding and text for better touch targets
              isMobile 
                ? "px-6 py-3 text-base font-medium leading-none" 
                : "px-4 py-2.5 text-sm font-medium leading-none",
              // Ensure even distribution within container
              "flex-1 min-w-0",
              // Responsive minimum touch target size (44px minimum on mobile)
              isMobile ? "min-h-[44px]" : "min-h-[40px]",
              // Touch optimization: improve tap response
              "touch-manipulation",
              // Simple smooth transitions
              "transition-all duration-200 ease-out motion-reduce:transition-none",
              // Enhanced focus states for accessibility with better visibility
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              // Focus state background for better contrast
              "focus-visible:bg-muted/30",
              // Disabled state handling
              "disabled:pointer-events-none disabled:opacity-50",
              // Touch feedback: visual feedback when touched on mobile
              touchedTab === tab.value && isMobile && "bg-muted/30 scale-[0.98]",
              // Enhanced active vs inactive state styling
              isActive
                ? [
                    // Active tab: white text over sliding background indicator
                    "text-primary-foreground",
                    // Ensure active state is clearly visible
                    "font-semibold",
                    // No background since sliding indicator provides it
                    "bg-transparent",
                    // Prevent hover effects on active tab to avoid interference
                    "hover:scale-100",
                    // Mobile: prevent hover effects entirely on touch devices
                    isMobile && "hover:scale-100 hover:bg-transparent"
                  ]
                : [
                    // Inactive tab: muted styling with enhanced hover effects
                    "text-muted-foreground",
                    // Simple desktop hover effects
                    !isMobile && [
                      "hover:text-foreground",
                      "hover:scale-105"
                    ],
                    // Mobile: simpler touch feedback without hover effects
                    isMobile && [
                      "active:bg-muted/40",
                      "active:scale-[0.98]"
                    ],
                    // Maintain normal font weight for inactive
                    "font-medium"
                  ]
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}))

PillTabSwitcher.displayName = "PillTabSwitcher"

export { PillTabSwitcher, type PillTabSwitcherProps, type PillTabSwitcherTab }