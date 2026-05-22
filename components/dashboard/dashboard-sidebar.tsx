"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { BarChart3, Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare, Menu, X, Folder, Mail, Search, ChevronLeft, ChevronRight, Inbox, MessageCircle, PanelLeft, ChevronDown } from "lucide-react"
import { motion, Variants, AnimatePresence } from "framer-motion"
import { LOGO_URL, ROUTES } from "@/lib/constants"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UserSettings } from "@/components/common/user-settings"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSidebarActiveState } from "@/hooks/use-active-state-manager"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { useOnboardingStore } from "@/hooks/use-onboarding-store"
import { SidebarUserData } from "@/lib/server/user-data"
import { useSidebarStore } from "@/hooks/use-sidebar-store"

type SidebarNavItemType = {
  title: string;
  href: string;
  icon: React.ElementType;
  children?: {
    title: string;
    href: string;
  }[];
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

export function DashboardSidebar({ sidebarData }: { sidebarData: SidebarUserData }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { preference, setPreference, isHovered, setIsHovered } = useSidebarStore()
  const [isResponsiveCollapsed, setIsResponsiveCollapsed] = useState(false)
  
  const isCollapsed = isResponsiveCollapsed || 
                      preference === 'collapsed' || 
                      (preference === 'automatic' && !isHovered)

  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'inbox'>('home')
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
      setIsResponsiveCollapsed(e.matches);
    };

    setIsResponsiveCollapsed(mediaQuery.matches);
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
          "fixed inset-0 z-30 bg-background/80 backdrop-blur-xs transition-all duration-100 md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsOpen(false)}
      />

      <motion.aside
        initial={false}
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        onMouseEnter={() => {
          if (preference === 'automatic') {
            setIsHovered(true);
          }
        }}
        onMouseLeave={() => {
          if (preference === 'automatic') {
            setIsHovered(false);
          }
        }}
        className={cn(
          "hidden md:flex flex-col z-30 ml-4 my-4 h-[calc(100vh-2rem)] sticky top-4 overflow-hidden bg-white/75 dark:bg-zinc-950/75 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl rounded-[2.25rem] py-6",
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
            toggleCollapse={toggleCollapse}
            textVariants={textVariants}
            iconVariants={iconVariants}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            notificationCenterEnabled={!!notificationCenterEnabled}
            sidebarData={sidebarData}
          />
        </div>
      </motion.aside>

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
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          notificationCenterEnabled={!!notificationCenterEnabled}
          sidebarData={sidebarData}
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
  activeTab: 'home' | 'tasks' | 'inbox'
  setActiveTab: (tab: 'home' | 'tasks' | 'inbox') => void
  notificationCenterEnabled: boolean
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
  textVariants,
  iconVariants,
  activeTab,
  setActiveTab,
  notificationCenterEnabled,
  sidebarData
}: SidebarContentProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const newExpanded = { ...expandedItems };
    sidebarNavGroups.forEach(group => {
      group.items.forEach(item => {
        const hasActiveChild = item.children?.some(c => pathname === c.href || (c.href !== '/' && pathname.startsWith(c.href)));
        if (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)) || hasActiveChild) {
          newExpanded[item.title] = true;
        }
      });
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

  const tabIconVariants: Variants = {
    hover: { 
      scale: 1.15, 
      rotate: 8, 
      transition: { type: "spring", stiffness: 450, damping: 12 } 
    },
    tap: { 
      scale: 0.92 
    }
  };

  const headingVariants: Variants = {
    expanded: {
      opacity: 1,
      x: 0,
      scale: 1,
      display: "block",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay: 0.05,
      }
    },
    collapsed: {
      opacity: 0,
      x: -15,
      scale: 0.85,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      },
      transitionEnd: {
        display: "none"
      }
    }
  };

  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Header section */}
      <div className={cn("flex items-center pb-4", isCollapsed ? "justify-center px-0" : "pl-4 pr-4 justify-between")}>
        {isCollapsed && !isMobile ? (
          <button
            onClick={toggleCollapse}
            className="group relative flex items-center justify-center w-8 h-8 rounded-full shadow-xs shrink-0 focus:outline-none overflow-hidden cursor-pointer"
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
            <div className="absolute inset-0 bg-muted flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 cursor-pointer">
              <PanelLeft className="h-4 w-4 text-foreground" />
            </div>
          </button>
        ) : (
          <>
            <Link href="/" className="flex items-center gap-3 font-semibold overflow-hidden cursor-pointer">
              <div className="relative w-8 h-8 min-w-8 rounded-full overflow-hidden shadow-xs shrink-0">
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
                className="flex items-center justify-center rounded-lg w-8 h-8 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 ml-auto shrink-0 z-50 focus:outline-none cursor-pointer hover:scale-105 active:scale-95"
                title="Menü einklappen"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Tab Switcher & Search Row */}
      <div className={cn("px-5 pb-4 pt-1 flex items-center justify-between gap-2", isCollapsed && "flex-col justify-center gap-2")}>
        <div 
          className={cn(
            "flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 p-0.5 rounded-full relative", 
            isCollapsed && "flex-col p-1"
          )}
        >
          <TooltipProvider delayDuration={100}>
            {/* Home Tab */}
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  layout
                  onClick={() => setActiveTab('home')}
                  className={cn(
                    "flex items-center justify-start rounded-full h-8 relative outline-none cursor-pointer select-none z-0 px-2.5 transition-colors duration-300",
                    activeTab === 'home' ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                  animate={{
                    width: isCollapsed ? "2.25rem" : (activeTab === 'home' ? "6.25rem" : "2.25rem")
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                >
                  {/* Sliding Background Indicator */}
                  {activeTab === 'home' && (
                    <motion.div
                      layoutId="active-tab-pill"
                      className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  
                  <motion.div whileHover="hover" whileTap="tap" variants={tabIconVariants} className="flex items-center justify-center">
                    <Home className="h-4 w-4 shrink-0" />
                  </motion.div>
                  
                  <AnimatePresence initial={false}>
                    {activeTab === 'home' && !isCollapsed && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="overflow-hidden flex items-center whitespace-nowrap pl-1.5"
                      >
                        <span className="font-medium text-xs">
                          Home
                        </span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Home</TooltipContent>}
            </Tooltip>

            {/* Aufgaben Tab */}
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  layout
                  onClick={() => setActiveTab('tasks')}
                  className={cn(
                    "flex items-center justify-start rounded-full h-8 relative outline-none cursor-pointer select-none z-0 px-2.5 transition-colors duration-300",
                    activeTab === 'tasks' ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                  animate={{
                    width: isCollapsed ? "2.25rem" : (activeTab === 'tasks' ? "6.25rem" : "2.25rem")
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                >
                  {/* Sliding Background Indicator */}
                  {activeTab === 'tasks' && (
                    <motion.div
                      layoutId="active-tab-pill"
                      className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  
                  <motion.div whileHover="hover" whileTap="tap" variants={tabIconVariants} className="flex items-center justify-center">
                    <CheckSquare className="h-4 w-4 shrink-0" />
                  </motion.div>
                  
                  <AnimatePresence initial={false}>
                    {activeTab === 'tasks' && !isCollapsed && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="overflow-hidden flex items-center whitespace-nowrap pl-1.5"
                      >
                        <span className="font-medium text-xs">
                          Aufgaben
                        </span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Aufgaben</TooltipContent>}
            </Tooltip>

            {/* Inbox Tab (Controlled by Feature Flag) */}
            {notificationCenterEnabled && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    layout
                    onClick={() => setActiveTab('inbox')}
                    className={cn(
                      "flex items-center justify-start rounded-full h-8 relative outline-none cursor-pointer select-none z-0 px-2.5 transition-colors duration-300",
                      activeTab === 'inbox' ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
                    )}
                    animate={{
                      width: isCollapsed ? "2.25rem" : (activeTab === 'inbox' ? "6.25rem" : "2.25rem")
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  >
                    {/* Sliding Background Indicator */}
                    {activeTab === 'inbox' && (
                      <motion.div
                        layoutId="active-tab-pill"
                        className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    
                    <motion.div whileHover="hover" whileTap="tap" variants={tabIconVariants} className="flex items-center justify-center relative">
                      <Inbox className={cn("h-4 w-4 shrink-0", activeTab === 'inbox' && "fill-current")} />
                    </motion.div>
                    
                    <AnimatePresence initial={false}>
                      {activeTab === 'inbox' && !isCollapsed && (
                        <motion.span
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: "auto", opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          className="overflow-hidden flex items-center whitespace-nowrap pl-1.5"
                        >
                          <span className="font-medium text-xs">
                            Inbox
                          </span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                    
                    {/* Notification Badge */}
                    <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white z-10 border border-background shadow-xs">
                      5
                    </span>
                  </motion.button>
                </TooltipTrigger>
                {activeTab !== 'inbox' && !isCollapsed && <TooltipContent side="bottom">Inbox</TooltipContent>}
                {isCollapsed && <TooltipContent side="right">Inbox</TooltipContent>}
              </Tooltip>
            )}
          </TooltipProvider>
        </div>

        {/* Search Command Input */}
        <TooltipProvider delayDuration={100} skipDelayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                layout
                onClick={() => setOpen(true)}
                className={cn(
                  "flex items-center text-muted-foreground hover:text-foreground transition-all duration-300 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs cursor-pointer select-none outline-none overflow-hidden shrink-0",
                  isCollapsed 
                    ? "justify-center rounded-full w-8 h-8 p-0" 
                    : "flex-1 justify-between rounded-xl px-2.5 h-8 bg-zinc-50/50 dark:bg-zinc-900/30"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Search className="h-[14px] w-[14px] shrink-0" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-xs font-medium whitespace-nowrap"
                      >
                        Suche...
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.kbd
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="pointer-events-none hidden h-4.5 select-none items-center gap-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-1 font-mono text-[9px] font-medium text-muted-foreground opacity-100 sm:flex"
                    >
                      <span>⌘</span>K
                    </motion.kbd>
                  )}
                </AnimatePresence>
              </motion.button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Suche (⌘K)</TooltipContent>}
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
        ) : activeTab === 'tasks' ? (
          <div className="flex flex-col items-center justify-start pt-8 h-full px-5 text-center text-muted-foreground space-y-3">
            <CheckSquare className="h-8 w-8 opacity-20" />
            {!isCollapsed && (
              <p className="text-sm">Keine anstehenden Aufgaben.</p>
            )}
          </div>
        ) : (
          <nav className="grid gap-4 px-5">
            <TooltipProvider delayDuration={100} skipDelayDuration={300}>
              {sidebarNavGroups.map((group) => {
                const visibleItems = group.items.filter(
                  item => !featureFlags.has(item.href) || featureFlags.get(item.href)
                );

                if (visibleItems.length === 0) return null;

                return (
                  <div key={group.label} className="flex flex-col gap-1">
                    {/* Section Header */}
                    <motion.div
                      variants={headingVariants}
                      animate={isCollapsed ? "collapsed" : "expanded"}
                      className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-3 py-1 cursor-default select-none"
                    >
                      {group.label}
                    </motion.div>

                    {/* Group Items */}
                    <div className="flex flex-col gap-1">
                      {visibleItems.map((item) => {
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
                                    "group flex items-center gap-3 rounded-xl pl-3 pr-3 h-10 text-sm font-medium transition-all duration-500 ease-out hover:bg-accent hover:text-white hover:ml-2 hover:mr-0 hover:shadow-lg hover:shadow-accent/20 mr-2 relative cursor-pointer active:scale-98 hover:translate-x-0.5",
                                    getActiveStateClasses(item.href),
                                  )}
                                  data-active={isActive}
                                  aria-current={isActive ? "page" : undefined}
                                >
                                  {!isMobile && iconVariants ? (
                                    <motion.div
                                      variants={iconVariants}
                                      className="shrink-0"
                                    >
                                      <item.icon className="h-4 w-4 min-w-4 transition-all duration-300 ease-out group-hover:rotate-3" />
                                    </motion.div>
                                  ) : (
                                    <item.icon className="h-4 w-4 min-w-4 shrink-0 transition-all duration-500 ease-out group-hover:scale-115 group-hover:rotate-3" />
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
                                        "ml-auto p-1 -mr-1 rounded-md opacity-80 hover:opacity-100 hover:bg-white/20 transition-transform duration-200 cursor-pointer",
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
                                        {/* Branch Curve pointing to the item with active glow */}
                                        <div
                                          className={cn(
                                            "absolute left-[19px] w-[23px] border-l-[2px] border-b-[2px] rounded-bl-[16px] bg-transparent pointer-events-none transition-all duration-300",
                                            isChildActive
                                              ? "border-accent dark:border-accent shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                              : "border-zinc-300 dark:border-zinc-800"
                                          )}
                                          style={{
                                            top: index === 0 ? '-16px' : '0',
                                            height: index === 0 ? 'calc(50% + 16px)' : '50%'
                                          }}
                                        />
                                        {/* Vertical line continuing down past the curve (only if not last) */}
                                        {!isLast && (
                                          <div
                                            className={cn(
                                              "absolute left-[19px] w-[2px] pointer-events-none transition-all duration-300",
                                              isChildActive
                                                ? "bg-accent/40 dark:bg-accent/55"
                                                : "bg-zinc-300 dark:bg-zinc-800"
                                            )}
                                            style={{
                                              top: index === 0 ? '-16px' : '0',
                                              bottom: '-4px'
                                            }}
                                          />
                                        )}

                                        <Link
                                          href={child.href}
                                          onClick={() => setIsOpen(false)}
                                          className={cn(
                                            "text-sm px-3 md:py-2 py-2.5 ml-[42px] mr-2 flex-1 rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-98",
                                            isChildActive
                                              ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs ring-1 ring-black/5 dark:ring-white/10 font-semibold"
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
                    </div>
                  </div>
                );
              })}
            </TooltipProvider>
          </nav>
        )}
      </div>

      {/* Profile section */}
      <div className="pt-2 pb-4 flex flex-col gap-2 px-5">
        <UserSettings collapsed={isCollapsed} initialData={sidebarData} />
      </div>
    </div>
  )
}
