"use client"

import * as React from "react"
import {
  Cloud,
  CreditCard,
  Github,
  Keyboard,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  PlusCircle,
  Settings,
  User,
  UserPlus,
  Users,
  Bot,
  Calculator,
  Landmark,
  Gavel,
  GitMerge,
  ChevronDown
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const dropdownItems = [
    { name: "Mieteingangs-Monitoring", icon: Landmark, href: "#finance-showcase" },
    { name: "Automatisierte Nebenkostenabrechnung", icon: Calculator, href: "#nebenkosten" },
    { name: "Digitales Forderungsmanagement", icon: Gavel, href: "#features" },
    { name: "Schnittstellen zu Banken & Software", icon: GitMerge, href: "#features" },
    { name: "KI-Assistent & Automatisierungen", icon: Bot, href: "#features" },
    { name: "Kommunikation & Mieterportal", icon: MessageSquare, href: "#features" },
]

export function ProdukteDropdown() {
  const handleNavClick = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 transition-all duration-300 flex items-center space-x-2">
            <span>Produkte</span>
            <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuGroup>
        {dropdownItems.map((item) => (
            <DropdownMenuItem key={item.name} onClick={() => handleNavClick(item.href)}>
                {item.icon && <item.icon className="w-4 h-4 mr-2" />}
                <span>{item.name}</span>
            </DropdownMenuItem>
        ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
