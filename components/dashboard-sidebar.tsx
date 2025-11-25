"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { BarChart3, Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare, Menu, X, CreditCard, Folder, Mail, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { LOGO_URL } from "@/lib/constants"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SimpleScrollArea } from "@/components/ui/simple-scroll-area"
import { UserSettings } from "@/components/user-settings"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSidebarActiveState } from "@/hooks/use-active-state-manager"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { useFeatureFlagEnabled } from "posthog-js/react"

// Stelle sicher, dass der Mieter-Link korrekt ist
const sidebarNavItems = [
  {
    title: "Dashboard",
    href: "/home",
    icon: BarChart3,
  },
  {
    title: "Häuser",
    href: "/haeuser",
    icon: Building2,
  },
  {
    title: "Wohnungen",
    href: "/wohnungen",
    icon: Home,
  },
  {
    title: "Mieter",
    href: "/mieter",
    icon: Users,
  },
  {
    title: "Finanzen",
    href: "/finanzen",
    icon: Wallet,
  },
  {
    title: "Betriebskosten",
    href: "/betriebskosten",
    icon: FileSpreadsheet,
  },
  {
    title: "Aufgaben",
    href: "/todos",
    icon: CheckSquare,
  },
  {
    title: "Dokumente",
    href: "/dateien",
    icon: Folder,
  },
  {
    title: "E-Mails",
    href: "/mails",
    icon: Mail,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { isRouteActive, getActiveStateClasses } = useSidebarActiveState()
  const { setOpen } = useCommandMenu()
  // User email handling is managed by the UserSettings component
  const documentsEnabled = useFeatureFlagEnabled('documents_tab_access')
  const mailsEnabled = useFeatureFlagEnabled('mails-tab')

  // Feature flags for navigation items
  const featureFlags = new Map([
    ['/dateien', documentsEnabled],
    ['/mails', mailsEnabled],
  ]);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-40 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        <span className="sr-only">Toggle menu</span>
      </Button>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-background/80 backdrop-blur-sm transition-all duration-100 md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsOpen(false)}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[49] flex-col transition-all duration-300 ease-in-out md:sticky md:translate-x-0 hidden md:flex h-screen",
          isOpen ? "translate-x-0 flex" : "-translate-x-full",
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        <div className="h-full w-full bg-background border-r border-border dark:sidebar-container flex flex-col relative">
          {/* Header section */}
          <div className={cn("flex items-center pt-6 pb-2 dark:sidebar-header", isCollapsed ? "justify-center px-2" : "justify-between pl-8 pr-6")}>
            {!isCollapsed && (
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  <Image
                    src={LOGO_URL}
                    alt="IV Logo"
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
                <span className="text-lg">Mietfluss</span>
              </Link>
            )}
            {isCollapsed && (
              <div className="relative w-8 h-8 rounded-full overflow-hidden">
                <Image
                  src={LOGO_URL}
                  alt="IV Logo"
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
            )}
          </div>

          {/* Navigation section - takes remaining space */}
          <div className="flex-1 overflow-y-auto min-h-0 py-2">
            <nav className={cn("grid gap-1", isCollapsed ? "px-2" : "px-6")}>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setOpen(true)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-500 ease-out hover:bg-accent hover:text-white hover:shadow-lg hover:shadow-accent/20",
                        isCollapsed && "justify-center h-10 w-10 p-0 mx-auto"
                      )}
                    >
                      <Search className="h-4 w-4 transition-all duration-500 ease-out group-hover:scale-125 group-hover:rotate-3" />
                      {!isCollapsed && (
                        <>
                          <span className="transition-all duration-500 ease-out group-hover:font-semibold group-hover:tracking-wide">
                            Suche
                          </span>
                          <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 group-hover:text-white group-hover:border-white/20">
                            <span className="text-xs">⌘</span>K
                          </kbd>
                        </>
                      )}
                    </button>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right">Suche (⌘K)</TooltipContent>}
                </Tooltip>

                {sidebarNavItems
                  .filter(item => !featureFlags.has(item.href) || featureFlags.get(item.href))
                  .map((item) => {
                    const isActive = isRouteActive(item.href);

                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-500 ease-out hover:bg-accent hover:text-white hover:shadow-lg hover:shadow-accent/20",
                              getActiveStateClasses(item.href),
                              isCollapsed && "justify-center h-10 w-10 p-0 mx-auto"
                            )}
                            data-active={isActive}
                            aria-current={isActive ? "page" : undefined}
                          >
                            <item.icon className="h-4 w-4 transition-all duration-500 ease-out group-hover:scale-125 group-hover:rotate-3" />
                            {!isCollapsed && (
                              <span className="transition-all duration-500 ease-out group-hover:font-semibold group-hover:tracking-wide">
                                {item.title}
                              </span>
                            )}
                          </Link>
                        </TooltipTrigger>
                        {isCollapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                      </Tooltip>
                    )
                  })}
              </TooltipProvider>
            </nav>
          </div>

          {/* Profile section - fixed at bottom */}
          <div className={cn("pt-2 pb-4 dark:sidebar-footer flex flex-col gap-2", isCollapsed ? "px-2" : "px-6")}>
            <Button
              variant="ghost"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-500 ease-out hover:bg-accent hover:text-white",
                !isCollapsed && "w-full justify-start",
                isCollapsed && "justify-center h-10 w-10 p-0 mx-auto"
              )}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {!isCollapsed && <span>Einklappen</span>}
            </Button>
            <UserSettings collapsed={isCollapsed} />
          </div>
        </div>
      </aside>
    </>
  )
}
