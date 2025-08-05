"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare, Menu, X, CreditCard } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserSettings } from "@/components/user-settings"
import { createClient } from "@/utils/supabase/client"

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
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  // Removed supabase client and useEffect for userEmail as it's handled by UserSettings

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
        <div className="h-full w-full flex flex-col bg-background border-r border-border">
          <div className="border-b px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="w-6 h-6 rounded-full overflow-hidden">
                <img 
                  src="https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/favicon.png" 
                  alt="IV Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span>Property Manager</span>
            </Link>
          </div>
          <ScrollArea className="flex-1 py-4">
            <nav className="grid gap-1 px-2">
              {sidebarNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-white",
                    pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              ))}
            </nav>
          </ScrollArea>
          <div className="mt-auto border-t p-4">
            {/* The UserSettings component itself is now the sole display for user info in this area */}
            <UserSettings />
          </div>
        </div>
      </aside>
    </>
  )
}
