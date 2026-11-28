"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Bell, Check } from "lucide-react"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { POSTHOG_FEATURE_FLAGS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  sidebarNavGroups,
  SIDEBAR_MODULE_MAP,
  type SidebarNavGroupType,
} from "@/components/dashboard/sidebar-nav-config"
import type { OrganisationItem } from "@/components/common/user-settings"
import type { SidebarUserData } from "@/lib/server/user-data"
import { getMyOrganisationsAction, switchOrganisationAction } from "@/app/organisation-actions"
import { useToast } from "@/hooks/use-toast"
import {
  CustomDropdownItem,
  CustomDropdownLabel,
  CustomDropdownSeparator,
} from "@/components/ui/custom-dropdown"
import { getRoleLabel } from "@/components/dashboard/sidebar-utils"

// Logic shared by the global navigation of the dashboard: the icon rail (PrimaryRail) and the classic sidebar
// (DashboardSidebar) show the same entries, organisations and notifications.

export function useSidebarFeatureFlags(): Map<string, boolean> {
  const documentsEnabled = useFeatureFlagEnabled("documents_tab_access")
  const mailsEnabled = useFeatureFlagEnabled("mails-tab")
  const agentBuilderEnabled = useFeatureFlagEnabled("mietevo-agent-builder")
  const kontakteEnabled = useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.KONTAKTE_SEITE)

  return useMemo(
    () =>
      new Map([
        ["/dateien", !!documentsEnabled],
        ["/mails", !!mailsEnabled],
        ["/agenten", !!agentBuilderEnabled],
        ["/kontakte", kontakteEnabled === true],
      ]),
    [documentsEnabled, mailsEnabled, agentBuilderEnabled, kontakteEnabled],
  )
}

// Navigation groups without the entries hidden by feature flag, organisation setting or module permission.
// Groups that end up empty are dropped.
export function useVisibleNavGroups(
  featureFlags: Map<string, boolean>,
  sidebarData: Pick<SidebarUserData, "isOrganisationHidden" | "modulePermissions">,
): SidebarNavGroupType[] {
  const { isOrganisationHidden, modulePermissions } = sidebarData

  return useMemo(
    () =>
      sidebarNavGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => {
            if (featureFlags.has(item.href) && !featureFlags.get(item.href)) return false
            if (item.href === "/organisation" && isOrganisationHidden) return false
            const requiredModule = SIDEBAR_MODULE_MAP[item.href]
            if (requiredModule && modulePermissions !== null && !modulePermissions.has(requiredModule)) return false
            return true
          }),
        }))
        .filter((group) => group.items.length > 0),
    [featureFlags, isOrganisationHidden, modulePermissions],
  )
}

function organisationsCacheKey(userId?: string) {
  return userId ? `cached_organisations:${userId}` : "cached_organisations:v1"
}

// Organisations of the user and the active one: first from the session cache, then from the server.
export function useSidebarOrganisations(userId?: string) {
  const [state, setState] = useState<{ organisations: OrganisationItem[]; currentOrgId: string | null }>({
    organisations: [],
    currentOrgId: null,
  })

  useEffect(() => {
    let ignore = false
    const cacheKey = organisationsCacheKey(userId)

    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        setState({ organisations: parsed.orgs || [], currentOrgId: parsed.currentOrgId ?? null })
      } catch {
        sessionStorage.removeItem(cacheKey)
      }
    }

    getMyOrganisationsAction()
      .then((res) => {
        if (!ignore && res.success && res.data) {
          setState({ organisations: res.data, currentOrgId: res.currentOrgId ?? null })
          sessionStorage.setItem(cacheKey, JSON.stringify({ orgs: res.data, currentOrgId: res.currentOrgId }))
        }
      })
      .catch((e) => {
        if (!ignore) console.error("Failed to load organisations:", e)
      })

    return () => {
      ignore = true
    }
  }, [userId])

  return state
}

