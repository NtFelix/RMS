"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { BarChart3, Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare, Menu, X, CreditCard, Folder } from "lucide-react"
import { LOGO_URL } from "@/lib/constants"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserSettings } from "@/components/user-settings"
import { createClient } from "@/utils/supabase/client"
import { useSidebarActiveState } from "@/hooks/use-active-state-manager"
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
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { isRouteActive, getActiveStateClasses } = useSidebarActiveState()
  // Removed supabase client and useEffect for userEmail as it's handled by UserSettings
  const documentsEnabled = true; // Temporarily hardcode to test infinite re-render fix

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
          "fixed inset-y-0 left-0 z-[49] flex w-72 flex-col transition-transform md:sticky md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-full w-full flex flex-col bg-background border-r border-border dark:sidebar-container">
          <div className="border-b px-6 py-4 dark:sidebar-header">
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
          </div>
          <ScrollArea className="flex-1 pt-4 pb-4">
            <nav className="grid gap-1 px-2 pr-4">
              {sidebarNavItems.map((item) => {
                const isActive = isRouteActive(item.href)
                const isDocuments = item.href === '/dateien'
                const hidden = isDocuments && !documentsEnabled
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 mr-2 text-sm font-medium transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-accent hover:text-white hover:ml-2 hover:mr-0 hover:shadow-lg hover:shadow-accent/20",
                      getActiveStateClasses(item.href),
                      hidden && "invisible pointer-events-none",
                    )}
                    data-active={isActive}
                    aria-current={isActive ? "page" : undefined}
                    aria-hidden={hidden || undefined}
                    tabIndex={hidden ? -1 : undefined}
                  >
                    <item.icon className="h-4 w-4 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-125 group-hover:rotate-3" />
                    <span className="transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:font-semibold group-hover:tracking-wide">
                      {item.title}
                    </span>
                  </Link>
                )
              })}
            </nav>
          </ScrollArea>
          <div className="mt-auto border-t p-4 pb-6 dark:sidebar-footer">
            {/* The UserSettings component itself is now the sole display for user info in this area */}
            <UserSettings />
          </div>
        </div>
      </aside>
    </>
  )
}
