"use client"

import { useState } from "react"
import { LogOut, Settings, FileText, Trash2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { m } from "framer-motion"
import { trackLogout } from "@/lib/posthog-auth-events"

const layoutTransition = {
  duration: 0
} as const;

const triggerVariants = {
  expanded: {
    width: "100%",
    height: "auto",
    borderRadius: "24px", // rounded-2xl
    paddingLeft: "12px",
    paddingRight: "12px",
    paddingTop: "10px",
    paddingBottom: "10px",
    transition: { duration: 0 }
  },
  collapsed: {
    width: "40px",
    height: "40px",
    borderRadius: "9999px", // rounded-full
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
    transition: { duration: 0 }
  }
} as const;


import { useUserProfile } from "@/hooks/use-user-profile"
import { useApartmentUsage } from "@/hooks/use-apartment-usage"
import { useModalStore } from "@/hooks/use-modal-store"
import { ARIA_LABELS } from "@/lib/accessibility-constants"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { SidebarUserData } from "@/lib/server/user-data"
import {
  CustomDropdown,
  CustomDropdownItem,
  CustomDropdownLabel,
  CustomDropdownSeparator,
} from "@/components/ui/custom-dropdown"

export interface OrganisationItem {
  organisation_id: string;
  owner_id: string;
  rolle: 'owner' | 'admin' | 'mitarbeiter';
  name: string;
}

export function UserSettings({ 
  collapsed,
  initialData,
  organisations = [],
  currentOrgId = null
}: { 
  collapsed?: boolean;
  initialData: SidebarUserData;
  organisations?: OrganisationItem[];
  currentOrgId?: string | null;
}) {
  const router = useRouter()
  const [isLoadingLogout, setIsLoadingLogout] = useState(false)
  const supabase = createClient()
  const { openTemplatesModal, openTrashBinModal } = useModalStore()
  const templateModalEnabled = useFeatureFlagEnabled('template-modal-enabled')


  // Use custom hooks for data fetching
  const {
    user,
    userName,
    userInitials,
    isLoading: isLoadingUser
  } = useUserProfile(initialData)

  const activeOrg = currentOrgId ? organisations.find(o => o.organisation_id === currentOrgId) : null;
  const isOrgAdminOrOwner = currentOrgId === null 
    ? true 
    : activeOrg 
    ? (activeOrg.rolle === 'owner' || activeOrg.rolle === 'admin') 
    : (organisations.length > 0 ? false : initialData.hasOrganisationPermission);

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
          <m.div
            variants={triggerVariants}
            animate={collapsed ? "collapsed" : "expanded"}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={cn(
              "flex items-center cursor-pointer transition-colors duration-200 select-none outline-none hover:bg-hover-bg data-[state=open]:bg-hover-bg rounded-xl",
              collapsed ? "justify-center p-0" : "pl-1 pr-2 p-1 w-full justify-start"
            )}
            aria-label="User menu"
          >
            <m.div 
              layout
              transition={layoutTransition}
              className="relative shrink-0"
            >
              <Avatar className="size-10 border border-zinc-200/40 dark:border-zinc-800/40 shadow-xs">
                <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                  {isLoadingUser ? "" : userInitials}
                </AvatarFallback>
              </Avatar>
            </m.div>
            {!collapsed && (
              <m.div
                initial={false}
                animate="expanded"
                className="flex flex-col flex-1 text-left min-w-0 overflow-hidden shrink-0 ml-3"
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
              </m.div>
            )}
          </m.div>
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
        <CustomDropdownItem onClick={() => router.push('/einstellungen/profil')}>
          <Settings className="mr-2 size-4" />
          <span>Einstellungen</span>
        </CustomDropdownItem>
        {isOrgAdminOrOwner && (
          <CustomDropdownItem onClick={() => openTrashBinModal()}>
            <Trash2 className="mr-2 size-4" />
            <span>Papierkorb</span>
          </CustomDropdownItem>
        )}
        <CustomDropdownSeparator />
        <CustomDropdownItem
          onClick={handleLogout}
          disabled={isLoadingLogout}
        >
          <LogOut className="mr-2 size-4" />
          <span>{isLoadingLogout ? "Wird abgemeldet..." : "Abmelden"}</span>
        </CustomDropdownItem>
      </CustomDropdown>
    </>
  )
}