export function useOrganisationSwitch(currentOrgId: string | null, userId?: string) {
  const { toast } = useToast()
  const [isSwitching, setIsSwitching] = useState(false)

  const switchOrganisation = async (orgId: string | null) => {
    if (orgId === currentOrgId) return
    setIsSwitching(true)
    try {
      const res = await switchOrganisationAction(orgId)
      if (res.success) {
        // Clear the cached organisations under the user-specific key to prevent a stale flash on reload
        sessionStorage.removeItem(organisationsCacheKey(userId))
        window.location.reload()
      } else {
        console.error("Failed to switch organisation:", res.error?.message)
        toast({
          variant: "destructive",
          title: "Fehler beim Wechseln",
          description: "Die Organisation konnte nicht gewechselt werden. Bitte versuche es später erneut.",
        })
      }
    } catch (e) {
      console.error("Exception switching organisation:", e)
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
      })
    } finally {
      setIsSwitching(false)
    }
  }

  return { switchOrganisation, isSwitching }
}

// Content of the organisation dropdown (inside a CustomDropdown).
export function OrganisationMenuItems({
  organisations,
  currentOrgId,
  disabled,
  onSwitch,
}: {
  organisations: OrganisationItem[]
  currentOrgId: string | null
  disabled: boolean
  onSwitch: (orgId: string | null) => void
}) {
  return (
    <>
      <CustomDropdownLabel className="text-xs text-gray-500 font-semibold uppercase tracking-wider px-3 py-1">
        Organisationen:
      </CustomDropdownLabel>
      <CustomDropdownSeparator />
      <OrganisationMenuItem
        name="Privat"
        subtitle="Persönlicher Bereich"
        isActive={currentOrgId === null}
        disabled={disabled}
        onSelect={() => onSwitch(null)}
      />
      {organisations.map((org) => (
        <OrganisationMenuItem
          key={org.organisation_id}
          name={org.name}
          subtitle={getRoleLabel(org.rolle)}
          isActive={currentOrgId === org.organisation_id}
          disabled={disabled}
          onSelect={() => onSwitch(org.organisation_id)}
        />
      ))}
    </>
  )
}

function OrganisationMenuItem({
  name,
  subtitle,
  isActive,
  disabled,
  onSelect,
}: {
  name: string
  subtitle: string
  isActive: boolean
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <CustomDropdownItem onClick={onSelect} disabled={disabled} className="flex items-center cursor-pointer">
      {isActive ? <Check className="mr-2 size-4 text-primary shrink-0" /> : <div className="mr-2 size-4 shrink-0" />}
      <div className="flex flex-col text-left min-w-0">
        <span className={cn("truncate font-semibold text-sm leading-snug", isActive && "text-primary font-bold")}>
          {name}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight">{subtitle}</span>
      </div>
    </CustomDropdownItem>
  )
}

// Content of the notifications popover (inside a PopoverContent).
export function NotificationsPopoverBody({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Benachrichtigungen</h3>
        <span className="text-[10px] font-semibold bg-red-500/10 text-red-500 dark:text-red-400 px-2 py-0.5 rounded-full">0 Neu</span>
      </div>
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="size-12 rounded-full bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center border border-zinc-100 dark:border-zinc-800/50 mb-3 shadow-inner">
          <Bell className="size-5 text-zinc-400 dark:text-zinc-500" />
        </div>
        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Alles erledigt!</h4>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-[200px] leading-relaxed">
          Du bist auf dem neuesten Stand. Hier zeigen wir dir wichtige Updates zu deinen Immobilien.
        </p>
      </div>
      <div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
        <Link
          href="/settings/notifications"
          onClick={onNavigate}
          className="flex items-center justify-center w-full py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-200"
        >
          Einstellungen öffnen
        </Link>
      </div>
    </div>
  )
}

export const NOTIFICATIONS_POPOVER_CLASS =
  "w-80 p-4 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl shadow-xl z-50 animate-in fade-in-50 slide-in-from-left-4 duration-300"
