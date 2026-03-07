"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { BarChart3, Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare, Menu, X, Folder, Mail, Search, ChevronLeft, ChevronRight, Inbox, MessageCircle, PanelLeft, ChevronDown } from "lucide-react"
import { motion, Variants } from "framer-motion"
import { LOGO_URL, ROUTES } from "@/lib/constants"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UserSettings } from "@/components/common/user-settings"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSidebarActiveState } from "@/hooks/use-active-state-manager"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { useOnboardingStore } from "@/hooks/use-onboarding-store"

type SidebarNavItemType = {
  title: string;
  href: string;
  icon: React.ElementType;
  children?: {
    title: string;
    href: string;
  }[];
};

const sidebarNavItems: SidebarNavItemType[] = [
  {
    title: "Dashboard",
    href: ROUTES.HOME,
    icon: BarChart3,
  },
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
    children: [
      {
        title: "Übersicht",
        href: "/mieter",
      },
      {
        title: "Bewerber",
        href: "#bewerber",
      }
    ]
  },
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

export function DashboardSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'inbox'>('home')
  const { isRouteActive, getActiveStateClasses } = useSidebarActiveState()
  const { setOpen } = useCommandMenu()
  const documentsEnabled = useFeatureFlagEnabled('documents_tab_access')
  const mailsEnabled = useFeatureFlagEnabled('mails-tab')
  const notificationCenterEnabled = useFeatureFlagEnabled('notification-center')

  // Feature flags for navigation items
  const featureFlags = new Map([
    ['/dateien', !!documentsEnabled],
    ['/mails', !!mailsEnabled],
  ]);

  // Handle responsive collapse
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');

    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsCollapsed(true);
      }
    };

    if (mediaQuery.matches) {
      setIsCollapsed(true);
    }

    mediaQuery.addEventListener('change', handleMediaChange);

    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [])

  const sidebarVariants: Variants = {
    expanded: {
      width: "18rem",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      }
    },
    collapsed: {
      width: "5rem",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      }
    }
  }

  const textVariants: Variants = {
    expanded: {
      opacity: 1,
      x: 0,
      scale: 1,
      filter: "blur(0px)",
      display: "block",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 0.5,
        delay: 0.08,
      }
    },
    collapsed: {
      opacity: 0,
      x: -12,
      scale: 0.95,
      filter: "blur(4px)",
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 0.4,
      },
      transitionEnd: {
        display: "none"
      }
    }
  }

  const iconVariants: Variants = {
    expanded: {
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      }
    },
    collapsed: {
      scale: 1.15,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        delay: 0.1,
      }
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-40 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        <span className="sr-only">Toggle menu</span>
      </Button>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-background/80 backdrop-blur-sm transition-all duration-100 md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsOpen(false)}
      />

      <motion.aside
        initial="expanded"
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        className={cn(
          "hidden md:flex flex-col z-30 ml-4 my-4 h-[calc(100vh-2rem)] sticky top-4 overflow-hidden",
        )}
        style={{
          willChange: "width, transform",
          transformOrigin: "left center",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        {/* Desktop Content */}
        <div className="hidden md:flex flex-col h-full w-full">
          <SidebarContent
            isCollapsed={isCollapsed}
            pathname={pathname}
            setOpen={setOpen}
            featureFlags={featureFlags}
            isRouteActive={isRouteActive}
            getActiveStateClasses={getActiveStateClasses}
            isMobile={false}
            setIsOpen={setIsOpen}
            toggleCollapse={() => setIsCollapsed(!isCollapsed)}
            textVariants={textVariants}
            iconVariants={iconVariants}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            notificationCenterEnabled={!!notificationCenterEnabled}
          />
        </div>
      </motion.aside>

      {/* Mobile Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[49] flex flex-col bg-background border-r transition-transform duration-300 ease-in-out w-72 md:hidden",
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
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          notificationCenterEnabled={!!notificationCenterEnabled}
        />
      </aside>
    </>
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
  textVariants?: Variants
  iconVariants?: Variants
  activeTab: 'home' | 'inbox'
  setActiveTab: (tab: 'home' | 'inbox') => void
  notificationCenterEnabled: boolean
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
  textVariants,
  iconVariants,
  activeTab,
  setActiveTab,
  notificationCenterEnabled
}: SidebarContentProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const newExpanded = { ...expandedItems };
    sidebarNavItems.forEach(item => {
      const hasActiveChild = item.children?.some(c => pathname === c.href || (c.href !== '/' && pathname.startsWith(c.href)));
      if (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)) || hasActiveChild) {
        newExpanded[item.title] = true;
      }
    });
    setExpandedItems(newExpanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleExpanded = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedItems(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };
  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Header section */}
      <div className={cn("flex items-center pb-4", isCollapsed ? "justify-center px-0" : "pl-4 pr-4 justify-between")}>
        {isCollapsed && !isMobile ? (
          <button
            onClick={toggleCollapse}
            className="group relative flex items-center justify-center w-8 h-8 rounded-full shadow-sm flex-shrink-0 focus:outline-none overflow-hidden"
            title="Menü ausklappen"
          >
            <div className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-0 bg-background">
              <Image
                src={LOGO_URL}
                alt="IV Logo"
                fill
                className="object-cover"
                sizes="32px"
                unoptimized
              />
            </div>
            <div className="absolute inset-0 bg-muted flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <PanelLeft className="h-4 w-4 text-foreground cursor-pointer" />
            </div>
          </button>
        ) : (
          <>
            <Link href="/" className="flex items-center gap-3 font-semibold overflow-hidden">
              <div className="relative w-8 h-8 min-w-[2rem] rounded-full overflow-hidden shadow-sm flex-shrink-0">
                <Image
                  src={LOGO_URL}
                  alt="IV Logo"
                  fill
                  className="object-cover"
                  sizes="32px"
                  unoptimized // Supabase images are stored as pre-optimized .avif
                />
              </div>
              {!isMobile && textVariants && (
                <motion.span
                  variants={textVariants}
                  className="text-lg whitespace-nowrap"
                >
                  Mietevo
                </motion.span>
              )}
              {isMobile && <span className="text-lg">Mietevo</span>}
            </Link>
            {!isMobile && (
              <button
                onClick={toggleCollapse}
                className="flex items-center justify-center rounded-lg w-8 h-8 text-muted-foreground hover:bg-muted transition-colors ml-auto shrink-0 z-50 focus:outline-none"
                title="Menü einklappen"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Tab Switcher & Search Row */}
      <div className={cn("px-5 pb-4 pt-1 flex items-center justify-between", isCollapsed && "flex-col justify-center gap-2")}>
        <div className={cn("flex items-center gap-1.5", isCollapsed && "flex-col")}>
          <TooltipProvider delayDuration={100}>
            {/* Home Tab */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab('home')}
                  className={cn(
                    "flex items-center justify-center rounded-full h-9 transition-all duration-300 ease-in-out relative outline-none",
                    activeTab === 'home' ? "px-3 bg-secondary text-secondary-foreground" : "w-9 px-0 text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    isCollapsed && "px-0 w-9"
                  )}
                >
                  <Home className="h-4 w-4 shrink-0 transition-transform duration-300" />
                  <div className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out flex items-center",
                    (activeTab === 'home' && !isCollapsed) ? "max-w-[100px] opacity-100 ml-1.5" : "max-w-0 opacity-0 ml-0"
                  )}>
                    <span className="font-medium text-sm whitespace-nowrap">Home</span>
                  </div>
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Home</TooltipContent>}
            </Tooltip>

            {/* Inbox Tab (Controlled by Feature Flag) */}
            {notificationCenterEnabled && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveTab('inbox')}
                    className={cn(
                      "flex items-center justify-center rounded-full h-9 transition-all duration-300 ease-in-out relative outline-none",
                      activeTab === 'inbox' ? "px-3 bg-secondary text-secondary-foreground" : "w-9 px-0 text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      isCollapsed && "px-0 w-9"
                    )}
                  >
                    <Inbox className={cn("h-4 w-4 shrink-0 transition-transform duration-300", activeTab === 'inbox' && "fill-current")} />
                    <div className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out flex items-center",
                      (activeTab === 'inbox' && !isCollapsed) ? "max-w-[100px] opacity-100 ml-1.5" : "max-w-0 opacity-0 ml-0"
                    )}>
                      <span className="font-medium text-sm whitespace-nowrap">Inbox</span>
                    </div>
                    {/* Notification Badge */}
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white z-10 border-2 border-background shadow-sm">
                      5
                    </span>
                  </button>
                </TooltipTrigger>
                {activeTab !== 'inbox' && !isCollapsed && <TooltipContent side="bottom">Inbox</TooltipContent>}
                {isCollapsed && <TooltipContent side="right">Inbox</TooltipContent>}
              </Tooltip>
            )}
          </TooltipProvider>
        </div>

        {/* Search Input Button */}
        <TooltipProvider delayDuration={100} skipDelayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setOpen(true)}
                className="flex items-center justify-center rounded-full w-9 h-9 text-muted-foreground transition-all duration-300 hover:text-foreground hover:bg-muted/50 mt-auto mb-auto shrink-0"
              >
                <Search className="h-[18px] w-[18px] shrink-0 transition-all duration-300 hover:scale-110" />
              </button>
            </TooltipTrigger>
            <TooltipContent side={isCollapsed ? "right" : "bottom"}>Suche (⌘K)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Navigation section */}
      <div className="flex-1 overflow-y-auto min-h-0 py-2 custom-scrollbar">
        {activeTab === 'inbox' ? (
          <div className="flex flex-col items-center justify-start pt-8 h-full px-5 text-center text-muted-foreground space-y-3">
            <Inbox className="h-8 w-8 opacity-20" />
            {!isCollapsed && (
              <p className="text-sm">Keine neuen Benachrichtigungen.</p>
            )}
          </div>
        ) : (
          <nav className="grid gap-1.5 px-5">
            <TooltipProvider delayDuration={100} skipDelayDuration={300}>

              {sidebarNavItems
                .filter(item => !featureFlags.has(item.href) || featureFlags.get(item.href))
                .map((item) => {
                  const isActive = isRouteActive(item.href);
                  const hasChildren = !!item.children && item.children.length > 0;
                  const isExpanded = expandedItems[item.title];

                  return (
                    <div key={item.href} className="flex flex-col">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            id={`sidebar-nav-${item.href.replace(/^\//, '')}`}
                            onClick={() => {
                              if (!hasChildren) setIsOpen(false)
                              if (item.href === ROUTES.HOME) {
                                useOnboardingStore.getState().completeStep('overview-open')
                              }
                            }}
                            className={cn(
                              "group flex items-center gap-3 rounded-xl pl-3 pr-3 h-10 text-sm font-medium transition-all duration-500 ease-out hover:bg-accent hover:text-white hover:ml-2 hover:mr-0 hover:shadow-lg hover:shadow-accent/20 mr-2 relative",
                              getActiveStateClasses(item.href),
                            )}
                            data-active={isActive}
                            aria-current={isActive ? "page" : undefined}
                          >
                            {!isMobile && iconVariants ? (
                              <motion.div
                                variants={iconVariants}
                                className="flex-shrink-0"
                              >
                                <item.icon className="h-4 w-4 min-w-[1rem] transition-all duration-300 ease-out group-hover:rotate-3" />
                              </motion.div>
                            ) : (
                              <item.icon className="h-4 w-4 min-w-[1rem] flex-shrink-0 transition-all duration-500 ease-out group-hover:scale-125 group-hover:rotate-3" />
                            )}
                            {!isMobile && textVariants && (
                              <motion.span
                                variants={textVariants}
                                className="whitespace-nowrap truncate transition-all duration-500 ease-out group-hover:font-semibold group-hover:tracking-wide flex-1"
                              >
                                {item.title}
                              </motion.span>
                            )}
                            {isMobile && (
                              <span className="truncate transition-all duration-500 ease-out group-hover:font-semibold group-hover:tracking-wide flex-1">
                                {item.title}
                              </span>
                            )}

                            {hasChildren && !isCollapsed && (
                              <button
                                onClick={(e) => toggleExpanded(item.title, e)}
                                className={cn(
                                  "ml-auto p-1 -mr-1 rounded-md opacity-80 hover:opacity-100 hover:bg-white/20 transition-transform duration-200",
                                  isExpanded ? "rotate-180" : "rotate-0"
                                )}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            )}
                          </Link>
                        </TooltipTrigger>
                        {isCollapsed && <TooltipContent side="right" className="font-medium">{item.title}</TooltipContent>}
                      </Tooltip>

                      {hasChildren && !isCollapsed && (
                        <motion.div
                          initial={false}
                          animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col relative mt-1 pb-1">
                            {item.children!.map((child, index) => {
                              const isChildActive = pathname === child.href || (pathname === item.href && child.href === item.href);
                              const isLast = index === item.children!.length - 1;

                              return (
                                <div key={child.href} className="relative flex items-center mt-1">
                                  {/* Branch Curve pointing to the item */}
                                  <div
                                    className="absolute left-[19px] w-[23px] border-l-[2px] border-b-[2px] border-zinc-300 dark:border-zinc-800 rounded-bl-[16px] bg-transparent pointer-events-none transition-colors duration-300"
                                    style={{
                                      top: index === 0 ? '-16px' : '0',
                                      height: index === 0 ? 'calc(50% + 16px)' : '50%'
                                    }}
                                  />
                                  {/* Vertical line continuing down past the curve (only if not last) */}
                                  {!isLast && (
                                    <div
                                      className="absolute left-[19px] w-[2px] bg-zinc-300 dark:bg-zinc-800 pointer-events-none transition-colors duration-300"
                                      style={{
                                        top: index === 0 ? '-16px' : '0',
                                        // Connects to the next item's top (4px bridges the mt-1 gap)
                                        bottom: '-4px'
                                      }}
                                    />
                                  )}

                                  <Link
                                    href={child.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                      "text-sm px-3 md:py-2 py-2.5 ml-[42px] mr-2 flex-1 rounded-xl transition-all duration-200 flex items-center gap-2",
                                      isChildActive
                                        ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10 font-semibold"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                                    )}
                                  >
                                    <span className="truncate">{child.title}</span>
                                  </Link>
                                </div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )
                })}
            </TooltipProvider>
          </nav>
        )}
      </div>

      {/* Profile section */}
      <div className="pt-2 pb-4 flex flex-col gap-2 px-5">
        <UserSettings collapsed={isCollapsed} />
      </div>
    </div>
  )
}
