"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { BarChart3, Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare, Menu, X, Folder, Mail, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { motion, Variants } from "framer-motion"
import { LOGO_URL } from "@/lib/constants"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UserSettings } from "@/components/common/user-settings"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSidebarActiveState } from "@/hooks/use-active-state-manager"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { useOnboardingStore } from "@/hooks/use-onboarding-store"

const sidebarNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
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
  const { isRouteActive, getActiveStateClasses } = useSidebarActiveState()
  const { setOpen } = useCommandMenu()
  const documentsEnabled = useFeatureFlagEnabled('documents_tab_access')
  const mailsEnabled = useFeatureFlagEnabled('mails-tab')

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
          "hidden md:flex flex-col z-30 ml-6 my-6 h-[calc(100vh-3rem)] rounded-[2.5rem] border bg-white dark:bg-background shadow-sm sticky top-6 overflow-hidden",
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
  iconVariants
}: SidebarContentProps) {
  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Header section */}
      <div className="flex items-center pt-6 pb-2 pl-6 pr-6 justify-between">
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
      </div>

      {/* Navigation section */}
      <div className="flex-1 overflow-y-auto min-h-0 py-4 custom-scrollbar">
        <nav className="grid gap-1.5 px-5">
          <TooltipProvider delayDuration={100} skipDelayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setOpen(true)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl pl-3 pr-3 h-10 text-sm font-medium transition-all duration-500 ease-out hover:bg-accent hover:text-white hover:ml-2 hover:mr-0 hover:shadow-lg hover:shadow-accent/20 mr-2",
                  )}
                >
                  {!isMobile && iconVariants ? (
                    <motion.div
                      variants={iconVariants}
                      className="flex-shrink-0"
                    >
                      <Search className="h-4 w-4 min-w-[1rem] transition-all duration-300 ease-out group-hover:rotate-3" />
                    </motion.div>
                  ) : (
                    <Search className="h-4 w-4 min-w-[1rem] flex-shrink-0 transition-all duration-500 ease-out group-hover:scale-125 group-hover:rotate-3" />
                  )}
                  {!isMobile && textVariants && (
                    <motion.div
                      variants={{
                        ...textVariants,
                        expanded: {
                          ...(textVariants.expanded as any),
                          display: "flex",
                        },
                      }}
                      className="flex items-center flex-1 overflow-hidden"
                    >
                      <span className="truncate transition-all duration-500 ease-out group-hover:font-semibold group-hover:tracking-wide">
                        Suche
                      </span>
                      <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">⌘</span>K
                      </kbd>
                    </motion.div>
                  )}
                  {isMobile && (
                    <>
                      <span className="truncate transition-all duration-500 ease-out group-hover:font-semibold group-hover:tracking-wide">
                        Suche
                      </span>
                      <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">⌘</span>K
                      </kbd>
                    </>
                  )}
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right" className="font-medium">Suche (⌘K)</TooltipContent>}
            </Tooltip>

            {sidebarNavItems
              .filter(item => !featureFlags.has(item.href) || featureFlags.get(item.href))
              .map((item) => {
                const isActive = isRouteActive(item.href);

                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        id={`sidebar-nav-${item.href.replace(/^\//, '')}`}
                        onClick={() => {
                          setIsOpen(false)
                          if (item.href === '/dashboard') {
                            useOnboardingStore.getState().completeStep('overview-open')
                          }
                        }}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl pl-3 pr-3 h-10 text-sm font-medium transition-all duration-500 ease-out hover:bg-accent hover:text-white hover:ml-2 hover:mr-0 hover:shadow-lg hover:shadow-accent/20 mr-2",
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
                            className="whitespace-nowrap truncate transition-all duration-500 ease-out group-hover:font-semibold group-hover:tracking-wide"
                          >
                            {item.title}
                          </motion.span>
                        )}
                        {isMobile && (
                          <span className="truncate transition-all duration-500 ease-out group-hover:font-semibold group-hover:tracking-wide">
                            {item.title}
                          </span>
                        )}
                      </Link>
                    </TooltipTrigger>
                    {isCollapsed && <TooltipContent side="right" className="font-medium">{item.title}</TooltipContent>}
                  </Tooltip>
                )
              })}
          </TooltipProvider>
        </nav>
      </div>

      {/* Profile section */}
      <div className="pt-2 pb-4 flex flex-col gap-2 px-5">
        {!isMobile && (
          <Button
            variant="ghost"
            className={cn(
              "flex items-center gap-3 rounded-xl pl-3 pr-3 h-10 text-sm font-medium transition-colors duration-200 ease-in-out hover:bg-muted w-full justify-start",
            )}
            onClick={toggleCollapse}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4 flex-shrink-0" /> : <ChevronLeft className="h-4 w-4 flex-shrink-0" />}
            {!isCollapsed && textVariants && (
              <motion.span variants={textVariants}>Einklappen</motion.span>
            )}
          </Button>
        )}
        <UserSettings collapsed={isCollapsed} />
      </div>
    </div>
  )
}
