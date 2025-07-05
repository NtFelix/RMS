"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button" // Keep Button if used for styling the trigger area
import { LogOut, Settings } from "lucide-react" // User icon removed as PM is used
import { SettingsModal } from "@/components/settings-modal"
import { cn } from "@/lib/utils" // For conditional classnames

export function UserSettings() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [openModal, setOpenModal] = useState(false)

  const handleLogout = () => {
    setIsLoading(true)
    const supabase = createClient()
    supabase.auth.signOut().then(() => {
      router.push("/auth/login")
    }).catch((error) => {
      console.error("Error signing out:", error)
      setIsLoading(false) // Reset loading state on error
    })
  }

  // TODO: Replace "PM" with dynamic user initials or a generic user icon if available
  const userInitials = "PM";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className={cn(
              "flex items-center p-2 rounded-md cursor-pointer transition-colors hover:bg-muted",
              // Add any other classes for layout or spacing if needed, e.g., space-x-2 if there's text next to the circle
            )}
          >
            {/* This is the circular button part */}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <span className="text-xs font-medium">{userInitials}</span>
            </div>
            {/* Optionally, add user name or other info here, which will also be part of the clickable trigger */}
            {/* <span className="ml-2 text-sm font-medium">User Name</span> */}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 ml-4">
          <DropdownMenuLabel>Mein Konto</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpenModal(true)}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Einstellungen</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} disabled={isLoading}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isLoading ? "Wird abgemeldet..." : "Abmelden"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsModal open={openModal} onOpenChange={setOpenModal} />
    </>
  )
}
