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
import { UserSettings } from "@/components/user-settings"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSidebarActiveState } from "@/hooks/use-active-state-manager"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { useFeatureFlagEnabled } from "posthog-js/react"

// Stelle sicher, dass der Mieter-Link korrekt ist
const sidebarNavItems = [
  {
    title: "Dashboard",
    href: "/home",
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
  // User email handling is managed by the UserSettings component
  const documentsEnabled = useFeatureFlagEnabled('documents_tab_access')
  const mailsEnabled = useFeatureFlagEnabled('mails-tab')

  // Feature flags for navigation items
  const featureFlags = new Map([
    ['/dateien', !!documentsEnabled],
    ['/mails', !!mailsEnabled],
  ]);

  // Handle responsive collapse
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true)
      }
    }

    // Initial check
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sidebarVariants: Variants = {
    expanded: {
      width: "18rem",
      transition: {
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1] // Custom bezier for smooth "premium" feel
      }
    },
    collapsed: {
      width: "5rem", // Slightly wider for better visual balance
      transition: {
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  }

  const textVariants: Variants = {
    expanded: {
      opacity: 1,
      x: 0,
      display: "block",
      transition: {
        duration: 0.3,
        delay: 0.1,
        ease: "easeOut"
      }
    },
    collapsed: {
      opacity: 0,
      x: -10,
      transition: {
        duration: 0.2,
        ease: "easeIn"
      },
      transitionEnd: {
        display: "none"
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
          "hidden md:flex flex-col z-30 ml-6 my-6 h-[calc(100vh-3rem)] rounded-[2.5rem] border bg-background shadow-sm sticky top-6 overflow-hidden",
        )}
        style={{ willChange: "width" }}
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
          />
        </div>
      </motion.aside>

      {/* Mobile Drawer (Separate element to avoid conflict with floating desktop sidebar) */}
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
}

// Extracted content component to reuse
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
  textVariants
}: SidebarContentProps) {
  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Header section */}
      <div className={cn("flex items-center pt-6 pb-2", isCollapsed ? "justify-center px-2" : "justify-between pl-6 pr-6")}>
        <Link href="/" className="flex items-center gap-3 font-semibold overflow-hidden">
          <div className="relative w-8 h-8 min-w-[2rem] rounded-full overflow-hidden shadow-sm">
            <Image
              src={LOGO_URL}
              alt="IV Logo"
              fill
              className="object-cover"
              sizes="32px"
            />
          </div>
          {!isMobile && textVariants && (
            <motion.span
              variants={textVariants}
              className="text-lg whitespace-nowrap"
            >
              Mietfluss
            </motion.span>
          )}
          {isMobile && <span className="text-lg">Mietfluss</span>}
        </Link>
      </div>

      {/* Navigation section - takes remaining space */}
      <div className="flex-1 overflow-y-auto min-h-0 py-4 custom-scrollbar">
        <nav className={cn("grid gap-1.5", isCollapsed ? "px-2" : "px-4")}>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setOpen(true)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-out hover:bg-accent hover:text-white hover:shadow-md hover:shadow-accent/10",
                    isCollapsed && "justify-center h-10 w-10 p-0 mx-auto"
                  )}
                >
                  <Search className="h-4 w-4 min-w-[1rem] transition-all duration-300 ease-out group-hover:scale-110" />
                  {!isMobile && textVariants && (
                    <motion.div variants={textVariants} className="flex items-center flex-1 overflow-hidden">
                      <span className="transition-all duration-300 ease-out group-hover:font-semibold">
                        Suche
                      </span>
                      <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 group-hover:text-white group-hover:border-white/20">
                        <span className="text-xs">⌘</span>K
                      </kbd>
                    </motion.div>
                  )}
                  {isMobile && (
                    <>
                      <span className="transition-all duration-300 ease-out group-hover:font-semibold">
                        Suche
                      </span>
                      <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 group-hover:text-white group-hover:border-white/20">
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
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-out hover:bg-accent hover:text-white hover:shadow-md hover:shadow-accent/10",
                          getActiveStateClasses(item.href),
                          isCollapsed && "justify-center h-10 w-10 p-0 mx-auto"
                        )}
                        data-active={isActive}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon className="h-4 w-4 min-w-[1rem] transition-all duration-300 ease-out group-hover:scale-110" />
                        {!isMobile && textVariants && (
                          <motion.span
                            variants={textVariants}
                            className="whitespace-nowrap transition-all duration-300 ease-out group-hover:font-semibold"
                          >
                            {item.title}
                          </motion.span>
                        )}
                        {isMobile && (
                          <span className="transition-all duration-300 ease-out group-hover:font-semibold">
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

      {/* Profile section - fixed at bottom */}
      <div className={cn("pt-2 pb-4 flex flex-col gap-2", isCollapsed ? "px-2" : "px-4")}>
        {!isMobile && (
          <Button
            variant="ghost"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 ease-out hover:bg-accent hover:text-white",
              !isCollapsed && "w-full justify-start",
              isCollapsed && "justify-center h-10 w-10 p-0 mx-auto"
            )}
            onClick={toggleCollapse}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
