"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { useOrientationAwareMobile } from "@/hooks/use-orientation"
import { LazyMobileBottomNavigation } from "@/components/mobile/mobile-performance-wrapper"
import { cn } from "@/lib/utils"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setOpen } = useCommandMenu()
  const [mounted, setMounted] = useState(false)
  const { isMobile, orientation, isChanging } = useOrientationAwareMobile()

  // Prevent hydration errors by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar - hidden on mobile */}
      {!isMobile && <DashboardSidebar />}
      
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop header - hidden on mobile */}
        {!isMobile && (
          <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
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
        )}
        
        {/* Main content area with mobile-specific padding */}
        <main className={cn(
          "flex flex-1 flex-col min-h-0 transition-all duration-300",
          isMobile 
            ? orientation === 'landscape' 
              ? 'p-2 pb-16' // Less padding in landscape mode
              : 'p-4 pb-20' // Standard mobile padding in portrait
            : 'p-6', // Desktop padding
          isChanging && "opacity-95" // Slight opacity change during orientation transition
        )}>
          <div className="flex-1 overflow-y-auto rounded-xl bg-white border shadow-sm">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile bottom navigation - lazy loaded and performance optimized */}
      <LazyMobileBottomNavigation />
    </div>
  )
}
