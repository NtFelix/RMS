"use client"

import { useState, useEffect } from "react"
import { LogOut, Settings, FileText, Check } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { m } from "framer-motion"
import { trackLogout } from "@/lib/posthog-auth-events"
import { getMyOrganisationsAction, switchOrganisationAction } from "@/app/organisation-actions"
import { useToast } from "@/hooks/use-toast"

const layoutTransition = {
  type: "spring",
  stiffness: 400,
  damping: 38,
  mass: 0.8
} as const;

const triggerVariants = {
  expanded: {
    width: "100%",
    borderRadius: "24px", // rounded-2xl
    paddingLeft: "14px",
    paddingRight: "14px",
    paddingTop: "12px",
    paddingBottom: "12px",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 38,
      mass: 0.8
    }
  },
  collapsed: {
    width: "40px",
    borderRadius: "9999px", // rounded-full
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 38,
      mass: 0.8
    }
  }
} as const;


import { useUserProfile } from "@/hooks/use-user-profile"
import { useApartmentUsage } from "@/hooks/use-apartment-usage"
import { useModalStore } from "@/hooks/use-modal-store"
import { ARIA_LABELS } from "@/lib/accessibility-constants"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
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
  const { toast } = useToast()
  const router = useRouter()
  const [isLoadingLogout, setIsLoadingLogout] = useState(false)
  const supabase = createClient()
  const { openTemplatesModal } = useModalStore()
  const templateModalEnabled = useFeatureFlagEnabled('template-modal-enabled')

  interface OrganisationItem {
    organisation_id: string;
    owner_id: string;
    rolle: 'owner' | 'admin' | 'mitarbeiter';
    name: string;
  }

  const [organisations, setOrganisations] = useState<OrganisationItem[]>([])
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false)

  useEffect(() => {
    const loadOrganisations = async () => {
      try {
        const res = await getMyOrganisationsAction()
        if (res.success && res.data) {
          setOrganisations(res.data)
          setCurrentOrgId(res.currentOrgId ?? null)
          sessionStorage.setItem("cached_organisations:v1", JSON.stringify({
            orgs: res.data,
            currentOrgId: res.currentOrgId
          }))
        }
      } catch (e) {
        console.error("Failed to load organisations:", e)
      }
    }

    const cached = sessionStorage.getItem("cached_organisations:v1")
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        setOrganisations(parsed.orgs)
        if (parsed.currentOrgId !== undefined) {
          setCurrentOrgId(parsed.currentOrgId ?? null)
        }
      } catch {
        sessionStorage.removeItem("cached_organisations:v1")
      }
    }

    loadOrganisations()
  }, [])

  const handleSwitchOrg = async (orgId: string | null) => {
    if (orgId === currentOrgId) return;
    setIsSwitchingOrg(true);
    try {
      const res = await switchOrganisationAction(orgId);
      if (res.success) {
        window.location.reload();
      } else {
        console.error("Failed to switch organisation:", res.error?.message);
        toast({
          variant: "destructive",
          title: "Fehler beim Wechseln",
          description: res.error?.message || "Die Organisation konnte nicht gewechselt werden.",
        });
      }
    } catch (e) {
      console.error("Exception switching organisation:", e);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
      });
    } finally {
      setIsSwitchingOrg(false);
    }
  };


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
          <m.div
            variants={triggerVariants}
            animate={collapsed ? "collapsed" : "expanded"}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center cursor-pointer transition-colors duration-200 select-none outline-none border border-zinc-200/20 dark:border-zinc-800/30 hover:border-zinc-200/50 dark:hover:border-zinc-800/50 hover:shadow-lg dark:hover:shadow-zinc-950/20 bg-zinc-100/50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900/90 h-10 rounded-2xl"
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
            <m.div
              initial={false}
              variants={{
                expanded: {
                  opacity: 1,
                  width: "auto",
                  marginLeft: "12px",
                  display: "flex",
                  transition: {
                    type: "spring",
                    stiffness: 400,
                    damping: 38,
                    mass: 0.8
                  }
                },
                collapsed: {
                  opacity: 0,
                  width: 0,
                  marginLeft: "0px",
                  transition: {
                    type: "spring",
                    stiffness: 400,
                    damping: 38,
                    mass: 0.8
                  },
                  transitionEnd: { display: "none" }
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
            </m.div>
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
        <CustomDropdownSeparator />
        <CustomDropdownLabel className="text-xs text-gray-500 font-semibold uppercase tracking-wider px-3 py-1">
          Organisationen:
        </CustomDropdownLabel>
        <CustomDropdownItem
          onClick={() => handleSwitchOrg(null)}
          disabled={isSwitchingOrg}
          className="flex items-center cursor-pointer"
        >
          {currentOrgId === null ? (
            <Check className="mr-2 size-4 text-emerald-500 shrink-0" />
          ) : (
            <div className="mr-2 size-4 shrink-0" />
          )}
          <span className={cn(currentOrgId === null && "font-medium text-emerald-600 dark:text-emerald-400")}>
            Privat
          </span>
        </CustomDropdownItem>
        {organisations.map((org) => {
          const isActive = currentOrgId === org.organisation_id;
          const roleLabel =
            org.rolle === 'owner' ? 'Owner' :
            org.rolle === 'admin' ? 'Admin' :
            'Mitarbeiter';

          return (
            <CustomDropdownItem
              key={org.organisation_id}
              onClick={() => handleSwitchOrg(org.organisation_id)}
              disabled={isSwitchingOrg}
              className="flex items-center cursor-pointer"
            >
              {isActive ? (
                <Check className="mr-2 size-4 text-emerald-500 shrink-0" />
              ) : (
                <div className="mr-2 size-4 shrink-0" />
              )}
              <span className={cn(
                "truncate",
                isActive && "font-medium text-emerald-600 dark:text-emerald-400"
              )}>
                {org.name} <span className="text-xs text-gray-400 font-normal">({roleLabel})</span>
              </span>
            </CustomDropdownItem>
          )
        })}
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

