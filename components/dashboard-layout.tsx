"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCommandMenu } from "@/hooks/use-command-menu"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setOpen } = useCommandMenu()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration errors by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
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
        <main className="flex flex-1 flex-col min-h-0 p-6">
          <div className="flex-1 overflow-y-auto rounded-xl bg-white p-6 border border-[#F1F3F3] shadow-sm">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
