"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, Bell, ChevronDown } from "lucide-react"
import { LazyMotion, domAnimation, m, Variants } from "framer-motion"
import { LOGO_URL, ROUTES, POSTHOG_FEATURE_FLAGS, TABLET_BREAKPOINT } from "@/lib/constants"
import type { SidebarNavItemType } from "@/components/dashboard/sidebar-nav-config"
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
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UserSettings, type OrganisationItem } from "@/components/common/user-settings"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useSidebarActiveState } from "@/hooks/use-active-state-manager"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { SidebarUserData } from "@/lib/server/user-data"
import { useSidebarStore } from "@/hooks/use-sidebar-store"
import { useMediaQuery } from "@/hooks/use-media-query"
import { CustomDropdown } from "@/components/ui/custom-dropdown"


const layoutTransition = {
  duration: 0
} as const;

const MotionLink = m(Link);

// Animation variants
const textVariants: Variants = {
  expanded: {
    opacity: 1,
    width: "auto",
    marginLeft: "12px",
    display: "block",
    transition: { duration: 0 }
  },
  collapsed: {
    opacity: 0,
    width: 0,
    marginLeft: "0px",
    transition: { duration: 0 },
    transitionEnd: { display: "none" }
  }
};

const iconVariants: Variants = {
  expanded: {
    scale: 1,
    transition: { duration: 0 }
  },
  collapsed: {
    scale: 1.1,
    transition: { duration: 0 }
  }
};

const linkVariants: Variants = {
  expanded: {
    width: "100%",
    borderRadius: "20px", // rounded-xl
    transition: { duration: 0 }
  },
  collapsed: {
    width: "40px",
    borderRadius: "9999px", // rounded-full
    transition: { duration: 0 }
  }
};

const logoVariants: Variants = {
  expanded: {
    width: "100%",
    height: "40px",
    borderRadius: "20px", // rounded-xl
    transition: { duration: 0 }
  },
  collapsed: {
    width: "40px",
    height: "40px",
    borderRadius: "9999px", // rounded-full
    transition: { duration: 0 }
  }
};

