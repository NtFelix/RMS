"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { 
  BarChart3, Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare, 
  Menu, X, Folder, Mail, Search, PanelLeft, MessageCircle, Bell, Network
} from "lucide-react"
import { LazyMotion, domAnimation, m, Variants } from "framer-motion"
import { LOGO_URL, ROUTES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UserSettings } from "@/components/common/user-settings"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useSidebarActiveState } from "@/hooks/use-active-state-manager"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { useOnboardingStore } from "@/hooks/use-onboarding-store"
import { SidebarUserData } from "@/lib/server/user-data"
import { useSidebarStore } from "@/hooks/use-sidebar-store"
import { POSTHOG_FEATURE_FLAGS } from "@/lib/constants"

type SidebarNavItemType = {
  title: string;
  href: string;
  icon: React.ElementType;
};

type SidebarNavGroupType = {
  label: string;
  items: SidebarNavItemType[];
};

const sidebarNavGroups: SidebarNavGroupType[] = [
  {
    label: "Allgemein",
    items: [
      {
        title: "Dashboard",
        href: ROUTES.HOME,
        icon: BarChart3,
      },
      {
        title: "Suche",
        href: ROUTES.SEARCH,
        icon: Search,
      },
      {
        title: "Organisationen",
        href: "/organisation",
        icon: Network,
      },
    ]
  },
  {
    label: "Objekte",
    items: [
      {
        title: "Häuser",
        href: "/haeuser",
        icon: Building2,
      },
      {
        title: "Wohnungen",
        href: "/wohnungen",
        icon: Home,
      },
      {
        title: "Mieter",
        href: "/mieter",
        icon: Users,
      },
    ]
  },
  {
    label: "Finanzen",
    items: [
      {
        title: "Finanzen",
        href: "/finanzen",
        icon: Wallet,
      },
      {
        title: "Betriebskosten",
        href: "/betriebskosten",
        icon: FileSpreadsheet,
      },
    ]
  },
  {
    label: "Tools",
    items: [
      {
        title: "Aufgaben",
        href: "/todos",
        icon: CheckSquare,
      },
      {
        title: "Dokumente",
        href: "/dateien",
        icon: Folder,
      },
      {
        title: "E-Mails",
        href: "/mails",
        icon: Mail,
      },
    ]
  }
];

const SIDEBAR_MODULE_MAP: Record<string, string> = {
  '/haeuser': 'haeuser',
  '/wohnungen': 'wohnungen',
  '/mieter': 'mieter',
  '/finanzen': 'finanzen',
  '/betriebskosten': 'betriebskosten',
  '/todos': 'aufgaben',
  '/dateien': 'dokumente',
  '/organisation': 'organisation',
};

const layoutTransition = {
  type: "spring",
  stiffness: 400,
  damping: 38,
  mass: 0.8
} as const;

const MotionLink = m(Link);

// Animation variants
const textVariants: Variants = {
  expanded: {
    opacity: 1,
    width: "auto",
    marginLeft: "12px",
    display: "block",
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
    transitionEnd: {
      display: "none"
    }
  }
};

const iconVariants: Variants = {
  expanded: {
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.2, 0.8, 0.2, 1]
    }
  },
  collapsed: {
    scale: 1.1,
    transition: {
      duration: 0.2,
      ease: [0.2, 0.8, 0.2, 1]
    }
  }
};

const linkVariants: Variants = {
  expanded: {
    width: "100%",
    borderRadius: "20px", // rounded-xl
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
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 38,
      mass: 0.8
    }
  }
};

const logoVariants: Variants = {
  expanded: {
    width: "100%",
    borderRadius: "20px", // rounded-xl
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
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 38,
      mass: 0.8
    }
  }
};

