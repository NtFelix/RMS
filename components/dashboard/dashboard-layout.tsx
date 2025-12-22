"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import MobileBottomNavigation from "@/components/common/mobile-bottom-navigation"
import { cn } from "@/lib/utils"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Prevent hydration errors and handle responsive behavior
  useEffect(() => {
    setMounted(true)

    // Check initial screen size with proper breakpoint detection
    const checkScreenSize = () => {
      const newIsMobile = window.innerWidth < 768
      setIsMobile(newIsMobile)
      return newIsMobile
    }

    // Set initial state
    checkScreenSize()

    // Add resize listener for responsive behavior with debouncing
    let resizeTimeout: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        checkScreenSize()
      }, 150) // Debounce resize events to prevent excessive re-renders
    }

    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [])

  // Render CSS-only fallback during hydration to prevent mismatches
  if (!mounted) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        {/* CSS-only fallback layout with enhanced responsive behavior */}
        <div className="desktop-sidebar-responsive hydration-safe-desktop w-64 bg-background border-r prevent-layout-shift">
          <div className="flex h-full flex-col">
            {/* Sidebar placeholder with basic structure */}
            <div className="flex h-14 items-center border-b px-4">
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="flex-1 p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">

          <main className="flex flex-1 flex-col min-h-0 p-6 pt-6 md:pt-6 main-content-responsive responsive-transition prevent-layout-shift">
            <div className="flex-1 overflow-y-auto rounded-2xl border shadow-sm mb-4 md:mb-0">
              <div className="p-6">
                <div className="space-y-4">
                  <div className="h-8 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </div>
            </div>
          </main>
        </div>
        {/* Mobile navigation placeholder with enhanced CSS-only responsive behavior */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border mobile-nav-responsive hydration-safe-mobile prevent-layout-shift"
          role="navigation"
          aria-label="Main mobile navigation"
        >
          {/* Main navigation items placeholder */}
          <div className="flex items-center justify-around px-2 py-2 h-16">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1">
                <div className="w-5 h-5 mb-1 bg-muted rounded animate-pulse" />
                <div className="w-8 h-3 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </nav>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar - hidden on mobile with enhanced CSS-only fallbacks */}
      <div className="desktop-sidebar-responsive hydration-safe-desktop prevent-layout-shift">
        <DashboardSidebar />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">

        <main className={cn(
          "flex flex-1 flex-col min-h-0",
          // Enhanced responsive padding with CSS-only fallbacks
          "main-content-responsive",
          "responsive-transition",
          // Responsive padding: no top padding on mobile since header is hidden
          "p-6 md:p-6",
          "pt-6 md:pt-6",
          // JavaScript-enhanced responsive padding
          isMobile ? "pb-20 pt-6" : "pb-6 pt-6"
        )}>
          <div className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden border shadow-sm",
            "rounded-[2rem] md:rounded-[2.5rem]",
            // Enhanced CSS-only fallback for mobile bottom margin
            "mb-4 md:mb-0",
            "responsive-transition",
            "prevent-layout-shift",
            "mobile-smooth-scroll",
            // JavaScript-enhanced mobile spacing
            isMobile ? "mb-4" : "mb-0"
          )}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation - shown only on mobile with enhanced safety */}
      {mounted && isMobile && <MobileBottomNavigation />}
    </div>
  )
}