export function DashboardSidebar({ sidebarData }: { sidebarData: SidebarUserData }) {
  const [isOpen, setIsOpen] = useState(false)
  const { preference } = useSidebarStore()
  const isResponsiveCollapsed = useMediaQuery(TABLET_BREAKPOINT)
  
  const isCollapsed = isResponsiveCollapsed || preference === 'collapsed'
  const { isRouteActive, getActiveStateClasses } = useSidebarActiveState()
  const { setOpen } = useCommandMenu()
  const featureFlags = useSidebarFeatureFlags()
  const { organisations, currentOrgId } = useSidebarOrganisations(sidebarData.user?.id)

  return (
    <LazyMotion features={domAnimation}>
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-40 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Backdrop */}
      <button
        type="button"
        aria-label="Menü schließen"
        aria-hidden={!isOpen}
        tabIndex={isOpen ? 0 : -1}
        className={cn(
          "fixed inset-0 z-30 bg-background/80 backdrop-blur-xs transition-opacity duration-100 md:hidden border-none cursor-default",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault()
            setIsOpen(false)
          }
        }}
      />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col z-30 h-screen sticky top-0 py-0 w-full overflow-visible">
        <div className="hidden md:flex flex-col h-full w-full overflow-visible">
          <SidebarContent
            isCollapsed={isCollapsed}
            setOpen={setOpen}
            featureFlags={featureFlags}
            isRouteActive={isRouteActive}
            getActiveStateClasses={getActiveStateClasses}
            isMobile={false}
            setIsOpen={setIsOpen}
            sidebarData={sidebarData}
            organisations={organisations}
            currentOrgId={currentOrgId}
          />
        </div>
      </aside>

      {/* Mobile Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-49 flex flex-col bg-background border-r transition-transform duration-300 ease-in-out w-72 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          isCollapsed={false}
          setOpen={setOpen}
          featureFlags={featureFlags}
          isRouteActive={isRouteActive}
          getActiveStateClasses={getActiveStateClasses}
          isMobile={true}
          setIsOpen={setIsOpen}
          sidebarData={sidebarData}
          organisations={organisations}
          currentOrgId={currentOrgId}
        />
      </aside>
    </LazyMotion>
  )
}

interface SidebarContentProps {
  isCollapsed: boolean
  setOpen: (open: boolean) => void
  featureFlags: Map<string, boolean>
  isRouteActive: (href: string) => boolean
  getActiveStateClasses: (href: string) => string
  isMobile: boolean
  setIsOpen: (open: boolean) => void
  sidebarData: SidebarUserData
  organisations: OrganisationItem[]
  currentOrgId: string | null
}

function SidebarContent({
  isCollapsed,
  setOpen,
  featureFlags,
  isRouteActive,
  getActiveStateClasses,
  isMobile,
  setIsOpen,
  sidebarData,
  organisations,
  currentOrgId
}: SidebarContentProps) {
  const notificationCenterFeatureEnabled = useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.NOTIFICATION_CENTER)

  const visibleNavGroups = useVisibleNavGroups(featureFlags, sidebarData)
  const visibleNavItems = useMemo(() => visibleNavGroups.flatMap((group) => group.items), [visibleNavGroups])

  return (
    <TooltipProvider delayDuration={100} skipDelayDuration={300}>
      <div className="h-full w-full flex flex-col relative m-0 p-2.5 overflow-visible">
        {/* Header / Brand Logo */}
        <SidebarHeader
          isCollapsed={isCollapsed}
          isMobile={isMobile}
          organisations={organisations}
          currentOrgId={currentOrgId}
          userId={sidebarData.user?.id}
        />

        <div className={cn(
          "flex-1 overflow-y-auto min-h-0 custom-scrollbar",
          isCollapsed && !isMobile ? "flex flex-col items-center px-0 py-1.5" : "p-1.5"
        )}>
          <nav className={cn(
            "grid gap-1.5 w-full",
            isCollapsed && !isMobile ? "justify-items-center" : ""
          )}>
            {visibleNavItems.map((item) => (
              <SidebarNavLink
                key={item.href}
                item={item}
                isCollapsed={isCollapsed}
                isMobile={isMobile}
                setOpen={setOpen}
                setIsOpen={setIsOpen}
                isRouteActive={isRouteActive}
                getActiveStateClasses={getActiveStateClasses}
              />
            ))}
          </nav>
        </div>

        {/* Popover Actions */}
        <SidebarActions
          isCollapsed={isCollapsed}
          notificationCenterFeatureEnabled={!!notificationCenterFeatureEnabled}
        />
        
        {/* User profile / settings */}
        <div className={cn(
          "pt-2.5 pb-2.5 flex flex-col gap-2 border-t border-border shrink-0 overflow-visible",
          isCollapsed && !isMobile ? "items-center justify-center px-0" : "px-1.5"
        )}>
          <UserSettings 
            collapsed={isCollapsed && !isMobile} 
            initialData={sidebarData}
            organisations={organisations}
            currentOrgId={currentOrgId}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}

