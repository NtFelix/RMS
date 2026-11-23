"use client"

import type React from "react"
import { useEffect, useSyncExternalStore } from "react"
import { usePathname } from "next/navigation"
import dynamic from "next/dynamic"
import { DashboardLayoutSkeleton } from "@/components/dashboard/dashboard-layout-skeleton"
import {
  DASHBOARD_CONTAINER_CLASS,
  DASHBOARD_FRAME_CLASS,
  DASHBOARD_MAIN_CLASS,
  DASHBOARD_ROOT_CLASS,
} from "@/components/dashboard/dashboard-layout-classes"
import { PrimaryRail } from "@/components/dashboard/shell/primary-rail"
import { SecondaryRailProvider, useSecondaryRail } from "@/components/dashboard/shell"
import { cn } from "@/lib/utils"
import type { SidebarUserData } from "@/lib/server/user-data"
import { TaskDndProvider } from "@/components/tasks/task-dnd-provider"
import { useAIChatStore } from "@/hooks/use-ai-chat-store"
import { useMediaQuery } from "@/hooks/use-media-query"

const emptySubscribe = () => () => {}

const SupportLauncher = dynamic(
  () => import("@/components/support/support-launcher").then((mod) => mod.SupportLauncher),
  { ssr: false },
)

export function DashboardLayout({
  children,
  sidebarData
}: {
  children: React.ReactNode
  sidebarData: SidebarUserData
}) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const isMobile = useMediaQuery("(max-width: 767px)")
  const { isOpen, displayMode } = useAIChatStore()
  const isPushMode = mounted && isOpen && displayMode === 'push' && !isMobile

  // Render the CSS-only skeleton during hydration to prevent mismatches (same markup as the Suspense fallback)
  if (!mounted) {
    return <DashboardLayoutSkeleton />
  }

  return (
    <TaskDndProvider>
      <SecondaryRailProvider>
        <div className={DASHBOARD_ROOT_CLASS}>
          <PrimaryRail sidebarData={sidebarData} />

          <div className={cn(
            DASHBOARD_FRAME_CLASS,
            // Push mode: shift content by adding right margin matching sidebar width
            isPushMode && "md:mr-[450px]"
          )}>
            <ShellContainer>{children}</ShellContainer>
          </div>

          <SupportLauncher />
        </div>
      </SecondaryRailProvider>
    </TaskDndProvider>
  )
}

// Rounded container with the contextual secondary rail (host of the portals of SecondaryRail) and the main area.
// Below `lg` the host is a drawer over the main area; it is the same element, so portaled content never remounts.
function ShellContainer({ children }: { children: React.ReactNode }) {
  const { setHostNode, hasRail, drawerOpen, setDrawerOpen } = useSecondaryRail()
  const pathname = usePathname()

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname, setDrawerOpen])

  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [drawerOpen, setDrawerOpen])

  return (
    <div className={DASHBOARD_CONTAINER_CLASS}>
      <aside
        ref={setHostNode}
        aria-label="Kontextnavigation"
        className={cn(
          "flex-col border-r border-border-subtle bg-surface-container",
          hasRail ? "flex" : "hidden",
          // >= lg: fixed column next to main
          "lg:w-[248px] lg:shrink-0",
          // < lg: drawer over the main area; invisible while closed so it cannot take focus
          "max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-30 max-lg:w-[248px] max-lg:max-w-[85%] max-lg:shadow-xl",
          "max-lg:transition-[transform,visibility] max-lg:duration-200 max-lg:ease-in-out",
          drawerOpen ? "max-lg:translate-x-0" : "max-lg:invisible max-lg:-translate-x-full",
        )}
      />

      {hasRail && drawerOpen && (
        <button
          type="button"
          aria-label="Navigation schließen"
          tabIndex={-1}
          className="absolute inset-0 z-20 cursor-default bg-background/60 backdrop-blur-xs lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <main className={DASHBOARD_MAIN_CLASS}>{children}</main>
    </div>
  )
}
