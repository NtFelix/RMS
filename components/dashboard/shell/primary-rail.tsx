"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Bell } from "lucide-react"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { LOGO_URL, POSTHOG_FEATURE_FLAGS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { SidebarNavItemType } from "@/components/dashboard/sidebar-nav-config"
import {
  DASHBOARD_RAIL_CLASS,
  DASHBOARD_RAIL_ITEM_CLASS,
  DASHBOARD_RAIL_NAV_ITEM_CLASS,
  DASHBOARD_RAIL_NAV_LABEL_CLASS,
  DASHBOARD_RAIL_NAV_TILE_CLASS,
} from "@/components/dashboard/dashboard-layout-classes"
import {
  NOTIFICATIONS_POPOVER_CLASS,
  NotificationsPopoverBody,
  OrganisationMenuItems,
  getActiveOrganisationLabel,
  getNavItemId,
  handleNavItemClick,
  useOrganisationSwitch,
  useSidebarFeatureFlags,
  useSidebarOrganisations,
  useVisibleNavGroups,
} from "@/components/dashboard/sidebar-shared"
import { UserSettings, type OrganisationItem } from "@/components/common/user-settings"
import { CustomDropdown } from "@/components/ui/custom-dropdown"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSidebarActiveState } from "@/hooks/use-active-state-manager"
import { useCommandMenu } from "@/hooks/use-command-menu"
import type { SidebarUserData } from "@/lib/server/user-data"

const ACTIVE_ITEM_CLASS = "bg-primary/10 text-primary dark:bg-primary/40 dark:text-primary-foreground"
const INACTIVE_ITEM_CLASS = "text-muted-foreground hover:bg-primary/5 hover:text-foreground dark:hover:bg-accent/15"
// Navigation tile: the colours sit on the tile around the icon, the hover is triggered by the whole entry (label too)
const INACTIVE_TILE_CLASS = "text-muted-foreground group-hover:bg-foreground/[0.07] group-hover:text-foreground"

/** Global navigation as a narrow icon rail without container: organisation, navigation groups, utilities. */
export function PrimaryRail({ sidebarData }: { sidebarData: SidebarUserData }) {
  const { isRouteActive } = useSidebarActiveState()
  const { setOpen: setCommandMenuOpen } = useCommandMenu()
  const featureFlags = useSidebarFeatureFlags()
  const navGroups = useVisibleNavGroups(featureFlags, sidebarData)
  const { organisations, currentOrgId } = useSidebarOrganisations(sidebarData.user?.id)
  const notificationCenterEnabled = useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.NOTIFICATION_CENTER)

  return (
    <TooltipProvider delayDuration={100} skipDelayDuration={300}>
      <aside className={DASHBOARD_RAIL_CLASS}>
        <OrganisationSwitcher
          organisations={organisations}
          currentOrgId={currentOrgId}
          userId={sidebarData.user?.id}
        />

        <nav
          aria-label="Hauptnavigation"
          className="mt-2 flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Eine durchgehende Liste ohne Gruppen; die Beschriftung unter dem Icon ersetzt Tooltips und Gruppentitel */}
          <div className="flex flex-col items-center gap-0.5">
            {navGroups
              .flatMap((group) => group.items)
              .map((item) => (
                <RailLink
                  key={item.href}
                  item={item}
                  isActive={isRouteActive(item.href)}
                  openCommandMenu={setCommandMenuOpen}
                />
              ))}
          </div>
        </nav>

        <div className="flex w-full shrink-0 flex-col items-center gap-1 pt-2">
          {notificationCenterEnabled && <NotificationsButton />}
          <UserSettings collapsed initialData={sidebarData} organisations={organisations} currentOrgId={currentOrgId} />
        </div>
      </aside>
    </TooltipProvider>
  )
}

function RailLink({
  item,
  isActive,
  openCommandMenu,
}: {
  item: SidebarNavItemType
  isActive: boolean
  openCommandMenu: (open: boolean) => void
}) {
  return (
    <Link
      href={item.href}
      id={getNavItemId(item.href)}
      title={item.title}
      aria-current={isActive ? "page" : undefined}
      data-active={isActive}
      onClick={(e) => handleNavItemClick(e, item.href, openCommandMenu)}
      className={cn(DASHBOARD_RAIL_NAV_ITEM_CLASS, "cursor-pointer active:scale-95")}
    >
      <span
        data-slot="rail-tile"
        className={cn(
          DASHBOARD_RAIL_NAV_TILE_CLASS,
          // Colour changes are animated for the hover only: a transition on the active state made the previous entry
          // fade out (and the new one fade in) after a navigation, which looked like both being active for a moment.
          !isActive && "transition-colors duration-200",
          isActive ? ACTIVE_ITEM_CLASS : INACTIVE_TILE_CLASS,
        )}
      >
        <item.icon className="size-5 shrink-0" aria-hidden="true" />
      </span>
      <span
        className={cn(
          DASHBOARD_RAIL_NAV_LABEL_CLASS,
          isActive
            ? "font-semibold text-foreground"
            : "font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground",
        )}
      >
        {item.title}
      </span>
    </Link>
  )
}

function OrganisationSwitcher({
  organisations,
  currentOrgId,
  userId,
}: {
  organisations: OrganisationItem[]
  currentOrgId: string | null
  userId?: string
}) {
  const { switchOrganisation, isSwitching } = useOrganisationSwitch(currentOrgId, userId)
  const { name, subtitle } = getActiveOrganisationLabel(organisations, currentOrgId)

  return (
    <CustomDropdown
      align="start"
      className="w-60"
      trigger={
        <button
          type="button"
          aria-label="Organisation menu"
          title={`${name} (${subtitle}), Organisationen wechseln`}
          data-org-switcher-trigger
          className={cn(
            DASHBOARD_RAIL_ITEM_CLASS,
            "cursor-pointer outline-none transition-colors hover:bg-hover-bg data-[state=open]:bg-hover-bg",
          )}
        >
          <span className="relative size-8 shrink-0 overflow-hidden rounded-lg shadow-2xs">
            <Image src={LOGO_URL} alt="Mietevo Logo" fill className="rounded-lg object-cover" sizes="32px" unoptimized />
          </span>
        </button>
      }
    >
      <OrganisationMenuItems
        organisations={organisations}
        currentOrgId={currentOrgId}
        disabled={isSwitching}
        onSwitch={switchOrganisation}
      />
    </CustomDropdown>
  )
}

function NotificationsButton() {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Benachrichtigungen öffnen"
              className={cn(
                DASHBOARD_RAIL_ITEM_CLASS,
                "cursor-pointer transition-colors active:scale-95",
                open ? ACTIVE_ITEM_CLASS : INACTIVE_ITEM_CLASS,
              )}
            >
              <Bell className="size-5" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          Benachrichtigungen
        </TooltipContent>
      </Tooltip>
      <PopoverContent side="right" align="end" sideOffset={12} className={NOTIFICATIONS_POPOVER_CLASS}>
        <NotificationsPopoverBody onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}