// Brand Logo & Header Subcomponent
function SidebarHeader({
  isCollapsed,
  isMobile,
  organisations,
  currentOrgId,
  userId
}: {
  isCollapsed: boolean
  isMobile: boolean
  organisations: OrganisationItem[]
  currentOrgId: string | null
  userId?: string
}) {
  const { switchOrganisation, isSwitching } = useOrganisationSwitch(currentOrgId, userId)
  const { name: activeName, subtitle: activeSubtitle } = getActiveOrganisationLabel(organisations, currentOrgId)

  const triggerPill = (
    <m.div 
      variants={logoVariants}
      animate={isCollapsed && !isMobile ? "collapsed" : "expanded"}
      aria-label="Organisation menu"
      data-org-switcher-trigger
      className={cn(
        "flex items-center gap-2.5 rounded-xl hover:bg-hover-bg data-[state=open]:bg-hover-bg transition-colors duration-200 group/logo select-none min-h-[40px] cursor-pointer outline-none",
        isCollapsed && !isMobile ? "justify-center p-1 w-10 h-10" : "w-full pl-1 pr-2 p-1 justify-start"
      )}
      title={isCollapsed && !isMobile ? "Organisationen wechseln" : undefined}
    >
      <m.div 
        layout={false}
        className="relative size-8 min-w-8 min-h-8 rounded-lg overflow-hidden shadow-2xs shrink-0 flex items-center justify-center"
      >
        {/* Logo Image */}
        <div className="absolute inset-0 transition-opacity duration-200">
          <Image
            src={LOGO_URL}
            alt="Mietevo Logo"
            fill
            className="object-cover rounded-lg"
            sizes="32px"
            unoptimized
          />
        </div>
      </m.div>

      {!isMobile && !isCollapsed && (
        <div className="flex flex-col flex-1 min-w-0 text-left overflow-hidden">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
              {activeName}
            </span>
            <ChevronDown className="size-3.5 text-zinc-400 shrink-0" />
          </div>
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate leading-tight">
            {activeSubtitle}
          </span>
        </div>
      )}
      {isMobile && (
        <div className="flex flex-col flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
              {activeName}
            </span>
            <ChevronDown className="size-3.5 text-zinc-400 shrink-0" />
          </div>
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate leading-tight">
            {activeSubtitle}
          </span>
        </div>
      )}
    </m.div>
  );

  return (
    <div className={cn(
      "flex items-center justify-between gap-2 w-full mb-2.5 pt-0 pb-1.5 shrink-0",
      isCollapsed && !isMobile ? "justify-center px-0" : "px-1.5"
    )}>
      {/* Organisation Switcher Dropdown */}
      <CustomDropdown
        align="start"
        className="w-60"
        trigger={triggerPill}
      >
        <OrganisationMenuItems
          organisations={organisations}
          currentOrgId={currentOrgId}
          disabled={isSwitching}
          onSwitch={switchOrganisation}
        />
      </CustomDropdown>
    </div>
  )
}

const getIconClassName = (href: string) => {
  const base = "size-4 min-w-4 transition-transform duration-300 ease-out group-hover:scale-120";
  switch (href) {
    case ROUTES.HOME:
      return `${base} group-hover:-translate-y-0.5`;
    case ROUTES.SEARCH:
      return `${base} group-hover:translate-x-0.5 group-hover:-translate-y-0.5`;
    case "/organisation":
    case "/haeuser":
      return `${base} group-hover:rotate-3`;
    case "/wohnungen":
      return `${base} group-hover:-translate-y-0.5 group-hover:rotate-2`;
    case "/mieter":
      return `${base} group-hover:rotate-2`;
    case "/finanzen":
      return `${base} group-hover:rotate-6`;
    case "/betriebskosten":
      return `${base} group-hover:-rotate-3`;
    case "/todos":
      return `${base} group-hover:rotate-3`;
    case "/dateien":
      return `${base} group-hover:-translate-y-0.5`;
    case "/mails":
      return `${base} group-hover:-rotate-6`;
    default:
      return `${base} group-hover:rotate-3`;
  }
};