export function DashboardSidebar({ sidebarData }: { sidebarData: SidebarUserData }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { preference, setPreference } = useSidebarStore()
  const [isResponsiveCollapsed, setIsResponsiveCollapsed] = useState(() => 
    typeof window !== "undefined" ? window.matchMedia('(max-width: 1023px)').matches : false
  )
  
  const isCollapsed = isResponsiveCollapsed || preference === 'collapsed'
  const { isRouteActive, getActiveStateClasses } = useSidebarActiveState()
  const { setOpen } = useCommandMenu()
  const documentsEnabled = useFeatureFlagEnabled('documents_tab_access')
  const mailsEnabled = useFeatureFlagEnabled('mails-tab')

  const featureFlags = useMemo(() => new Map([
    ['/dateien', !!documentsEnabled],
    ['/mails', !!mailsEnabled],
  ]), [documentsEnabled, mailsEnabled]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsResponsiveCollapsed(e.matches);
    };
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [])

  const toggleCollapse = () => {
    if (preference === 'expanded') {
      setPreference('collapsed');
    } else if (preference === 'collapsed') {
      setPreference('expanded');
    } else {
      setPreference(isCollapsed ? 'expanded' : 'collapsed');
    }
  }

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
      <div
        className={cn(
          "fixed inset-0 z-30 bg-background/80 backdrop-blur-xs transition-all duration-100 md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col z-30 h-screen sticky top-0 py-4 w-full overflow-visible">
        <div className="hidden md:flex flex-col h-full w-full overflow-visible">
          <SidebarContent
            isCollapsed={isCollapsed}
            pathname={pathname}
            setOpen={setOpen}
            featureFlags={featureFlags}
            isRouteActive={isRouteActive}
            getActiveStateClasses={getActiveStateClasses}
            isMobile={false}
            setIsOpen={setIsOpen}
            toggleCollapse={toggleCollapse}
            sidebarData={sidebarData}
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
          pathname={pathname}
          setOpen={setOpen}
          featureFlags={featureFlags}
          isRouteActive={isRouteActive}
          getActiveStateClasses={getActiveStateClasses}
          isMobile={true}
          setIsOpen={setIsOpen}
          sidebarData={sidebarData}
        />
      </aside>
    </LazyMotion>
  )
}

interface SidebarContentProps {
  isCollapsed: boolean
  pathname: string
  setOpen: (open: boolean) => void
  featureFlags: Map<string, boolean>
  isRouteActive: (href: string) => boolean
  getActiveStateClasses: (href: string) => string
  isMobile: boolean
  setIsOpen: (open: boolean) => void
  toggleCollapse?: () => void
  sidebarData: SidebarUserData
}

function SidebarContent({
  isCollapsed,
  pathname,
  setOpen,
  featureFlags,
  isRouteActive,
  getActiveStateClasses,
  isMobile,
  setIsOpen,
  toggleCollapse,
  sidebarData
}: SidebarContentProps) {
  const supportButtonEnabled = useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.SUPPORT_BUTTON)
  const notificationCenterFeatureEnabled = useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.NOTIFICATION_CENTER)

  // Combined loop iteration (flatMap/filter optimized into a single pass using reduce)
  const visibleNavItems = useMemo(() => {
    return sidebarNavGroups.reduce<SidebarNavItemType[]>((acc, group) => {
      for (const item of group.items) {
        if (featureFlags.has(item.href) && !featureFlags.get(item.href)) {
          continue;
        }
        if (item.href === '/organisation' && sidebarData.isOrganisationHidden) {
          continue;
        }
        const requiredModule = SIDEBAR_MODULE_MAP[item.href];
        if (requiredModule && sidebarData.modulePermissions !== null) {
          if (!sidebarData.modulePermissions.has(requiredModule)) {
            continue;
          }
        }
        acc.push(item);
      }
      return acc;
    }, []);
  }, [featureFlags, sidebarData.isOrganisationHidden, sidebarData.modulePermissions]);

  return (
    <div className="h-full w-full flex flex-col relative pl-4 pr-4 md:pr-0 overflow-visible">
      {/* Header / Brand Logo */}
      <SidebarHeader
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        toggleCollapse={toggleCollapse}
        setIsOpen={setIsOpen}
      />

      <div className="flex-1 overflow-y-auto min-h-0 py-2 custom-scrollbar">
        <nav className="grid gap-1">
          <TooltipProvider delayDuration={100} skipDelayDuration={300}>
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
          </TooltipProvider>
        </nav>
      </div>

      {/* Popover Actions */}
      <SidebarActions
        isCollapsed={isCollapsed}
        supportButtonEnabled={!!supportButtonEnabled}
        notificationCenterFeatureEnabled={!!notificationCenterFeatureEnabled}
      />
      
      {/* User profile / settings */}
      <div className="pt-2 pb-4 md:pb-0 flex flex-col gap-2 border-t border-border shrink-0 overflow-visible">
        <UserSettings collapsed={isCollapsed && !isMobile} initialData={sidebarData} />
      </div>
    </div>
  )
}

