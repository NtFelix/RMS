"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Settings, FileText } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { trackLogout } from "@/lib/posthog-auth-events"

import { useUserProfile } from "@/hooks/use-user-profile"
import { useApartmentUsage } from "@/hooks/use-apartment-usage"
import { useModalStore } from "@/hooks/use-modal-store"
import { ARIA_LABELS } from "@/lib/accessibility-constants"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { SettingsModal } from "@/components/modals/settings-modal"
import {
  CustomDropdown,
  CustomDropdownItem,
  CustomDropdownLabel,
  CustomDropdownSeparator,
} from "@/components/ui/custom-dropdown"

export function UserSettings({ collapsed }: { collapsed?: boolean }) {
  const router = useRouter()
  const [isLoadingLogout, setIsLoadingLogout] = useState(false)
  const supabase = createClient()
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

    // Track logout (GDPR-compliant - checks consent internally)
    trackLogout()

    try {
      // First sign out from Supabase
      const { error: signOutError } = await supabase.auth.signOut()

      // We'll continue with the logout flow even if there's a sign out error
      if (signOutError) {
        console.warn("Supabase sign out warning:", signOutError)
      }

      // Create an array to hold all cleanup promises
      const cleanupPromises = [];

      // Add logout API call to promises
      cleanupPromises.push(
        fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'same-origin'
        }).catch(error => {
          if (error.name !== 'AbortError') {
            console.warn("Logout API error:", error);
          }
        })
      );

      // Add clear cookie call to promises
      cleanupPromises.push(
        fetch('/api/auth/clear-auth-cookie', {
          method: 'POST',
          credentials: 'same-origin'
        }).catch(error => {
          if (error.name !== 'AbortError') {
            console.warn("Clear cookie error:", error);
          }
        })
      );

      // Wait for all cleanup operations to complete or timeout
      await Promise.race([
        Promise.all(cleanupPromises),
        new Promise(resolve => setTimeout(resolve, 2000)) // 2 second timeout
      ]);

    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Reset loading state first
      setIsLoadingLogout(false);

      // Force a hard redirect to ensure we leave the current page
      // This is more reliable than router.push for logout scenarios
      window.location.href = '/';
    }
  }

  return (
    <>
      <CustomDropdown
        align={collapsed ? "start" : "end"}
        className="w-56"
        trigger={
          <div
            className={cn(
              "flex items-center hover:bg-white hover:text-gray-900 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md dark:hover:bg-gray-800 dark:hover:text-gray-100",
              collapsed ? "justify-center rounded-full p-0 h-10 w-10 mx-auto" : "space-x-3 px-3 py-2 rounded-xl"
            )}
            aria-label="User menu"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={"/placeholder-user.jpg"} alt={userName} />
              <AvatarFallback className="bg-accent text-accent-foreground">
                {isLoadingUser ? "" : userInitials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col flex-1 text-left min-w-0 overflow-hidden"
              >
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
              </motion.div>
            )}
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