function SidebarNavLink({
  item,
  isCollapsed,
  isMobile,
  setOpen,
  setIsOpen,
  isRouteActive,
  getActiveStateClasses
}: {
  item: SidebarNavItemType
  isCollapsed: boolean
  isMobile: boolean
  setOpen: (open: boolean) => void
  setIsOpen: (open: boolean) => void
  isRouteActive: (href: string) => boolean
  getActiveStateClasses: (href: string) => string
}) {
  const isActive = isRouteActive(item.href);

  const safeId = getNavItemId(item.href)

  const link = (
    <MotionLink
      variants={linkVariants}
      animate={isCollapsed && !isMobile ? "collapsed" : "expanded"}
      href={item.href}
      id={safeId}
      onClick={(e) => {
        if (handleNavItemClick(e, item.href, setOpen)) setIsOpen(false)
      }}
      className={cn(
        // Colour changes are animated for the hover only: a transition on the active state made the previous entry fade out
        // (and the new one fade in) over 200ms, which looked like both being active for a moment after a navigation.
        "group flex items-center h-10 text-sm font-medium data-[active=false]:hover:transition-colors data-[active=false]:hover:duration-200 relative cursor-pointer active:scale-98 hover:z-10 rounded-xl isolate",
        isCollapsed && !isMobile ? "w-10 h-10 justify-center items-center px-0 mx-auto" : "w-full px-3 justify-start",
        !isActive && "hover:bg-accent/10 dark:hover:bg-accent/15",
        getActiveStateClasses(item.href),
      )}
      data-active={isActive}
      aria-current={isActive ? "page" : undefined}
    >
      {!isMobile ? (
        <m.div
          layout
          transition={layoutTransition}
          variants={iconVariants}
          animate={isCollapsed && !isMobile ? "collapsed" : "expanded"}
          className="shrink-0"
        >
          <item.icon className={getIconClassName(item.href)} />
        </m.div>
      ) : (
        <item.icon className={cn(getIconClassName(item.href), "shrink-0")} />
      )}
      {!isMobile && !isCollapsed && (
        <m.span
          variants={textVariants}
          animate="expanded"
          className="whitespace-nowrap truncate flex-1 overflow-hidden"
        >
          {item.title}
        </m.span>
      )}
      {isMobile && (
        <span className="truncate flex-1 ml-3 overflow-hidden">
          {item.title}
        </span>
      )}
    </MotionLink>
  );

  if (isCollapsed && !isMobile) {
    return (
      <div className="flex flex-col">
        <Tooltip>
          <TooltipTrigger asChild>
            {link}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.title}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {link}
    </div>
  );
}

// Bottom Popover Actions Subcomponent (Notifications)
function SidebarActions({
  isCollapsed,
  notificationCenterFeatureEnabled
}: {
  isCollapsed: boolean
  notificationCenterFeatureEnabled: boolean
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  if (!notificationCenterFeatureEnabled) return null;

  return (
    <div 
      className={cn(
        "flex flex-col gap-1 w-full pb-2 shrink-0 transition-colors duration-200",
        isCollapsed ? "items-center px-0" : "px-1.5"
      )}
    >
      {/* Notifications Popover */}
      <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "relative flex size-10 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer active:scale-95 group",
                    "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50",
                    "hover:bg-accent/10 dark:hover:bg-accent/15",
                    notificationsOpen && "bg-accent/15 text-zinc-950 dark:text-zinc-50 font-semibold"
                  )}
                  aria-label="Benachrichtigungen öffnen"
                >
                  <Bell className="size-4.5 transition-transform duration-200 group-hover:scale-105" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Benachrichtigungen
            </TooltipContent>
          </Tooltip>
        ) : (
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "group flex items-center justify-between w-full h-10 px-3 rounded-xl transition-all duration-200 cursor-pointer select-none active:scale-[0.99]",
                "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50",
                "hover:bg-accent/10 dark:hover:bg-accent/15",
                notificationsOpen && "bg-accent/15 text-zinc-950 dark:text-zinc-50 font-medium"
              )}
              aria-label="Benachrichtigungen öffnen"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Bell className="size-4.5 shrink-0 text-zinc-500 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100 transition-colors" />
                <span className="truncate text-sm font-medium">Benachrichtigungen</span>
              </div>
            </button>
          </PopoverTrigger>
        )}
        <PopoverContent side="right" align="end" sideOffset={12} className={NOTIFICATIONS_POPOVER_CLASS}>
          <NotificationsPopoverBody onNavigate={() => setNotificationsOpen(false)} />
        </PopoverContent>
      </Popover>
    </div>
  )
}