// Brand Logo & Collapse Toggle Subcomponent
function SidebarHeader({
  isCollapsed,
  isMobile,
  toggleCollapse,
  setIsOpen
}: {
  isCollapsed: boolean
  isMobile: boolean
  toggleCollapse?: () => void
  setIsOpen: (open: boolean) => void
}) {
  return (
    <div className="flex items-center h-14 justify-between w-full pb-4 relative overflow-hidden shrink-0">
      <div className="flex items-center overflow-hidden flex-1 min-w-0">
        <MotionLink 
          variants={logoVariants}
          animate={isCollapsed && !isMobile ? "collapsed" : "expanded"}
          href="/"
          onClick={(e) => {
            if (isCollapsed && !isMobile) {
              e.preventDefault();
              toggleCollapse?.();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (isCollapsed && !isMobile) {
                e.preventDefault();
                toggleCollapse?.();
              }
            }
          }}
          role={isCollapsed && !isMobile ? "button" : undefined}
          tabIndex={isCollapsed && !isMobile ? 0 : undefined}
          className="flex items-center font-semibold overflow-hidden group/logo relative select-none shrink-0 cursor-pointer pl-1 transition-colors duration-200 gap-3 rounded-xl"
          title={isCollapsed && !isMobile ? "Menü ausklappen" : undefined}
        >
          <m.div 
            layout
            transition={layoutTransition}
            className="relative size-8 min-w-8 rounded-full overflow-hidden shadow-xs shrink-0 flex items-center justify-center"
          >
            {/* Logo Image */}
            <div className={cn(
              "absolute inset-0 transition-[opacity,transform] duration-300",
              isCollapsed && !isMobile ? "group-hover/logo:opacity-0 group-hover/logo:scale-90" : ""
            )}>
              <Image
                src={LOGO_URL}
                alt="IV Logo"
                fill
                className="object-cover rounded-full"
                sizes="32px"
                unoptimized
              />
            </div>
            {/* Hover Collapse Icon (only when collapsed) */}
            {isCollapsed && !isMobile && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 group-hover/logo:scale-100 group-hover/logo:opacity-100 transition-[opacity,transform] duration-300 pointer-events-none">
                <PanelLeft className="size-5 text-zinc-900 dark:text-zinc-50" />
              </div>
            )}
          </m.div>
          {!isMobile && (
            <m.span
              variants={textVariants}
              animate={isCollapsed && !isMobile ? "collapsed" : "expanded"}
              className="text-lg whitespace-nowrap overflow-hidden font-bold"
            >
              Mietevo
            </m.span>
          )}
          {isMobile && <span className="text-lg font-bold">Mietevo</span>}
        </MotionLink>
      </div>

      {!isMobile && (
        <m.button
          variants={{
            expanded: {
              opacity: 1,
              scale: 1,
              display: "flex",
              transition: {
                duration: 0.2,
                ease: [0.2, 0.8, 0.2, 1]
              }
            },
            collapsed: {
              opacity: 0,
              scale: 0.8,
              transition: {
                duration: 0.15,
                ease: [0.2, 0.8, 0.2, 1]
              },
              transitionEnd: { display: "none" }
            }
          }}
          animate={isCollapsed ? "collapsed" : "expanded"}
          onClick={toggleCollapse}
          type="button"
          className="flex items-center justify-center rounded-xl size-10 text-zinc-500 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors duration-200 shrink-0 z-50 focus:outline-none cursor-pointer hover:scale-105 active:scale-95"
          title="Menü einklappen"
        >
          <PanelLeft className="size-5" />
        </m.button>
      )}
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

  // Generate safe hypenated HTML IDs instead of raw slashes
  const safeId = `sidebar-nav-${item.href.replace(/^\//, '').replace(/\//g, '-') || 'home'}`;

  const link = (
    <MotionLink
      variants={linkVariants}
      animate={isCollapsed && !isMobile ? "collapsed" : "expanded"}
      href={item.href}
      id={safeId}
      onClick={(e) => {
        if (item.href === ROUTES.SEARCH) {
          e.preventDefault();
          setOpen(true);
          return;
        }
        setIsOpen(false)
        if (item.href === ROUTES.HOME) {
          useOnboardingStore.getState().completeStep('overview-open')
        }
      }}
      className={cn(
        "group flex items-center h-10 text-sm font-medium transition-colors duration-200 relative cursor-pointer active:scale-98 hover:z-10 px-3 justify-start rounded-xl isolate",
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
      {!isMobile && (
        <m.span
          variants={textVariants}
          animate={isCollapsed && !isMobile ? "collapsed" : "expanded"}
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

// Bottom Popover Actions Subcomponent
function SidebarActions({
  isCollapsed,
  supportButtonEnabled,
  notificationCenterFeatureEnabled
}: {
  isCollapsed: boolean
  supportButtonEnabled: boolean
  notificationCenterFeatureEnabled: boolean
}) {
  const [supportOpen, setSupportOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  if (!supportButtonEnabled && !notificationCenterFeatureEnabled) return null;

  return (
    <m.div 
      layout
      transition={layoutTransition}
      className={cn(
        "flex gap-3 w-full pb-4 shrink-0 transition-colors duration-200",
        isCollapsed ? "flex-col items-start" : "flex-row justify-start"
      )}
    >
      {/* Support Popover */}
      {supportButtonEnabled && (
        <Popover open={supportOpen} onOpenChange={setSupportOpen}>
          <PopoverTrigger asChild>
            <m.button 
              layout
              transition={layoutTransition}
              type="button"
              className={cn(
                "relative flex items-center justify-center rounded-2xl transition-colors duration-200 hover:scale-105 active:scale-95 group cursor-pointer",
                isCollapsed ? "size-10" : "size-11",
                "bg-white dark:bg-[#181818] hover:bg-zinc-50 dark:hover:bg-zinc-900/60",
                "border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:shadow-xs animate-in fade-in zoom-in-95 duration-300"
              )}
            >
              <MessageCircle className="size-5 transition-transform duration-200 group-hover:scale-110" />
            </m.button>
          </PopoverTrigger>
          <PopoverContent 
            side="right" 
            align="end" 
            sideOffset={12} 
            className="w-80 p-4 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl shadow-xl z-50 animate-in fade-in-50 slide-in-from-left-4 duration-300"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Support</h3>
                <span className="text-[10px] font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded-full">0 Offen</span>
              </div>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="size-12 rounded-full bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center border border-zinc-100 dark:border-zinc-800/50 mb-3 shadow-inner">
                  <MessageCircle className="size-5 text-zinc-400 dark:text-zinc-500" />
                </div>
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Keine Support-Anfragen</h4>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-[200px] leading-relaxed">
                  Sobald du Hilfe benötigst oder Fragen hast, kannst du einen neuen Support-Chat starten.
                </p>
              </div>
              <div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                <Link 
                  href="/support"
                  onClick={() => setSupportOpen(false)}
                  className="flex items-center justify-center w-full py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all duration-200"
                >
                  Support kontaktieren
                </Link>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Notifications Popover */}
      {notificationCenterFeatureEnabled && (
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <m.button 
              layout
              transition={layoutTransition}
              type="button"
              className={cn(
                "relative flex items-center justify-center rounded-2xl transition-colors duration-200 hover:scale-105 active:scale-95 group cursor-pointer",
                isCollapsed ? "size-10" : "size-11",
                "bg-white dark:bg-[#181818] hover:bg-zinc-50 dark:hover:bg-zinc-900/60",
                "border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:shadow-xs animate-in fade-in zoom-in-95 duration-300"
              )}
            >
              <Bell className="size-5 transition-transform duration-200 group-hover:scale-110" />
            </m.button>
          </PopoverTrigger>
          <PopoverContent 
            side="right" 
            align="end" 
            sideOffset={12} 
            className="w-80 p-4 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl shadow-xl z-50 animate-in fade-in-50 slide-in-from-left-4 duration-300"
          >
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
                  onClick={() => setNotificationsOpen(false)}
                  className="flex items-center justify-center w-full py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all duration-200"
                >
                  Einstellungen öffnen
                </Link>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </m.div>
  )
}
