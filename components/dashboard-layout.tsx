"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { useIsMobile } from "@/hooks/use-mobile"
import { MobileBottomNav } from "@/components/mobile"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setOpen } = useCommandMenu()
  const [mounted, setMounted] = useState(false)
  const isMobile = useIsMobile()

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
        <main className={`flex flex-1 flex-col min-h-0 ${isMobile ? 'p-4 pb-20' : 'p-6'}`}>
          <div className="flex-1 overflow-y-auto rounded-xl bg-white border shadow-sm">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile bottom navigation - positioned with proper z-index */}
      {isMobile && (
        <div className="relative z-50">
          <MobileBottomNav />
        </div>
      )}
    </div>
  )
}
