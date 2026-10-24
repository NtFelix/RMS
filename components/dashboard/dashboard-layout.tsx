"use client"

import type React from "react"
import { useSyncExternalStore } from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardLayoutSkeleton } from "@/components/dashboard/dashboard-layout-skeleton"
import {
  DASHBOARD_CARD_CLASS,
  DASHBOARD_MAIN_CLASS,
  DASHBOARD_ROOT_CLASS,
  DASHBOARD_SIDEBAR_CLASS,
} from "@/components/dashboard/dashboard-layout-classes"
import MobileBottomNavigation from "@/components/common/mobile-bottom-navigation"
import { cn } from "@/lib/utils"
import type { SidebarUserData } from "@/lib/server/user-data"
import { useSidebarStore } from "@/hooks/use-sidebar-store"
import { TaskDndProvider } from "@/components/tasks/task-dnd-provider"
import dynamic from "next/dynamic"
import { useAIChatStore } from "@/hooks/use-ai-chat-store"
import { useMediaQuery } from "@/hooks/use-media-query"
import { TABLET_BREAKPOINT } from "@/lib/constants"

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
  const isTabletCollapsed = useMediaQuery(TABLET_BREAKPOINT)
  const { preference } = useSidebarStore()
  const { isOpen, displayMode } = useAIChatStore()
  const isPushMode = mounted && isOpen && displayMode === 'push' && !isMobile
  const isCollapsed = isTabletCollapsed || preference === 'collapsed'

  // Render the CSS-only skeleton during hydration to prevent mismatches (same markup as the Suspense fallback)
  if (!mounted) {
    return <DashboardLayoutSkeleton />
  }

  return (
    <TaskDndProvider>
      <div className={DASHBOARD_ROOT_CLASS}>
        {/* Desktop sidebar */}
        <div
          className={DASHBOARD_SIDEBAR_CLASS}
          style={{
            width: isCollapsed ? "4.5rem" : "16rem"
          }}
        >
          <DashboardSidebar sidebarData={sidebarData} />
        </div>

        <main className={cn(
          DASHBOARD_MAIN_CLASS,
          // JavaScript-enhanced responsive padding
          isMobile ? "pb-20 pt-3 px-3" : "py-3 pr-3 pl-0",
          // Push mode: shift content by adding right margin matching sidebar width
          isPushMode && "md:mr-[450px]"
        )}>
          <div className={cn(
            DASHBOARD_CARD_CLASS,
            isMobile && "pb-20"
          )}>
            {children}
          </div>
        </main>

        {mounted && isMobile && <MobileBottomNavigation sidebarData={sidebarData} />}
        <SupportLauncher />
      </div>
    </TaskDndProvider>
  )
}
