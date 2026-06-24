"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Tab } from "@/types/settings"

interface SettingsSidebarProps {
  tabs: Omit<Tab, 'content'>[]
}

export function SettingsSidebar({ tabs }: SettingsSidebarProps) {
  const pathname = usePathname()
  const activeTab = useMemo(() => {
    const segments = pathname.split("/")
    const index = segments.indexOf("einstellungen")
    return index !== -1 && segments[index + 1] ? segments[index + 1] : ""
  }, [pathname])
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTabs = useMemo(
    () =>
      tabs.filter((tab) =>
        tab.label.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [tabs, searchQuery],
  )

  return (
    <nav className="flex flex-col bg-white dark:bg-[#181818] relative border border-border/50 rounded-2xl shadow-xs w-56">
      {/* Search */}
      <div className="relative z-10 p-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            aria-label="Einstellungen durchsuchen"
            placeholder="Suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full h-9 rounded-lg pl-8 pr-3 text-sm",
              "bg-muted/50 border border-border/50",
              "placeholder:text-muted-foreground/60",
              "focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent",
            )}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="relative flex-1 pb-3 px-2 overflow-y-auto">
        <div className="space-y-0.5">
          {filteredTabs.map((tab) => {
            const isActive = activeTab === tab.value
            return (
              <Link
                key={tab.value}
                href={`/einstellungen/${tab.value}`}
                className={cn(
                  "flex items-center gap-2.5 w-full h-9 rounded-lg px-2.5 text-sm font-medium no-underline transition-all duration-150 active:scale-[0.98]",
                  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-hover-bg hover:text-foreground",
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </Link>
            )
          })}
        </div>

        {searchQuery && filteredTabs.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-6">
            Keine Ergebnisse
          </p>
        )}
      </div>
    </nav>
  )
}
