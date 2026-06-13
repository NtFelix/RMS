"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Settings, FileText } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { cn } from "@/lib/utils"
// react-doctor-disable-next-line react-doctor/use-lazy-motion
import { motion } from "framer-motion"
import { trackLogout } from "@/lib/posthog-auth-events"

import { useUserProfile } from "@/hooks/use-user-profile"
import { useApartmentUsage } from "@/hooks/use-apartment-usage"
import { useModalStore } from "@/hooks/use-modal-store"
import { ARIA_LABELS } from "@/lib/accessibility-constants"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { SettingsModal } from "@/components/modals/settings-modal"
import { SidebarUserData } from "@/lib/server/user-data"
import {
  CustomDropdown,
  CustomDropdownItem,
  CustomDropdownLabel,
  CustomDropdownSeparator,
} from "@/components/ui/custom-dropdown"

export function UserSettings({ 
  collapsed,
  initialData 
}: { 
  collapsed?: boolean;
  initialData: SidebarUserData;
}) {
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
  } = useUserProfile(initialData)

  const {
    count: apartmentCount,
    limit: apartmentLimit,
    progressPercentage,
    isLoading: isLoadingApartmentData
  } = useApartmentUsage(user, {
    count: initialData.apartmentCount,
    limit: initialData.apartmentLimit
  })

  const handleLogout = async () => {
    setIsLoadingLogout(true)

    // Track logout (GDPR-compliant - checks consent internally)
    trackLogout()

    try {
      // First sign out from Supabase
      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        console.warn("Supabase sign out warning:", signOutError)
      }

      // Perform cleanup API calls
      // We use allSettled to ensure we wait for them to finish (success or fail)
      // before navigating away, which prevents ECONNRESET on the server
      await Promise.allSettled([
        fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'same-origin'
        }),
        fetch('/api/auth/clear-auth-cookie', {
          method: 'POST',
          credentials: 'same-origin'
        })
      ]);

    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Reset loading state
      setIsLoadingLogout(false);

      // Redirect to home
      window.location.replace('/');
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
              "flex items-center cursor-pointer transition-all duration-300 select-none outline-none border border-zinc-200/20 dark:border-zinc-800/30 hover:border-zinc-200/50 dark:hover:border-zinc-800/50 hover:shadow-lg dark:hover:shadow-zinc-950/20 w-full overflow-hidden",
              collapsed 
                ? "justify-center rounded-xl px-0 py-1 bg-zinc-100/50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900/90 h-12" 
                : "px-3 py-2.5 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/40 hover:bg-white/80 dark:hover:bg-zinc-900/70"
            )}
            aria-label="User menu"
          >
            <div className="relative shrink-0">
              <Avatar className="size-10 border border-zinc-200/40 dark:border-zinc-800/40 shadow-xs">
                <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                  {isLoadingUser ? "" : userInitials}
                </AvatarFallback>
              </Avatar>
            </div>
            <motion.div
              initial={false}
              variants={{
                expanded: {
                  opacity: 1,
                  width: "auto",
                  marginLeft: "12px",
                  display: "flex",
                  transition: { duration: 0.2 }
                },
                collapsed: {
                  opacity: 0,
                  width: 0,
                  marginLeft: "0px",
                  transitionEnd: { display: "none" },
                  transition: { duration: 0.2 }
                }
              }}
              animate={collapsed ? "collapsed" : "expanded"}
              className="flex flex-col flex-1 text-left min-w-0 overflow-hidden shrink-0"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {isLoadingUser ? "Lade..." : userName}
              </span>
              {!isLoadingUser && !isLoadingApartmentData && apartmentLimit !== null && apartmentLimit !== Infinity && (
                <div className="flex flex-col gap-1 mt-1 w-full">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="truncate">{apartmentCount} / {apartmentLimit} Wohnungen</span>
                  </div>
                  <Progress
                    value={progressPercentage}
                    className="h-1.5 bg-gray-200 dark:bg-gray-700 [&>div]:bg-accent"
                  />
                </div>
              )}
              {!isLoadingUser && !isLoadingApartmentData && (apartmentLimit === null || apartmentLimit === Infinity) && (
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Unbegrenzte Wohnungen
                </span>
              )}
              {(isLoadingUser || isLoadingApartmentData) && (
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1.5 w-full">
                  <div className="h-full bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse w-1/2"></div>
                </div>
              )}
            </motion.div>
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
            <FileText className="mr-2 size-4" aria-hidden="true" />
            <span>Vorlagen</span>
          </CustomDropdownItem>
        )}
        <CustomDropdownItem onClick={() => setOpenModal(true)}>
          <Settings className="mr-2 size-4" />
          <span>Einstellungen</span>
        </CustomDropdownItem>
        <CustomDropdownSeparator />
        <CustomDropdownItem
          onClick={handleLogout}
          disabled={isLoadingLogout}
        >
          <LogOut className="mr-2 size-4" />
          <span>{isLoadingLogout ? "Wird abgemeldet..." : "Abmelden"}</span>
        </CustomDropdownItem>
      </CustomDropdown>
      <SettingsModal open={openModal} onOpenChange={setOpenModal} />
    </>
  )
}

