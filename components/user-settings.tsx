"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Settings, FileText } from "lucide-react"
import { useFeatureFlagEnabled } from "posthog-js/react"

import { useUserProfile } from "@/hooks/use-user-profile"
import { useApartmentUsage } from "@/hooks/use-apartment-usage"
import { useModalStore } from "@/hooks/use-modal-store"
import { ARIA_LABELS } from "@/lib/accessibility-constants"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { SettingsModal } from "@/components/settings-modal"
import {
  CustomDropdown,
  CustomDropdownItem,
  CustomDropdownLabel,
  CustomDropdownSeparator,
} from "@/components/ui/custom-dropdown"

export function UserSettings() {
  const router = useRouter()
  const [isLoadingLogout, setIsLoadingLogout] = useState(false)
  const [openModal, setOpenModal] = useState(false)
  const { openTemplatesModal } = useModalStore()
  const templateModalEnabled = useFeatureFlagEnabled('template-modal-enabled')
  
  // Use custom hooks for data fetching
  const { 
    user, 
    userName, 
    userEmail, 
    userInitials, 
    isLoading: isLoadingUser 
  } = useUserProfile()
  
  const { 
    count: apartmentCount, 
    limit: apartmentLimit, 
    progressPercentage,
    isLoading: isLoadingApartmentData 
  } = useApartmentUsage(user)

  const handleLogout = async () => {
    setIsLoadingLogout(true)
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error(`Logout failed with status: ${response.status}`)
      }
      
      // Clear any client-side auth state
      const clearResponse = await fetch('/api/auth/clear-auth-cookie', { 
        method: 'POST' 
      })
      
      if (!clearResponse.ok) {
        console.warn("Failed to clear auth cookie:", await clearResponse.text())
      }
      
      // Redirect to login page
      router.push("/auth/login")
      router.refresh() // Ensure the page updates with the new auth state
    } catch (error) {
      console.error("Error signing out:", error)
      // Don't prevent logout even if there's an error
      router.push("/auth/login")
      router.refresh()
    } finally {
      setIsLoadingLogout(false)
    }
  }

  return (
    <>
      <CustomDropdown
        align="end"
        className="w-56"
        trigger={
          <div
            className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white hover:text-gray-900 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md dark:hover:bg-gray-800 dark:hover:text-gray-100"
            aria-label="User menu"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={"/placeholder-user.jpg"} alt={userName} />
              <AvatarFallback className="bg-accent text-accent-foreground">
                {isLoadingUser ? "" : userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 text-left min-w-0">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {isLoadingUser ? "Lade..." : userName}
              </span>
              {!isLoadingUser && !isLoadingApartmentData && apartmentLimit !== null && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{apartmentCount} / {apartmentLimit} Wohnungen</span>
                  </div>
                  <Progress 
                    value={progressPercentage} 
                    className="h-1.5 bg-gray-200 dark:bg-gray-700 [&>div]:bg-accent" 
                  />
                </div>
              )}
              {!isLoadingUser && !isLoadingApartmentData && apartmentLimit === null && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Unbegrenzte Wohnungen
                </span>
              )}
              {(isLoadingUser || isLoadingApartmentData) && (
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1.5 w-full">
                  <div className="h-full bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse w-1/2"></div>
                </div>
              )}
            </div>
          </div>
        }
      >
        <CustomDropdownLabel>Mein Konto</CustomDropdownLabel>
        <CustomDropdownSeparator />
        {templateModalEnabled && (
          <CustomDropdownItem 
            onClick={() => openTemplatesModal()}
            aria-label={ARIA_LABELS.templatesModal}
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>Vorlagen</span>
          </CustomDropdownItem>
        )}
        <CustomDropdownItem onClick={() => setOpenModal(true)}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Einstellungen</span>
        </CustomDropdownItem>
        <CustomDropdownSeparator />
        <CustomDropdownItem 
          onClick={handleLogout} 
          disabled={isLoadingLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoadingLogout ? "Wird abgemeldet..." : "Abmelden"}</span>
        </CustomDropdownItem>
      </CustomDropdown>
      <SettingsModal open={openModal} onOpenChange={setOpenModal} />
    </>
  )
}
