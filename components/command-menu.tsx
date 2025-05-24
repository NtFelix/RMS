"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { BarChart3, Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare } from "lucide-react"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { useModalStore } from "@/hooks/use-modal-store" // Added

// Stelle sicher, dass der Mieter-Link im Command-Menü korrekt ist
const navigationItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: BarChart3,
  },
  {
    title: "Häuser",
    href: "/haeuser",
    icon: Building2,
  },
  {
    title: "Mieter",
    href: "/mieter",
    icon: Users,
  },
  {
    title: "Wohnungen",
    href: "/wohnungen",
    icon: Home,
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

export function CommandMenu() {
  const router = useRouter()
  const { open, setOpen } = useCommandMenu()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [setOpen])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => {
                router.push(item.href)
                setOpen(false)
              }}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Aktionen">
          <CommandItem
            onSelect={() => {
              setOpen(false)
              // Use modal store to open tenant modal for adding
              useModalStore.getState().openTenantModal()
            }}
          >
            <Users className="mr-2 h-4 w-4" />
            Neuen Mieter hinzufügen
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false)
              // Use modal store to open house modal for adding
              useModalStore.getState().openHouseModal()
            }}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Haus hinzufügen
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false)
              // Use modal store to open finance modal for adding
              useModalStore.getState().openFinanceModal()
            }}
          >
            <Wallet className="mr-2 h-4 w-4" />
            Neue Rechnung erstellen
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
