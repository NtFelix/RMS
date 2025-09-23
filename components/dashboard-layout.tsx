"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import MobileBottomNavigation from "@/components/mobile-bottom-navigation"
import { SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { cn } from "@/lib/utils"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setOpen } = useCommandMenu()
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Prevent hydration errors and handle responsive behavior
  useEffect(() => {
    setMounted(true)
    
    // Check initial screen size
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // Set initial state
    checkScreenSize()
    
    // Add resize listener for responsive behavior
    const handleResize = () => {
      checkScreenSize()
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Render loading state during hydration to prevent mismatches
  if (!mounted) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        {/* CSS-only fallback layout */}
        <div className="hidden md:block w-64 bg-background border-r">
          {/* Sidebar placeholder */}
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
            {/* Header placeholder */}
          </header>
          <main className="flex flex-1 flex-col min-h-0 p-6 pb-6 md:pb-6">
            <div className="flex-1 overflow-y-auto rounded-2xl bg-white border shadow-sm mb-20 md:mb-0">
              {/* Content placeholder */}
            </div>
          </main>
        </div>
        {/* Mobile navigation placeholder - hidden until JS loads */}
        <nav 
          className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden"
          style={{ display: 'none' }}
        />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <DashboardSidebar />
      </div>
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6 dark:header-container">
          <div className="mx-auto w-full max-w-3xl">
            <Button
              variant="outline"
              className="flex w-full items-center gap-2 rounded-lg border-muted-foreground/20 text-sm text-muted-foreground"
              onClick={() => setOpen(true)}
            >
              <SearchIcon className="h-4 w-4" />
              <span>Suchen...</span>
              <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>
        </header>
        <main className={cn(
          "flex flex-1 flex-col min-h-0 p-6",
          // Responsive padding-bottom for mobile navigation
          isMobile ? "pb-20" : "pb-6"
        )}>
          <div className={cn(
            "flex-1 overflow-y-auto rounded-2xl bg-white dark:main-container border shadow-sm",
            // CSS-only fallback for mobile bottom margin
            "mb-0 md:mb-0",
            // Additional mobile spacing when navigation is present
            isMobile ? "mb-4" : "mb-0"
          )}>
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile bottom navigation - shown only on mobile */}
      {isMobile && <MobileBottomNavigation />}
    </div>
  )
}
