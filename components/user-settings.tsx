"use client"

"use client"

import { useState } from "react" // Re-add useState for modal state
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LogOut, Settings } from "lucide-react" // Re-add Settings icon
import { cn } from "@/lib/utils"
import { useLogout } from "@/hooks/use-logout"
import { SettingsModal } from "@/components/settings-modal" // Re-add SettingsModal import

export function UserSettings() {
  const { handleLogout, isLoading: isLogoutLoading } = useLogout(); // Renamed isLoading to avoid conflict
  const [openSettingsModal, setOpenSettingsModal] = useState(false); // State for SettingsModal

  // TODO: Replace "PM" with dynamic user initials or a generic user icon if available
  const userInitials = "PM";

  // This component will now expect to be part of a larger clickable area
  // defined in the parent (DashboardSidebar). The Button here can be simplified
  // or DashboardSidebar can pass down props to style this specific part.
  // For now, let's assume the trigger itself will be handled by the parent,
  // and this component just defines the dropdown content and the visual "PM" circle.
  // The actual <DropdownMenuTrigger> will be in DashboardSidebar.

  return (
    <>
      {/* The visual avatar part is now rendered by DashboardSidebar within the trigger. */}
      {/* UserSettings now only provides the DropdownMenuContent and SettingsModal. */}
      <DropdownMenuContent align="end" className="w-56 ml-4">
        <DropdownMenuLabel>Mein Konto</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setOpenSettingsModal(true)}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Einstellungen</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleLogout()} disabled={isLogoutLoading}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLogoutLoading ? "Wird abgemeldet..." : "Abmelden"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* SettingsModal is now controlled here again */}
      <SettingsModal open={openSettingsModal} onOpenChange={setOpenSettingsModal} />
    </>
  )
}
