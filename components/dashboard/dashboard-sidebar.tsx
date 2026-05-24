"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { BarChart3, Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare, Menu, X, Folder, Mail, Search, ChevronLeft, ChevronRight, Inbox, MessageCircle, PanelLeft, ChevronDown, User, Truck, Package, MapPin, ShoppingCart, Lock, Settings, PlusCircle, Activity, Bell, Loader2, Droplet, Flame, Gauge, Zap, Fuel, Thermometer } from "lucide-react"
import { motion, Variants, AnimatePresence } from "framer-motion"
import { LOGO_URL, ROUTES } from "@/lib/constants"
import { createClient as createBrowserClient } from "@/utils/supabase/client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UserSettings } from "@/components/common/user-settings"
import { SettingsModal } from "@/components/modals/settings-modal"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
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
      {
        title: "Suche",
        href: ROUTES.SEARCH,
        icon: Search,
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
  const { preference, setPreference } = useSidebarStore()
  const [isResponsiveCollapsed, setIsResponsiveCollapsed] = useState(false)
  
  const isCollapsed = isResponsiveCollapsed || 
                      preference === 'collapsed'

  const [activeTab, setActiveTab] = useState<'home' | 'tasks'>('home')
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
      width: "23rem",
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

      <aside
        className={cn(
          "hidden md:flex flex-col z-30 h-screen sticky top-0 py-4 w-full",
        )}
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
  activeTab: 'home' | 'tasks'
  setActiveTab: (tab: 'home' | 'tasks') => void
  notificationCenterEnabled: boolean
  sidebarData: SidebarUserData
}

interface MetersDonutChartProps {
  metersByType: Record<string, number>;
  metersTotal: number;
  metersActive: number;
}

function MetersDonutChart({ metersByType, metersTotal, metersActive }: MetersDonutChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const activeMeters = useMemo(() => {
    return [
      { key: 'kaltwasser', label: 'Kaltwasser', icon: Droplet, colorClass: 'text-blue-500 bg-blue-500/10', strokeColor: '#3b82f6' },
      { key: 'warmwasser', label: 'Warmwasser', icon: Thermometer, colorClass: 'text-red-500 bg-red-500/10', strokeColor: '#ef4444' },
      { key: 'waermemenge', label: 'Wärmemenge', icon: Flame, colorClass: 'text-orange-500 bg-orange-500/10', strokeColor: '#f97316' },
      { key: 'heizkostenverteiler', label: 'HKV', icon: Gauge, colorClass: 'text-purple-500 bg-purple-500/10', strokeColor: '#a855f7' },
      { key: 'strom', label: 'Strom', icon: Zap, colorClass: 'text-yellow-500 bg-yellow-500/10', strokeColor: '#eab308' },
      { key: 'gas', label: 'Gas', icon: Fuel, colorClass: 'text-cyan-500 bg-cyan-500/10', strokeColor: '#06b6d4' }
    ].filter(m => (metersByType[m.key] || 0) > 0);
  }, [metersByType]);

  const totalActiveCount = useMemo(() => {
    return activeMeters.reduce((sum, m) => sum + (metersByType[m.key] || 0), 0);
  }, [activeMeters, metersByType]);

  // Donut chart parameters
  const RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // 226.195

  const segments = useMemo(() => {
    let currentOffset = 0;
    return activeMeters.map(m => {
      const count = metersByType[m.key] || 0;
      const percentage = totalActiveCount > 0 ? count / totalActiveCount : 0;
      const strokeDasharray = `${percentage * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
      const strokeDashoffset = -currentOffset * CIRCUMFERENCE;
      currentOffset += percentage;

      return {
        ...m,
        count,
        percentage,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [activeMeters, metersByType, totalActiveCount, CIRCUMFERENCE]);

  // Find info for current active item (either hovered or default to total overview)
  const activeInfo = useMemo(() => {
    if (hoveredKey) {
      const match = segments.find(s => s.key === hoveredKey);
      if (match) {
        return {
          label: match.label,
          count: `${match.count}x`,
          icon: match.icon,
          colorClass: match.colorClass
        };
      }
    }
    return {
      label: 'Gesamt',
      count: `${metersActive} Akt.`,
      icon: Activity,
      colorClass: 'text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80'
    };
  }, [hoveredKey, segments, metersActive]);

  const ActiveIcon = activeInfo.icon;

  if (metersTotal === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">Keine Zähler erfasst.</p>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-600 mt-1 font-medium">Zähler können direkt über das Wohnungs-Kontextmenü verwaltet werden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Meters Summary row */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Aktive Messgeräte</span>
        <span className="font-bold text-accent">{metersActive} von {metersTotal}</span>
      </div>

      <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/80 w-full my-1" />

      {/* Main interactive visualization panel */}
      <div className="flex flex-col items-center gap-3">
        {/* Donut Chart — full width, centered */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {/* Background base circle */}
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="transparent"
              stroke="var(--zinc-100)"
              className="stroke-zinc-100 dark:stroke-zinc-800/60"
              strokeWidth="9"
            />
            {/* Active segments */}
            {segments.map((s) => {
              const isHovered = hoveredKey === s.key;
              return (
                <circle
                  key={s.key}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="transparent"
                  stroke={s.strokeColor}
                  strokeWidth={isHovered ? 12 : 9}
                  strokeDasharray={s.strokeDasharray}
                  strokeDashoffset={s.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer origin-center hover:scale-[1.02]"
                  onMouseEnter={() => setHoveredKey(s.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })}
          </svg>

          {/* Central tooltip card inside the donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
            <div className={cn("p-1.5 rounded-lg mb-1", activeInfo.colorClass)}>
              <ActiveIcon className="h-4 w-4" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider truncate max-w-[80px]">
              {activeInfo.label}
            </p>
            <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">
              {activeInfo.count}
            </p>
          </div>
        </div>

        {/* Legend list below the chart */}
        <div className="w-full flex flex-col gap-1">
          {segments.map((s) => {
            const isHovered = hoveredKey === s.key;
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded-xl border transition-all duration-200 cursor-pointer",
                  isHovered
                    ? "bg-zinc-100/80 dark:bg-zinc-800/80 border-accent/40 dark:border-accent/40 shadow-xs scale-[1.01]"
                    : "bg-zinc-50/30 dark:bg-zinc-900/10 border-transparent hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                )}
                onMouseEnter={() => setHoveredKey(s.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={cn("p-1 rounded-md shrink-0", s.colorClass)}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 truncate">
                    {s.label}
                  </span>
                </div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-[10px] shrink-0">
                  {s.count}x
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface HousesDonutChartProps {
  houses: any[];
  apartments: any[];
}

function HousesDonutChart({ houses, apartments }: HousesDonutChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const colors = useMemo(() => [
    { strokeColor: '#3b82f6', colorClass: 'text-blue-500 bg-blue-500/10' },
    { strokeColor: '#10b981', colorClass: 'text-emerald-500 bg-emerald-500/10' },
    { strokeColor: '#a855f7', colorClass: 'text-purple-500 bg-purple-500/10' },
    { strokeColor: '#f97316', colorClass: 'text-orange-500 bg-orange-500/10' },
    { strokeColor: '#eab308', colorClass: 'text-yellow-500 bg-yellow-500/10' },
    { strokeColor: '#ec4899', colorClass: 'text-pink-500 bg-pink-500/10' },
    { strokeColor: '#06b6d4', colorClass: 'text-cyan-500 bg-cyan-500/10' }
  ], []);

  const segmentsData = useMemo(() => {
    const rawSegments = houses.map((house) => {
      const totalRentOfHouse = apartments
        .filter(a => a.haus_id === house.id)
        .reduce((sum, apt) => sum + Number(apt.miete || 0), 0);
      return {
        key: house.id,
        label: house.name,
        count: totalRentOfHouse,
        icon: Building2
      };
    }).filter(s => s.count > 0);

    // Sort by count (rent contribution) descending
    rawSegments.sort((a, b) => b.count - a.count);

    let finalSegments = [];
    if (rawSegments.length <= 5) {
      finalSegments = rawSegments.map((s, idx) => {
        const color = colors[idx % colors.length];
        return { ...s, ...color };
      });
    } else {
      const top4 = rawSegments.slice(0, 4).map((s, idx) => {
        const color = colors[idx % colors.length];
        return { ...s, ...color };
      });
      const others = rawSegments.slice(4);
      const othersCount = others.reduce((sum, s) => sum + s.count, 0);
      finalSegments = [
        ...top4,
        {
          key: 'other',
          label: 'Andere',
          count: othersCount,
          icon: Building2,
          strokeColor: '#6b7280',
          colorClass: 'text-zinc-500 bg-zinc-500/10'
        }
      ];
    }
    return finalSegments;
  }, [houses, apartments, colors]);

  const totalApartmentsInHouses = useMemo(() => {
    return segmentsData.reduce((sum, s) => sum + s.count, 0);
  }, [segmentsData]);

  // Donut chart parameters
  const RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const segments = useMemo(() => {
    let currentOffset = 0;
    return segmentsData.map(s => {
      const percentage = totalApartmentsInHouses > 0 ? s.count / totalApartmentsInHouses : 0;
      const strokeDasharray = `${percentage * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
      const strokeDashoffset = -currentOffset * CIRCUMFERENCE;
      currentOffset += percentage;

      return {
        ...s,
        percentage,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [segmentsData, totalApartmentsInHouses, CIRCUMFERENCE]);

  // Find info for current active item (either hovered or default to total overview)
  const activeInfo = useMemo(() => {
    if (hoveredKey) {
      const match = segments.find(s => s.key === hoveredKey);
      if (match) {
        return {
          label: match.label,
          count: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(match.count),
          icon: match.icon,
          colorClass: match.colorClass
        };
      }
    }
    return {
      label: 'Soll-Miete',
      count: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalApartmentsInHouses),
      icon: Wallet,
      colorClass: 'text-accent bg-accent/10'
    };
  }, [hoveredKey, segments, totalApartmentsInHouses]);

  const ActiveIcon = activeInfo.icon;

  if (houses.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">Keine Häuser erfasst.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Houses Summary row */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Mietverteilung</span>
        <span className="font-bold text-accent">
          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalApartmentsInHouses)} / Mon.
        </span>
      </div>

      <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/80 w-full my-1" />

      {/* Main interactive visualization panel */}
      <div className="flex flex-col items-center gap-3">
        {/* Donut Chart — full width, centered */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {/* Background base circle */}
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="transparent"
              stroke="var(--zinc-100)"
              className="stroke-zinc-100 dark:stroke-zinc-800/60"
              strokeWidth="9"
            />
            {/* Active segments */}
            {segments.map((s) => {
              const isHovered = hoveredKey === s.key;
              return (
                <circle
                  key={s.key}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="transparent"
                  stroke={s.strokeColor}
                  strokeWidth={isHovered ? 12 : 9}
                  strokeDasharray={s.strokeDasharray}
                  strokeDashoffset={s.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer origin-center hover:scale-[1.02]"
                  onMouseEnter={() => setHoveredKey(s.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })}
          </svg>

          {/* Central tooltip card inside the donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2 animate-in fade-in duration-200">
            <div className={cn("p-1.5 rounded-lg mb-1", activeInfo.colorClass)}>
              <ActiveIcon className="h-4 w-4" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider truncate max-w-[80px]">
              {activeInfo.label}
            </p>
            <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">
              {activeInfo.count}
            </p>
          </div>
        </div>

        {/* Legend list below the chart */}
        <div className="w-full flex flex-col gap-1">
          {segments.map((s) => {
            const isHovered = hoveredKey === s.key;
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded-xl border transition-all duration-200 cursor-pointer animate-in fade-in zoom-in-95 duration-200",
                  isHovered
                    ? "bg-zinc-100/80 dark:bg-zinc-800/80 border-accent/40 dark:border-accent/40 shadow-xs scale-[1.01]"
                    : "bg-zinc-50/30 dark:bg-zinc-900/10 border-transparent hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                )}
                onMouseEnter={() => setHoveredKey(s.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={cn("p-1 rounded-md shrink-0", s.colorClass)}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 truncate">
                    {s.label}
                  </span>
                </div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-[10px] shrink-0">
                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(s.count)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface FinanceDonutChartProps {
  finanzen: any[]
}

function FinanceDonutChart({ finanzen }: FinanceDonutChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const colors = useMemo(() => [
    { strokeColor: '#f59e0b', colorClass: 'text-amber-500 bg-amber-500/10' }, // Instandhaltung
    { strokeColor: '#3b82f6', colorClass: 'text-blue-500 bg-blue-500/10' },   // Heizung / Strom
    { strokeColor: '#8b5cf6', colorClass: 'text-purple-500 bg-purple-500/10' }, // Versicherung
    { strokeColor: '#ec4899', colorClass: 'text-pink-500 bg-pink-500/10' },   // Verwaltung
    { strokeColor: '#eab308', colorClass: 'text-yellow-500 bg-yellow-500/10' }, // Sonstiges
    { strokeColor: '#06b6d4', colorClass: 'text-cyan-500 bg-cyan-500/10' }
  ], []);

  const segmentsData = useMemo(() => {
    const expenseTags: Record<string, number> = {}
    let totalExpense = 0

    finanzen.forEach(item => {
      if (!item.ist_einnahmen) {
        const amount = Number(item.betrag || 0)
        totalExpense += amount
        const tags = item.tags || []
        if (tags.length > 0) {
          tags.forEach((t: string) => {
            const cleanTag = t.trim()
            expenseTags[cleanTag] = (expenseTags[cleanTag] || 0) + amount
          })
        } else {
          expenseTags['Sonstiges'] = (expenseTags['Sonstiges'] || 0) + amount
        }
      }
    })

    if (totalExpense === 0) {
      const incomeTags: Record<string, number> = {}
      let totalIncome = 0
      finanzen.forEach(item => {
        if (item.ist_einnahmen) {
          const amount = Number(item.betrag || 0)
          totalIncome += amount
          const tags = item.tags || []
          if (tags.length > 0) {
            tags.forEach((t: string) => {
              const cleanTag = t.trim()
              incomeTags[cleanTag] = (incomeTags[cleanTag] || 0) + amount
            })
          } else {
            incomeTags['Miete'] = (incomeTags['Miete'] || 0) + amount
          }
        }
      })

      const rawSegments = Object.entries(incomeTags).map(([tag, amount]) => ({
        key: tag,
        label: tag,
        count: amount,
        icon: Wallet
      }))
      rawSegments.sort((a, b) => b.count - a.count)

      return {
        isExpense: false,
        total: totalIncome,
        segments: rawSegments.map((s, idx) => ({
          ...s,
          ...colors[idx % colors.length]
        }))
      }
    }

    const rawSegments = Object.entries(expenseTags).map(([tag, amount]) => ({
      key: tag,
      label: tag,
      count: amount,
      icon: Wallet
    }))
    rawSegments.sort((a, b) => b.count - a.count)

    let finalSegments = []
    if (rawSegments.length <= 5) {
      finalSegments = rawSegments.map((s, idx) => ({
        ...s,
        ...colors[idx % colors.length]
      }))
    } else {
      const top4 = rawSegments.slice(0, 4).map((s, idx) => ({
        ...s,
        ...colors[idx % colors.length]
      }))
      const others = rawSegments.slice(4)
      const othersCount = others.reduce((sum, s) => sum + s.count, 0)
      finalSegments = [
        ...top4,
        {
          key: 'other',
          label: 'Andere',
          count: othersCount,
          icon: Wallet,
          strokeColor: '#6b7280',
          colorClass: 'text-zinc-500 bg-zinc-500/10'
        }
      ]
    }

    return {
      isExpense: true,
      total: totalExpense,
      segments: finalSegments
    }
  }, [finanzen, colors])

  const totalValue = segmentsData.total
  const segmentsList = segmentsData.segments

  const RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const segments = useMemo(() => {
    let currentOffset = 0;
    return segmentsList.map(s => {
      const percentage = totalValue > 0 ? s.count / totalValue : 0;
      const strokeDasharray = `${percentage * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
      const strokeDashoffset = -currentOffset * CIRCUMFERENCE;
      currentOffset += percentage;

      return {
        ...s,
        percentage,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [segmentsList, totalValue, CIRCUMFERENCE]);

  const activeInfo = useMemo(() => {
    if (hoveredKey) {
      const match = segments.find(s => s.key === hoveredKey);
      if (match) {
        return {
          label: match.label,
          count: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(match.count),
          icon: match.icon,
          colorClass: match.colorClass
        };
      }
    }
    return {
      label: segmentsData.isExpense ? 'Ausgaben Gesamt' : 'Einnahmen Gesamt',
      count: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalValue),
      icon: Wallet,
      colorClass: segmentsData.isExpense ? 'text-red-500 bg-red-500/10' : 'text-emerald-500 bg-emerald-500/10'
    };
  }, [hoveredKey, segments, totalValue, segmentsData.isExpense]);

  const ActiveIcon = activeInfo.icon;

  if (finanzen.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">Keine Transaktionen erfasst.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
          {segmentsData.isExpense ? 'Ausgaben-Verteilung' : 'Einnahmen-Verteilung'}
        </span>
        <span className={cn("font-bold", segmentsData.isExpense ? 'text-red-500' : 'text-emerald-500')}>
          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalValue)}
        </span>
      </div>

      <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/80 w-full my-1" />

      <div className="flex flex-col items-center gap-3">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="transparent"
              stroke="var(--zinc-100)"
              className="stroke-zinc-100 dark:stroke-zinc-800/60"
              strokeWidth="9"
            />
            {segments.map((s) => {
              const isHovered = hoveredKey === s.key;
              return (
                <circle
                  key={s.key}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="transparent"
                  stroke={s.strokeColor}
                  strokeWidth={isHovered ? 12 : 9}
                  strokeDasharray={s.strokeDasharray}
                  strokeDashoffset={s.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer origin-center hover:scale-[1.02]"
                  onMouseEnter={() => setHoveredKey(s.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2 animate-in fade-in duration-200">
            <div className={cn("p-1.5 rounded-lg mb-1", activeInfo.colorClass)}>
              <ActiveIcon className="h-4 w-4" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider truncate max-w-[80px]">
              {activeInfo.label}
            </p>
            <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">
              {activeInfo.count}
            </p>
          </div>
        </div>

        <div className="w-full flex flex-col gap-1">
          {segments.map((s) => {
            const isHovered = hoveredKey === s.key;
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded-xl border transition-all duration-200 cursor-pointer animate-in fade-in zoom-in-95 duration-200",
                  isHovered
                    ? "bg-zinc-100/80 dark:bg-zinc-800/80 border-accent/40 dark:border-accent/40 shadow-xs scale-[1.01]"
                    : "bg-zinc-50/30 dark:bg-zinc-900/10 border-transparent hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                )}
                onMouseEnter={() => setHoveredKey(s.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={cn("p-1 rounded-md shrink-0", s.colorClass)}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 truncate">
                    {s.label}
                  </span>
                </div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-[10px] shrink-0">
                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(s.count)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface TenantsDonutChartProps {
  tenants: any[]
}

function TenantsDonutChart({ tenants }: TenantsDonutChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const colors = useMemo(() => [
    { strokeColor: '#10b981', colorClass: 'text-emerald-500 bg-emerald-500/10' }, // Erhalten
    { strokeColor: '#f59e0b', colorClass: 'text-amber-500 bg-amber-500/10' },     // Ausstehend
    { strokeColor: '#3b82f6', colorClass: 'text-blue-500 bg-blue-500/10' },       // Zurückgezahlt
    { strokeColor: '#6b7280', colorClass: 'text-zinc-500 bg-zinc-500/10' }
  ], []);

  const segmentsData = useMemo(() => {
    let hasKautionData = false
    const depositStatusCount: Record<string, number> = {}

    tenants.forEach(t => {
      if (t.kaution) {
        const amount = typeof t.kaution.amount === 'string'
          ? parseFloat(t.kaution.amount)
          : Number(t.kaution.amount || 0);

        if (!isNaN(amount) && amount > 0) {
          hasKautionData = true
          const status = t.kaution.status || 'Ausstehend'
          depositStatusCount[status] = (depositStatusCount[status] || 0) + amount
        }
      }
    })

    if (!hasKautionData) {
      const statusCounts: Record<string, number> = {}
      tenants.forEach(t => {
        const status = t.status || 'mieter'
        const label = status === 'mieter' ? 'Aktive Mieter' : status === 'bewerber' ? 'Bewerber' : 'Ehemalige'
        statusCounts[label] = (statusCounts[label] || 0) + 1
      })

      const rawSegments = Object.entries(statusCounts).map(([status, count]) => ({
        key: status,
        label: status,
        count,
        icon: Users
      }))

      return {
        isDeposit: false,
        total: tenants.length,
        segments: rawSegments.map((s, idx) => ({
          ...s,
          ...colors[idx % colors.length]
        }))
      }
    }

    const rawSegments = Object.entries(depositStatusCount).map(([status, amount]) => ({
      key: status,
      label: status,
      count: amount,
      icon: Users
    }))

    return {
      isDeposit: true,
      total: Object.values(depositStatusCount).reduce((sum, v) => sum + v, 0),
      segments: rawSegments.map((s, idx) => ({
        ...s,
        ...colors[idx % colors.length]
      }))
    }
  }, [tenants, colors])

  const totalValue = segmentsData.total
  const segmentsList = segmentsData.segments

  const RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const segments = useMemo(() => {
    let currentOffset = 0;
    return segmentsList.map(s => {
      const percentage = totalValue > 0 ? s.count / totalValue : 0;
      const strokeDasharray = `${percentage * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
      const strokeDashoffset = -currentOffset * CIRCUMFERENCE;
      currentOffset += percentage;

      return {
        ...s,
        percentage,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [segmentsList, totalValue, CIRCUMFERENCE]);

  const activeInfo = useMemo(() => {
    if (hoveredKey) {
      const match = segments.find(s => s.key === hoveredKey);
      if (match) {
        return {
          label: match.label,
          count: segmentsData.isDeposit
            ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(match.count)
            : `${match.count} Mieter`,
          icon: match.icon,
          colorClass: match.colorClass
        };
      }
    }
    return {
      label: segmentsData.isDeposit ? 'Kautionen Gesamt' : 'Mieter Gesamt',
      count: segmentsData.isDeposit
        ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalValue)
        : `${totalValue} Mieter`,
      icon: Users,
      colorClass: 'text-accent bg-accent/10'
    };
  }, [hoveredKey, segments, totalValue, segmentsData.isDeposit]);

  const ActiveIcon = activeInfo.icon;

  if (tenants.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">Keine Mieter erfasst.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
          {segmentsData.isDeposit ? 'Kautions-Abdeckung' : 'Mieter-Verteilung'}
        </span>
        <span className="font-bold text-accent">
          {segmentsData.isDeposit
            ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalValue)
            : `${totalValue} Mieter`}
        </span>
      </div>

      <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/80 w-full my-1" />

      <div className="flex flex-col items-center gap-3">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="transparent"
              stroke="var(--zinc-100)"
              className="stroke-zinc-100 dark:stroke-zinc-800/60"
              strokeWidth="9"
            />
            {segments.map((s) => {
              const isHovered = hoveredKey === s.key;
              return (
                <circle
                  key={s.key}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="transparent"
                  stroke={s.strokeColor}
                  strokeWidth={isHovered ? 12 : 9}
                  strokeDasharray={s.strokeDasharray}
                  strokeDashoffset={s.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer origin-center hover:scale-[1.02]"
                  onMouseEnter={() => setHoveredKey(s.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2 animate-in fade-in duration-200">
            <div className={cn("p-1.5 rounded-lg mb-1", activeInfo.colorClass)}>
              <ActiveIcon className="h-4 w-4" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider truncate max-w-[80px]">
              {activeInfo.label}
            </p>
            <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">
              {activeInfo.count}
            </p>
          </div>
        </div>

        <div className="w-full flex flex-col gap-1">
          {segments.map((s) => {
            const isHovered = hoveredKey === s.key;
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded-xl border transition-all duration-200 cursor-pointer animate-in fade-in zoom-in-95 duration-200",
                  isHovered
                    ? "bg-zinc-100/80 dark:bg-zinc-800/80 border-accent/40 dark:border-accent/40 shadow-xs scale-[1.01]"
                    : "bg-zinc-50/30 dark:bg-zinc-900/10 border-transparent hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                )}
                onMouseEnter={() => setHoveredKey(s.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={cn("p-1 rounded-md shrink-0", s.colorClass)}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 truncate">
                    {s.label}
                  </span>
                </div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-[10px] shrink-0">
                  {segmentsData.isDeposit
                    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(s.count)
                    : `${s.count}x`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface NebenkostenDonutChartProps {
  nebenkosten: any[]
}

function NebenkostenDonutChart({ nebenkosten }: NebenkostenDonutChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const colors = useMemo(() => [
    { strokeColor: '#ef4444', colorClass: 'text-red-500 bg-red-500/10' },     // Heizkosten
    { strokeColor: '#3b82f6', colorClass: 'text-blue-500 bg-blue-500/10' },   // Kaltwasser
    { strokeColor: '#eab308', colorClass: 'text-yellow-500 bg-yellow-500/10' }, // Allgemeinstrom
    { strokeColor: '#f97316', colorClass: 'text-orange-500 bg-orange-500/10' }, // Müllabfuhr
    { strokeColor: '#a855f7', colorClass: 'text-purple-500 bg-purple-500/10' }, // Hausmeister
    { strokeColor: '#06b6d4', colorClass: 'text-cyan-500 bg-cyan-500/10' }
  ], []);

  const segmentsData = useMemo(() => {
    const categoryTotals: Record<string, number> = {}
    let totalCosts = 0

    nebenkosten.forEach(item => {
      const arten = item.nebenkostenart || []
      const betraege = item.betrag || []

      arten.forEach((art: string, idx: number) => {
        const amount = Number(betraege[idx] || 0)
        if (amount > 0) {
          totalCosts += amount
          const cleanArt = art.trim()
          categoryTotals[cleanArt] = (categoryTotals[cleanArt] || 0) + amount
        }
      })

      if (item.zaehlerkosten) {
        Object.entries(item.zaehlerkosten).forEach(([key, val]) => {
          const amount = Number(val || 0)
          if (amount > 0) {
            totalCosts += amount
            const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1)
            categoryTotals[capitalizedKey] = (categoryTotals[capitalizedKey] || 0) + amount
          }
        })
      }
    })

    const rawSegments = Object.entries(categoryTotals).map(([name, amount]) => ({
      key: name,
      label: name,
      count: amount,
      icon: FileSpreadsheet
    }))
    rawSegments.sort((a, b) => b.count - a.count)

    let finalSegments = []
    if (rawSegments.length <= 5) {
      finalSegments = rawSegments.map((s, idx) => ({
        ...s,
        ...colors[idx % colors.length]
      }))
    } else {
      const top4 = rawSegments.slice(0, 4).map((s, idx) => ({
        ...s,
        ...colors[idx % colors.length]
      }))
      const others = rawSegments.slice(4)
      const othersSum = others.reduce((sum, s) => sum + s.count, 0)
      finalSegments = [
        ...top4,
        {
          key: 'other',
          label: 'Andere',
          count: othersSum,
          icon: FileSpreadsheet,
          strokeColor: '#6b7280',
          colorClass: 'text-zinc-500 bg-zinc-500/10'
        }
      ]
    }

    return {
      total: totalCosts,
      segments: finalSegments
    }
  }, [nebenkosten, colors])

  const totalValue = segmentsData.total
  const segmentsList = segmentsData.segments

  const RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const segments = useMemo(() => {
    let currentOffset = 0;
    return segmentsList.map(s => {
      const percentage = totalValue > 0 ? s.count / totalValue : 0;
      const strokeDasharray = `${percentage * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
      const strokeDashoffset = -currentOffset * CIRCUMFERENCE;
      currentOffset += percentage;

      return {
        ...s,
        percentage,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [segmentsList, totalValue, CIRCUMFERENCE]);

  const activeInfo = useMemo(() => {
    if (hoveredKey) {
      const match = segments.find(s => s.key === hoveredKey);
      if (match) {
        return {
          label: match.label,
          count: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(match.count),
          icon: match.icon,
          colorClass: match.colorClass
        };
      }
    }
    return {
      label: 'Kosten Gesamt',
      count: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalValue),
      icon: FileSpreadsheet,
      colorClass: 'text-accent bg-accent/10'
    };
  }, [hoveredKey, segments, totalValue]);

  const ActiveIcon = activeInfo.icon;

  if (nebenkosten.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">Keine Nebenkosten erfasst.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Kostenaufteilung</span>
        <span className="font-bold text-accent">
          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalValue)}
        </span>
      </div>

      <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/80 w-full my-1" />

      <div className="flex flex-col items-center gap-3">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="transparent"
              stroke="var(--zinc-100)"
              className="stroke-zinc-100 dark:stroke-zinc-800/60"
              strokeWidth="9"
            />
            {segments.map((s) => {
              const isHovered = hoveredKey === s.key;
              return (
                <circle
                  key={s.key}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="transparent"
                  stroke={s.strokeColor}
                  strokeWidth={isHovered ? 12 : 9}
                  strokeDasharray={s.strokeDasharray}
                  strokeDashoffset={s.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer origin-center hover:scale-[1.02]"
                  onMouseEnter={() => setHoveredKey(s.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2 animate-in fade-in duration-200">
            <div className={cn("p-1.5 rounded-lg mb-1", activeInfo.colorClass)}>
              <ActiveIcon className="h-4 w-4" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider truncate max-w-[80px]">
              {activeInfo.label}
            </p>
            <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">
              {activeInfo.count}
            </p>
          </div>
        </div>

        <div className="w-full flex flex-col gap-1">
          {segments.map((s) => {
            const isHovered = hoveredKey === s.key;
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded-xl border transition-all duration-200 cursor-pointer animate-in fade-in zoom-in-95 duration-200",
                  isHovered
                    ? "bg-zinc-100/80 dark:bg-zinc-800/80 border-accent/40 dark:border-accent/40 shadow-xs scale-[1.01]"
                    : "bg-zinc-50/30 dark:bg-zinc-900/10 border-transparent hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                )}
                onMouseEnter={() => setHoveredKey(s.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={cn("p-1 rounded-md shrink-0", s.colorClass)}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 truncate">
                    {s.label}
                  </span>
                </div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-[10px] shrink-0">
                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(s.count)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
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

  const supportButtonEnabled = useFeatureFlagEnabled('support-button')

  // Unread badge indicators for sidebar bottom actions
  // TODO: Implement later logic to check for unread messages / support requests in the inbox
  const hasUnreadMessages = false
  // TODO: Implement later logic to check for unread notifications in the notification center
  const hasUnreadNotifications = false

  // Supabase states for apartments insights (fetched on page load and changes)
  const [apartments, setApartments] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [meters, setMeters] = useState<any[]>([])
  const [houses, setHouses] = useState<any[]>([])
  const [finanzen, setFinanzen] = useState<any[]>([])
  const [nebenkosten, setNebenkosten] = useState<any[]>([])
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [openSettingsModal, setOpenSettingsModal] = useState(false)
  const [settingsInitialTab, setSettingsInitialTab] = useState("profile")

  const fetchApartmentData = async () => {
    try {
      setIsDataLoading(true)
      const supabase = createBrowserClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [aptsRes, tenantsRes, metersRes, housesRes, finanzenRes, nebenkostenRes] = await Promise.all([
        supabase.from('Wohnungen').select('id,name,groesse,miete,haus_id').eq('user_id', user.id),
        supabase.from('Mieter').select('id,wohnung_id,einzug,auszug,name,status,kaution').eq('user_id', user.id),
        supabase.from('Zaehler').select('id,zaehler_typ,ist_aktiv,wohnung_id').eq('user_id', user.id),
        supabase.from('Haeuser').select('id,name,strasse,ort,groesse').eq('user_id', user.id),
        supabase.from('Finanzen').select('id,wohnung_id,name,datum,betrag,ist_einnahmen,tags').eq('user_id', user.id),
        supabase.from('Nebenkosten').select('id,startdatum,enddatum,nebenkostenart,betrag,zaehlerkosten,haeuser_id').eq('user_id', user.id)
      ])

      if (aptsRes.data) setApartments(aptsRes.data)
      if (tenantsRes.data) setTenants(tenantsRes.data)
      if (metersRes.data) setMeters(metersRes.data)
      if (housesRes.data) setHouses(housesRes.data)
      if (finanzenRes.data) setFinanzen(finanzenRes.data)
      if (nebenkostenRes.data) setNebenkosten(nebenkostenRes.data)
    } catch (err) {
      console.error("Error fetching sidebar apartments data:", err)
    } finally {
      setIsDataLoading(false)
    }
  }

  useEffect(() => {
    const isTargetRoute = [
      '/',
      '/dashboard',
      '/wohnungen',
      '/haeuser',
      '/finanzen',
      '/mieter',
      '/betriebskosten',
      '/dateien',
      '/todos',
      '/suche',
      '/mails'
    ].some(route => pathname === route || (route !== '/' && pathname.startsWith(route)))
    
    if (isTargetRoute) {
      fetchApartmentData()
    }
    
    const handleRefresh = () => {
      if (isTargetRoute) {
        fetchApartmentData()
      }
    }

    window.addEventListener('refresh-sidebar-insights', handleRefresh)
    return () => {
      window.removeEventListener('refresh-sidebar-insights', handleRefresh)
    }
  }, [pathname])

  // Compute stats for apartments side panel
  const apartmentStats = useMemo(() => {
    if (!apartments || apartments.length === 0) {
      return {
        total: 0,
        rentedCount: 0,
        freeCount: 0,
        occupancyRate: 0,
        totalRent: 0,
        avgRent: 0,
        totalSize: 0,
        avgSize: 0,
        metersTotal: 0,
        metersActive: 0,
        metersByType: {} as Record<string, number>,
      }
    }

    const today = new Date()
    const tenantMap = tenants.reduce((map, t) => {
      if (t.wohnung_id && !map.has(t.wohnung_id)) {
        map.set(t.wohnung_id, t)
      }
      return map
    }, new Map<string, any>())

    let rentedCount = 0
    let totalRent = 0
    let totalSize = 0

    apartments.forEach(apt => {
      const tenant = tenantMap.get(apt.id)
      const isRented = tenant && (!tenant.auszug || new Date(tenant.auszug) > today)
      if (isRented) {
        rentedCount++
      }
      totalRent += Number(apt.miete || 0)
      totalSize += Number(apt.groesse || 0)
    })

    const total = apartments.length
    const freeCount = total - rentedCount
    const occupancyRate = total > 0 ? Math.round((rentedCount / total) * 100) : 0
    const avgRent = total > 0 ? Math.round(totalRent / total) : 0
    const avgSize = total > 0 ? Math.round((totalSize / total) * 10) / 10 : 0

    // Meter calculations
    const metersTotal = meters.length
    const metersActive = meters.filter(m => m.ist_aktiv !== false).length
    const metersByType = meters.reduce((acc: Record<string, number>, m) => {
      if (m.ist_aktiv !== false) {
        const type = m.zaehler_typ || 'kaltwasser';
        acc[type] = (acc[type] || 0) + 1;
      }
      return acc;
    }, {})

    return {
      total,
      rentedCount,
      freeCount,
      occupancyRate,
      totalRent,
      avgRent,
      totalSize,
      avgSize,
      metersTotal,
      metersActive,
      metersByType,
    }
  }, [apartments, tenants, meters])

  // Compute stats for houses side panel
  const houseStats = useMemo(() => {
    if (!houses || houses.length === 0) {
      return {
        total: 0,
        fullyOccupied: 0,
        occupancyRate: 0,
        totalRent: 0,
        totalSize: 0,
        avgRentPerSqm: 0,
        avgSize: 0,
      }
    }

    const today = new Date()
    const tenantMap = tenants.reduce((map, t) => {
      if (t.wohnung_id && !map.has(t.wohnung_id)) {
        map.set(t.wohnung_id, t)
      }
      return map
    }, new Map<string, any>())

    const houseListWithStats = houses.map(house => {
      const apts = apartments.filter(a => a.haus_id === house.id)
      const totalApartments = apts.length
      const freeApartments = apts.reduce((acc, apt) => {
        const tenant = tenantMap.get(apt.id)
        const occupied = tenant && (!tenant.auszug || new Date(tenant.auszug) > today)
        return acc + (occupied ? 0 : 1)
      }, 0)

      return {
        ...house,
        totalApartments,
        freeApartments,
      }
    })

    const total = houses.length
    const fullyOccupied = houseListWithStats.filter(h => h.totalApartments > 0 && h.freeApartments === 0).length

    // Portfolio occupancy rate
    const totalApartmentsCount = apartments.length
    const totalFreeApartmentsCount = houseListWithStats.reduce((sum, h) => sum + h.freeApartments, 0)
    const totalOccupiedApartmentsCount = totalApartmentsCount - totalFreeApartmentsCount
    const occupancyRate = totalApartmentsCount > 0 
      ? Math.round((totalOccupiedApartmentsCount / totalApartmentsCount) * 100) 
      : 0

    let totalRent = 0
    let totalSize = 0

    apartments.forEach(apt => {
      totalRent += Number(apt.miete || 0)
    })

    houses.forEach(house => {
      const apts = apartments.filter(a => a.haus_id === house.id)
      let displaySize = 0;
      if (house.groesse && !isNaN(Number(house.groesse))) {
        displaySize = Number(house.groesse)
      } else {
        displaySize = apts.reduce((sum, apt) => sum + Number(apt.groesse || 0), 0)
      }
      totalSize += displaySize
    })

    const avgRentPerSqm = totalSize > 0 ? totalRent / totalSize : 0
    const avgSize = totalApartmentsCount > 0 ? Math.round((totalSize / totalApartmentsCount) * 10) / 10 : 0

    return {
      total,
      fullyOccupied,
      occupancyRate,
      totalRent,
      totalSize,
      avgRentPerSqm,
      avgSize
    }
  }, [houses, apartments, tenants])

  // Compute stats for dashboard / portfolio overview panel
  const dashboardStats = useMemo(() => {
    const totalHouses = houses.length
    const totalApartments = apartments.length
    
    // Active tenants
    const today = new Date()
    const activeTenants = tenants.filter(t => {
      const occupied = !t.auszug || new Date(t.auszug) > today
      return occupied
    }).length

    // Target (expected) rent
    let expectedRent = 0
    apartments.forEach(apt => {
      expectedRent += Number(apt.miete || 0)
    })

    // Actual (real) rent collected in current month
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() // 0-indexed

    let realRent = 0
    finanzen.forEach(item => {
      if (!item.ist_einnahmen) return
      
      const date = item.datum ? new Date(item.datum) : null
      if (!date || date.getFullYear() !== currentYear || date.getMonth() !== currentMonth) return

      const nameLower = (item.name || '').toLowerCase()
      const tags = (item.tags || []).map((t: string) => t.toLowerCase())
      
      // Filter strictly: check tags first. If tags is not empty, check if any tag matches rent/miete/mietzahlung.
      // If tags is empty, fall back to checking the name.
      const hasRent = tags.length > 0
        ? tags.some((t: string) => t === 'miete' || t === 'mietzahlung' || t.includes('miete') || t.includes('mietzahlung'))
        : (nameLower.includes('miete') || nameLower.includes('mietzahlung') || nameLower.includes('mietingang') || nameLower.includes('mieteingang'))

      if (hasRent) {
        realRent += Number(item.betrag || 0)
      }
    })

    const rentCollectionProgress = expectedRent > 0 ? Math.round((realRent / expectedRent) * 100) : 0

    return {
      totalHouses,
      totalApartments,
      activeTenants,
      expectedRent,
      realRent,
      rentCollectionProgress
    }
  }, [houses, apartments, tenants, finanzen])

  // Compute stats for finance side panel
  const financeStats = useMemo(() => {
    if (!finanzen || finanzen.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netCashflow: 0,
        cashflowRatio: 0,
        avgTransaction: 0,
        expenseTags: {} as Record<string, number>,
      }
    }

    let totalIncome = 0
    let totalExpenses = 0
    const expenseTags: Record<string, number> = {}

    finanzen.forEach(item => {
      const amount = Number(item.betrag || 0)
      if (item.ist_einnahmen) {
        totalIncome += amount
      } else {
        totalExpenses += amount
        const tags = item.tags || []
        if (tags.length > 0) {
          tags.forEach((t: string) => {
            const cleanTag = t.trim()
            expenseTags[cleanTag] = (expenseTags[cleanTag] || 0) + amount
          })
        } else {
          expenseTags['Sonstiges'] = (expenseTags['Sonstiges'] || 0) + amount
        }
      }
    })

    const netCashflow = totalIncome - totalExpenses
    const totalTransactions = totalIncome + totalExpenses
    const cashflowRatio = totalIncome > 0 ? Math.round((netCashflow / totalIncome) * 100) : 0
    const avgTransaction = finanzen.length > 0 ? Math.round(totalTransactions / finanzen.length) : 0

    return {
      totalIncome,
      totalExpenses,
      netCashflow,
      cashflowRatio,
      avgTransaction,
      expenseTags,
    }
  }, [finanzen])

  // Compute stats for tenants side panel
  const tenantStats = useMemo(() => {
    if (!tenants || tenants.length === 0) {
      return {
        total: 0,
        activeCount: 0,
        applicantCount: 0,
        pastCount: 0,
        totalDeposit: 0,
        depositReceived: 0,
        depositOutstanding: 0,
        depositStatusCount: {} as Record<string, number>,
      }
    }

    let activeCount = 0
    let applicantCount = 0
    let pastCount = 0

    let totalDeposit = 0
    let depositReceived = 0
    let depositOutstanding = 0
    const depositStatusCount: Record<string, number> = {}

    tenants.forEach(t => {
      const status = t.status || 'mieter'
      if (status === 'mieter') {
        activeCount++
      } else if (status === 'bewerber') {
        applicantCount++
      } else {
        pastCount++
      }

      if (t.kaution) {
        const amount = typeof t.kaution.amount === 'string'
          ? parseFloat(t.kaution.amount)
          : Number(t.kaution.amount || 0);

        if (!isNaN(amount) && amount > 0) {
          totalDeposit += amount
          const statusLabel = t.kaution.status || 'Ausstehend'
          depositStatusCount[statusLabel] = (depositStatusCount[statusLabel] || 0) + amount

          if (statusLabel === 'Erhalten' || statusLabel === 'Bezahlt') {
            depositReceived += amount
          } else if (statusLabel === 'Ausstehend' || statusLabel === 'Offen') {
            depositOutstanding += amount
          }
        }
      }
    })

    const total = tenants.length

    return {
      total,
      activeCount,
      applicantCount,
      pastCount,
      totalDeposit,
      depositReceived,
      depositOutstanding,
      depositStatusCount,
    }
  }, [tenants])

  // Compute stats for operating costs side panel
  const nebenkostenStats = useMemo(() => {
    if (!nebenkosten || nebenkosten.length === 0) {
      return {
        totalCosts: 0,
        billsCount: 0,
        avgCostPerBill: 0,
        avgCostPerSqm: 0,
        categoryTotals: {} as Record<string, number>,
        housesCoverage: 0,
      }
    }

    let totalCosts = 0
    const categoryTotals: Record<string, number> = {}
    const houseIdsWithNebenkosten = new Set<string>()

    nebenkosten.forEach(item => {
      if (item.haeuser_id) {
        houseIdsWithNebenkosten.add(item.haeuser_id)
      }

      const arten = item.nebenkostenart || []
      const betraege = item.betrag || []
      let billSum = 0

      arten.forEach((art: string, idx: number) => {
        const amount = Number(betraege[idx] || 0)
        if (amount > 0) {
          billSum += amount
          const cleanArt = art.trim()
          categoryTotals[cleanArt] = (categoryTotals[cleanArt] || 0) + amount
        }
      })

      if (item.zaehlerkosten) {
        Object.entries(item.zaehlerkosten).forEach(([key, val]) => {
          const amount = Number(val || 0)
          if (amount > 0) {
            billSum += amount
            const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1)
            categoryTotals[capitalizedKey] = (categoryTotals[capitalizedKey] || 0) + amount
          }
        })
      }

      totalCosts += billSum
    })

    const billsCount = nebenkosten.length
    const avgCostPerBill = billsCount > 0 ? Math.round(totalCosts / billsCount) : 0

    const totalArea = houses.reduce((sum, h) => {
      let displaySize = 0;
      if (h.groesse && !isNaN(Number(h.groesse))) {
        displaySize = Number(h.groesse)
      } else {
        const apts = apartments.filter(a => a.haus_id === h.id)
        displaySize = apts.reduce((s, apt) => s + Number(apt.groesse || 0), 0)
      }
      return sum + displaySize
    }, 0)

    const avgCostPerSqm = totalArea > 0 ? Number((totalCosts / totalArea).toFixed(2)) : 0
    
    const housesCoverage = houses.length > 0
      ? Math.round((houseIdsWithNebenkosten.size / houses.length) * 100)
      : 0

    return {
      totalCosts,
      billsCount,
      avgCostPerBill,
      avgCostPerSqm,
      categoryTotals,
      housesCoverage,
    }
  }, [nebenkosten, houses, apartments])

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

  if (!isMobile) {
    return (
      <>
      <div className="h-full w-full flex flex-row relative">
        {/* Left Column: Primary Icon Strip (always visible on desktop, w-20) */}
        <div className="w-20 h-full flex flex-col justify-between items-center pt-0 pb-4 border-r border-border/80 shrink-0">
          <div className="flex flex-col items-center gap-2 w-full pt-0">
            {isCollapsed && toggleCollapse ? (
              <button
                onClick={toggleCollapse}
                className="group relative w-11 h-11 flex items-center justify-center rounded-2xl hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 transition-all duration-300 shrink-0 focus:outline-none cursor-pointer active:scale-95"
                title="Menü ausklappen"
              >
                <div className="relative w-7 h-7 transition-all duration-300 group-hover:opacity-0 group-hover:scale-90">
                  <Image
                    src={LOGO_URL}
                    alt="IV Logo"
                    fill
                    className="object-cover rounded-full"
                    sizes="28px"
                    unoptimized
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                  <PanelLeft className="h-5 w-5 text-zinc-900 dark:text-zinc-50" />
                </div>
              </button>
            ) : (
              <Link 
                href="/" 
                className="relative w-11 h-11 flex items-center justify-center rounded-2xl hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 transition-all duration-300 shrink-0 cursor-pointer"
                title="Mietevo Home"
              >
                <div className="relative w-7 h-7 rounded-full overflow-hidden shadow-xs shrink-0">
                  <Image
                    src={LOGO_URL}
                    alt="IV Logo"
                    fill
                    className="object-cover"
                    sizes="28px"
                    unoptimized
                  />
                </div>
              </Link>
            )}

            {/* Icon nav list matching navigation groups */}
            <nav className="flex flex-col items-center gap-1 w-full px-2">
              <TooltipProvider delayDuration={100} skipDelayDuration={300}>
                {sidebarNavGroups.map((group) =>
                  group.items
                    .filter(item => !featureFlags.has(item.href) || featureFlags.get(item.href))
                    .map((item) => {
                      const isActive = isRouteActive(item.href);
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              onClick={(e) => {
                                if (item.href === ROUTES.SEARCH) {
                                  e.preventDefault();
                                  setOpen(true);
                                }
                              }}
                              className={cn(
                                "group flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 cursor-pointer active:scale-95",
                                isActive
                                  ? "bg-accent text-white shadow-lg shadow-accent/20"
                                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 hover:text-zinc-900 dark:hover:text-zinc-50"
                              )}
                            >
                              <item.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="font-medium">{item.title}</TooltipContent>
                        </Tooltip>
                      );
                    })
                )}
              </TooltipProvider>
            </nav>
          </div>

          {/* Bottom Actions section for Profile, Notification, and Messages */}
          <div className="flex flex-col items-center gap-3 w-full px-2 mt-auto">
            {/* Support */}
            {supportButtonEnabled && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "relative w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer",
                    "bg-white dark:bg-[#181818] hover:bg-zinc-50 dark:hover:bg-zinc-900/60",
                    "border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:shadow-xs animate-in fade-in zoom-in-95 duration-300"
                  )}>
                    <MessageCircle className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                    {hasUnreadMessages && (
                      <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-accent rounded-full border-2 border-white dark:border-[#181818]" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  side="right" 
                  align="end" 
                  sideOffset={12} 
                  className="w-80 p-4 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl shadow-xl z-50 animate-in fade-in-50 slide-in-from-left-4 duration-300"
                >
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Support</h3>
                      <span className="text-[10px] font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded-full">0 Offen</span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center border border-zinc-100 dark:border-zinc-800/50 mb-3 shadow-inner">
                        <MessageCircle className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                      </div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Keine Support-Anfragen</h4>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-[200px] leading-relaxed">
                        Sobald du Hilfe benötigst oder Fragen hast, kannst du einen neuen Support-Chat starten.
                      </p>
                    </div>
                    <div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                      <Link 
                        href="/support" 
                        className="flex items-center justify-center w-full py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all duration-200"
                      >
                        Support kontaktieren
                      </Link>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Notifications */}
            {notificationCenterEnabled && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "relative w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer",
                    "bg-white dark:bg-[#181818] hover:bg-zinc-50 dark:hover:bg-zinc-900/60",
                    "border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:shadow-xs animate-in fade-in zoom-in-95 duration-300"
                  )}>
                    <Bell className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                    {hasUnreadNotifications && (
                      <span className="absolute top-2.5 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#181818]" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  side="right" 
                  align="end" 
                  sideOffset={12} 
                  className="w-80 p-4 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl shadow-xl z-50 animate-in fade-in-50 slide-in-from-left-4 duration-300"
                >
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Benachrichtigungen</h3>
                      <span className="text-[10px] font-semibold bg-red-500/10 text-red-500 dark:text-red-400 px-2 py-0.5 rounded-full">0 Neu</span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center border border-zinc-100 dark:border-zinc-800/50 mb-3 shadow-inner">
                        <Bell className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                      </div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Alles erledigt!</h4>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-[200px] leading-relaxed">
                        Du bist auf dem neuesten Stand. Hier zeigen wir dir wichtige Updates zu deinen Immobilien.
                      </p>
                    </div>
                    <div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                      <Link 
                        href="/settings/notifications" 
                        className="flex items-center justify-center w-full py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all duration-200"
                      >
                        Einstellungen öffnen
                      </Link>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Profile Avatar / Settings */}
            <div className={cn(
              "w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer",
              "bg-white dark:bg-[#181818] hover:bg-zinc-50 dark:hover:bg-zinc-900/60",
              "border border-zinc-200/80 dark:border-zinc-800/80 hover:shadow-xs animate-in fade-in zoom-in-95 duration-300"
            )}>
              <UserSettings collapsed={true} initialData={sidebarData} />
            </div>
          </div>
        </div>

        {/* Right Column: Secondary Detail Panel (w-72, collapsible) */}
        <div 
          className={cn(
            "flex-1 flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden pt-0",
            isCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-[18rem] opacity-100"
          )}
        >
          {(() => {
            if (pathname === '/wohnungen' || pathname === '/haeuser') {
              return (
                <>
                  <div className="flex items-center justify-between pl-2 pr-1 h-11 shrink-0">
                    <span className="font-bold text-2xl tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">Übersicht</span>
                    {toggleCollapse && (
                      <button
                        onClick={toggleCollapse}
                        className="flex items-center justify-center rounded-2xl w-11 h-11 text-zinc-500 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 hover:text-zinc-950 dark:hover:text-zinc-50 transition-all duration-200 cursor-pointer"
                        title="Menü einklappen"
                      >
                        <PanelLeft className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Scrollable contents panel */}
                  <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-6 space-y-6 custom-scrollbar">
                    {isDataLoading && apartments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-400 dark:text-zinc-500">
                        <Loader2 className="h-6 w-6 animate-spin mb-2 text-accent" />
                        <span className="text-xs">Lade Kennzahlen...</span>
                      </div>
                    ) : (
                      <>
                        {/* Section 1 & 2: Unified Overview Container (Stats & Progress) */}
                        <div className="mt-5 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300 space-y-4">
                          {pathname === '/wohnungen' ? (
                            <div className="grid grid-cols-2 gap-4">
                              {/* Rented Units */}
                              <div>
                                <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Vermietet</div>
                                <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1">
                                  {apartmentStats.rentedCount}
                                  <span className="text-xs font-normal text-zinc-400">Einheiten</span>
                                </div>
                              </div>
                              {/* Vacant Units */}
                              <div>
                                <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Freistehend</div>
                                <div className={cn(
                                  "text-xl font-bold flex items-baseline gap-1",
                                  apartmentStats.freeCount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100"
                                )}>
                                  {apartmentStats.freeCount}
                                  <span className="text-xs font-normal text-zinc-400">Einheiten</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4">
                              {/* Houses count */}
                              <div>
                                <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Häuser</div>
                                <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1">
                                  {houseStats.total}
                                  <span className="text-xs font-normal text-zinc-400">Objekte</span>
                                </div>
                              </div>
                              {/* Portfolio total size */}
                              <div>
                                <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Gesamtfläche</div>
                                <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1">
                                  {new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(houseStats.totalSize)}
                                  <span className="text-xs font-normal text-zinc-400">m²</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Divider */}
                          <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/80 w-full" />

                          {/* Progress Widget (Occupancy) */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              <span>Auslastung</span>
                              <span className="text-accent">
                                {pathname === '/wohnungen' ? apartmentStats.occupancyRate : houseStats.occupancyRate}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden shadow-inner">
                              <div 
                                className="h-full bg-accent dark:bg-accent rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                                style={{ width: `${pathname === '/wohnungen' ? apartmentStats.occupancyRate : houseStats.occupancyRate}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                              {pathname === '/wohnungen' ? (
                                <>{apartmentStats.rentedCount} von {apartmentStats.total} Einheiten vermietet</>
                              ) : (
                                <>{houseStats.fullyOccupied} von {houseStats.total} Häusern voll belegt</>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Section 3: Financial Summary Box */}
                        <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300 space-y-3.5">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Soll-Miete (monatlich)</div>
                            <div className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
                                pathname === '/wohnungen' ? apartmentStats.totalRent : houseStats.totalRent
                              )}
                            </div>
                          </div>
                          <div className="h-px bg-zinc-200/60 dark:bg-zinc-800 w-full" />
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="text-zinc-400 dark:text-zinc-500 text-[10px] font-medium">
                                {pathname === '/wohnungen' ? 'Ø Miete / Einheit' : 'Ø Miete / m²'}
                              </div>
                              <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                                {pathname === '/wohnungen' ? (
                                  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(apartmentStats.avgRent)
                                ) : (
                                  <>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(houseStats.avgRentPerSqm)}/m²</>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-zinc-400 dark:text-zinc-500 text-[10px] font-medium">
                                {pathname === '/wohnungen' ? 'Ø Wohnungsgröße' : 'Gesamtfläche'}
                              </div>
                              <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 flex items-baseline gap-0.5">
                                {pathname === '/wohnungen' ? (
                                  <>{apartmentStats.avgSize} <span className="text-[10px] font-normal text-zinc-400 font-normal">m²</span></>
                                ) : (
                                  <>{new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(houseStats.totalSize)} <span className="text-[10px] font-normal text-zinc-400 font-normal">m²</span></>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section 3.5: Utility Meters / Houses Donut Insight Card */}
                        {pathname === '/wohnungen' ? (
                          <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                              <span>Zähler & Messgeräte</span>
                              <span className="text-zinc-500 font-semibold">{apartmentStats.metersTotal} Gesamt</span>
                            </div>
                            
                            <MetersDonutChart 
                              metersByType={apartmentStats.metersByType}
                              metersTotal={apartmentStats.metersTotal}
                              metersActive={apartmentStats.metersActive}
                            />
                          </div>
                        ) : (
                          <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                              <span>Wohnungsverteilung</span>
                              <span className="text-zinc-500 font-semibold">{houses.length} Gesamt</span>
                            </div>
                            
                            <HousesDonutChart 
                              houses={houses}
                              apartments={apartments}
                            />
                          </div>
                        )}

                        {/* Section 4: Quick Navigation / Shortcuts */}
                        <div className="space-y-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">Verknüpfte Bereiche</div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <Link
                              href="/haeuser"
                              className="group flex flex-col items-center justify-center p-3.5 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:border-accent/40 dark:hover:border-accent/40 shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer active:scale-95 text-center"
                            >
                              <Building2 className="h-5 w-5 mb-1.5 text-zinc-500 group-hover:text-accent dark:group-hover:text-accent transition-colors" />
                              <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Häuser</span>
                            </Link>
                            <Link
                              href="/mieter"
                              className="group flex flex-col items-center justify-center p-3.5 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:border-accent/40 dark:hover:border-accent/40 shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer active:scale-95 text-center"
                            >
                              <Users className="h-5 w-5 mb-1.5 text-zinc-500 group-hover:text-accent dark:group-hover:text-accent transition-colors" />
                              <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Mieter</span>
                            </Link>
                            <Link
                              href="/finanzen"
                              className="group flex flex-col items-center justify-center p-3.5 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:border-accent/40 dark:hover:border-accent/40 shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer active:scale-95 text-center"
                            >
                              <Wallet className="h-5 w-5 mb-1.5 text-zinc-500 group-hover:text-accent dark:group-hover:text-accent transition-colors" />
                              <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Finanzen</span>
                            </Link>
                            <Link
                              href="/betriebskosten"
                              className="group flex flex-col items-center justify-center p-3.5 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:border-accent/40 dark:hover:border-accent/40 shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer active:scale-95 text-center"
                            >
                              <FileSpreadsheet className="h-5 w-5 mb-1.5 text-zinc-500 group-hover:text-accent dark:group-hover:text-accent transition-colors" />
                              <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Nebenkosten</span>
                            </Link>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              );
            } else if (pathname === '/finanzen') {
              return (
                <>
                  <div className="flex items-center justify-between pl-2 pr-1 h-11 shrink-0">
                    <span className="font-bold text-2xl tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">Finanzen</span>
                    {toggleCollapse && (
                      <button
                        onClick={toggleCollapse}
                        className="flex items-center justify-center rounded-2xl w-11 h-11 text-zinc-500 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 hover:text-zinc-950 dark:hover:text-zinc-50 transition-all duration-200 cursor-pointer"
                        title="Menü einklappen"
                      >
                        <PanelLeft className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-6 space-y-6 custom-scrollbar">
                    {isDataLoading && finanzen.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-400 dark:text-zinc-500">
                        <Loader2 className="h-6 w-6 animate-spin mb-2 text-accent" />
                        <span className="text-xs">Lade Kennzahlen...</span>
                      </div>
                    ) : (
                      <>
                        {/* Section 1 & 2: Unified Overview Container (Stats & Progress) */}
                        <div className="mt-5 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Einnahmen */}
                            <div>
                              <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Einnahmen</div>
                              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1">
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(financeStats.totalIncome)}
                              </div>
                            </div>
                            {/* Ausgaben */}
                            <div>
                              <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Ausgaben</div>
                              <div className="text-xl font-bold text-red-600 dark:text-red-400 flex items-baseline gap-1">
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(financeStats.totalExpenses)}
                              </div>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/80 w-full" />

                          {/* Progress Widget (Cashflow Ratio) */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              <span>Flow-Quote</span>
                              <span className="text-accent">{financeStats.cashflowRatio}%</span>
                            </div>
                            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden shadow-inner">
                              <div 
                                className="h-full bg-accent dark:bg-accent rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                                style={{ width: `${Math.min(100, Math.max(0, financeStats.cashflowRatio))}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                              Überschuss von {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(financeStats.netCashflow)}
                            </div>
                          </div>
                        </div>

                        {/* Section 3: Financial Summary Card */}
                        <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300 space-y-3.5">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Netto-Cashflow (Portfolio)</div>
                            <div className={cn(
                              "text-2xl font-black tracking-tight",
                              financeStats.netCashflow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                            )}>
                              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(financeStats.netCashflow)}
                            </div>
                          </div>
                          <div className="h-px bg-zinc-200/60 dark:bg-zinc-800 w-full" />
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="text-zinc-400 dark:text-zinc-500 text-[10px] font-medium">Soll-Miete / Mon.</div>
                              <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(apartmentStats.totalRent)}
                              </div>
                            </div>
                            <div>
                              <div className="text-zinc-400 dark:text-zinc-500 text-[10px] font-medium">Ø Transaktion</div>
                              <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(financeStats.avgTransaction)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section 3.5: Finance Donut Chart */}
                        <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300">
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                            <span>Ausgaben-Verteilung</span>
                            <span className="text-zinc-500 font-semibold">{finanzen.length} Posten</span>
                          </div>
                          
                          <FinanceDonutChart finanzen={finanzen} />
                        </div>

                        {/* Quick Navigation / Shortcuts */}
                        <div className="space-y-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">Verknüpfte Bereiche</div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <Link
                              href="/wohnungen"
                              className="group flex flex-col items-center justify-center p-3.5 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:border-accent/40 dark:hover:border-accent/40 shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer active:scale-95 text-center"
                            >
                              <Home className="h-5 w-5 mb-1.5 text-zinc-500 group-hover:text-accent dark:group-hover:text-accent transition-colors" />
                              <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Wohnungen</span>
                            </Link>
                            <Link
                              href="/betriebskosten"
                              className="group flex flex-col items-center justify-center p-3.5 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:border-accent/40 dark:hover:border-accent/40 shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer active:scale-95 text-center"
                            >
                              <FileSpreadsheet className="h-5 w-5 mb-1.5 text-zinc-500 group-hover:text-accent dark:group-hover:text-accent transition-colors" />
                              <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Nebenkosten</span>
                            </Link>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              );
            } else if (pathname === '/mieter') {
              return (
                <>
                  <div className="flex items-center justify-between pl-2 pr-1 h-11 shrink-0">
                    <span className="font-bold text-2xl tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">Mieter</span>
                    {toggleCollapse && (
                      <button
                        onClick={toggleCollapse}
                        className="flex items-center justify-center rounded-2xl w-11 h-11 text-zinc-500 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 hover:text-zinc-950 dark:hover:text-zinc-50 transition-all duration-200 cursor-pointer"
                        title="Menü einklappen"
                      >
                        <PanelLeft className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-6 space-y-6 custom-scrollbar">
                    {isDataLoading && tenants.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-400 dark:text-zinc-500">
                        <Loader2 className="h-6 w-6 animate-spin mb-2 text-accent" />
                        <span className="text-xs">Lade Kennzahlen...</span>
                      </div>
                    ) : (
                      <>
                        {/* Section 1 & 2: Unified Overview Container (Stats & Progress) */}
                        <div className="mt-5 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Active tenants */}
                            <div>
                              <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Mieter</div>
                              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1">
                                {tenantStats.activeCount}
                                <span className="text-xs font-normal text-zinc-400">Aktive</span>
                              </div>
                            </div>
                            {/* Applicants pipeline */}
                            <div>
                              <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Bewerber</div>
                              <div className="text-xl font-bold text-accent flex items-baseline gap-1">
                                {tenantStats.applicantCount}
                                <span className="text-xs font-normal text-zinc-400">Pipeline</span>
                              </div>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/80 w-full" />

                          {/* Progress Widget (Occupancy) */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              <span>Auslastung (Wohnungen)</span>
                              <span className="text-accent">{apartmentStats.occupancyRate}%</span>
                            </div>
                            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden shadow-inner">
                              <div 
                                className="h-full bg-accent dark:bg-accent rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                                style={{ width: `${apartmentStats.occupancyRate}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                              {apartmentStats.rentedCount} von {apartmentStats.total} Wohnungen aktuell vermietet
                            </div>
                          </div>
                        </div>

                        {/* Section 3: Deposit (Kaution) Summary Card */}
                        <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300 space-y-3.5">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Mietkautionen (Gesamt)</div>
                            <div className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tenantStats.totalDeposit)}
                            </div>
                          </div>
                          <div className="h-px bg-zinc-200/60 dark:bg-zinc-800 w-full" />
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="text-zinc-400 dark:text-zinc-500 text-[10px] font-medium">Bezahlt</div>
                              <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(tenantStats.depositReceived)}
                              </div>
                            </div>
                            <div>
                              <div className="text-zinc-400 dark:text-zinc-500 text-[10px] font-medium">Ausstehend</div>
                              <div className="font-bold text-amber-500 mt-0.5">
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(tenantStats.depositOutstanding)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section 3.5: Tenants Donut Chart */}
                        <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300">
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                            <span>Kautionen-Abdeckung</span>
                            <span className="text-zinc-500 font-semibold">{tenants.length} Personen</span>
                          </div>
                          
                          <TenantsDonutChart tenants={tenants} />
                        </div>

                        {/* Quick Navigation / Shortcuts */}
                        <div className="space-y-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">Verknüpfte Bereiche</div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <Link
                              href="/wohnungen"
                              className="group flex flex-col items-center justify-center p-3.5 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:border-accent/40 dark:hover:border-accent/40 shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer active:scale-95 text-center"
                            >
                              <Home className="h-5 w-5 mb-1.5 text-zinc-500 group-hover:text-accent dark:group-hover:text-accent transition-colors" />
                              <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Wohnungen</span>
                            </Link>
                            <Link
                              href="/haeuser"
                              className="group flex flex-col items-center justify-center p-3.5 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:border-accent/40 dark:hover:border-accent/40 shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer active:scale-95 text-center"
                            >
                              <Building2 className="h-5 w-5 mb-1.5 text-zinc-500 group-hover:text-accent dark:group-hover:text-accent transition-colors" />
                              <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Häuser</span>
                            </Link>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              );
            } else if (pathname === '/betriebskosten') {
              return (
                <>
                  <div className="flex items-center justify-between pl-2 pr-1 h-11 shrink-0">
                    <span className="font-bold text-2xl tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">Nebenkosten</span>
                    {toggleCollapse && (
                      <button
                        onClick={toggleCollapse}
                        className="flex items-center justify-center rounded-2xl w-11 h-11 text-zinc-500 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 hover:text-zinc-950 dark:hover:text-zinc-50 transition-all duration-200 cursor-pointer"
                        title="Menü einklappen"
                      >
                        <PanelLeft className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-6 space-y-6 custom-scrollbar">
                    {isDataLoading && nebenkosten.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-400 dark:text-zinc-500">
                        <Loader2 className="h-6 w-6 animate-spin mb-2 text-accent" />
                        <span className="text-xs">Lade Kennzahlen...</span>
                      </div>
                    ) : (
                      <>
                        {/* Section 1 & 2: Unified Overview Container (Stats & Progress) */}
                        <div className="mt-5 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Total costs */}
                            <div>
                              <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Gesamtkosten</div>
                              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1">
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(nebenkostenStats.totalCosts)}
                              </div>
                            </div>
                            {/* Total billings */}
                            <div>
                              <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Abrechnungen</div>
                              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1">
                                {nebenkostenStats.billsCount}
                                <span className="text-xs font-normal text-zinc-400">Jahre</span>
                              </div>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/80 w-full" />

                          {/* Progress Widget (Houses coverage) */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              <span>Objekt-Abdeckung</span>
                              <span className="text-accent">{nebenkostenStats.housesCoverage}%</span>
                            </div>
                            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden shadow-inner">
                              <div 
                                className="h-full bg-accent dark:bg-accent rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                                style={{ width: `${nebenkostenStats.housesCoverage}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                              Abrechnungen erfasst für {Math.round((nebenkostenStats.housesCoverage / 100) * houses.length)} von {houses.length} Objekten
                            </div>
                          </div>
                        </div>

                        {/* Section 3: Financial Summary Card */}
                        <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300 space-y-3.5">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Ø Betriebskosten-Index</div>
                            <div className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(nebenkostenStats.avgCostPerSqm)} / m²
                            </div>
                          </div>
                          <div className="h-px bg-zinc-200/60 dark:bg-zinc-800 w-full" />
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="text-zinc-400 dark:text-zinc-500 text-[10px] font-medium">Ø pro Abrechnung</div>
                              <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(nebenkostenStats.avgCostPerBill)}
                              </div>
                            </div>
                            <div>
                              <div className="text-zinc-400 dark:text-zinc-500 text-[10px] font-medium">Gesamtfläche</div>
                              <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                                {new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(houses.reduce((sum, h) => {
                                  if (h.groesse && !isNaN(Number(h.groesse))) return sum + Number(h.groesse);
                                  const apts = apartments.filter(a => a.haus_id === h.id);
                                  return sum + apts.reduce((s, a) => s + Number(a.groesse || 0), 0);
                                }, 0))} m²
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section 3.5: Operating Costs Donut Chart */}
                        <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300">
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                            <span>Betriebskosten-Verteilung</span>
                            <span className="text-zinc-500 font-semibold">{nebenkosten.length} Belege</span>
                          </div>
                          
                          <NebenkostenDonutChart nebenkosten={nebenkosten} />
                        </div>

                        {/* Quick Navigation / Shortcuts */}
                        <div className="space-y-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">Verknüpfte Bereiche</div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <Link
                              href="/wohnungen"
                              className="group flex flex-col items-center justify-center p-3.5 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:border-accent/40 dark:hover:border-accent/40 shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer active:scale-95 text-center"
                            >
                              <Home className="h-5 w-5 mb-1.5 text-zinc-500 group-hover:text-accent dark:group-hover:text-accent transition-colors" />
                              <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Wohnungen</span>
                            </Link>
                            <Link
                              href="/finanzen"
                              className="group flex flex-col items-center justify-center p-3.5 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:border-accent/40 dark:hover:border-accent/40 shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer active:scale-95 text-center"
                            >
                              <Wallet className="h-5 w-5 mb-1.5 text-zinc-500 group-hover:text-accent dark:group-hover:text-accent transition-colors" />
                              <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Finanzen</span>
                            </Link>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              );
            } else {
              return (
                <>
                  <div className="flex items-center justify-between pl-2 pr-1 h-11 shrink-0">
                    <span className="font-bold text-2xl tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">Dashboard</span>
                    {toggleCollapse && (
                      <button
                        onClick={toggleCollapse}
                        className="flex items-center justify-center rounded-2xl w-11 h-11 text-zinc-500 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 hover:text-zinc-950 dark:hover:text-zinc-50 transition-all duration-200 cursor-pointer"
                        title="Menü einklappen"
                      >
                        <PanelLeft className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-6 space-y-6 custom-scrollbar">
                    {isDataLoading && (apartments.length === 0 || finanzen.length === 0) ? (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-400 dark:text-zinc-500">
                        <Loader2 className="h-6 w-6 animate-spin mb-2 text-accent" />
                        <span className="text-xs">Lade Kennzahlen...</span>
                      </div>
                    ) : (
                      <>
                        {/* Section 1 & 2: Unified Overview Container (Stats & Progress) */}
                        <div className="mt-5 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300 space-y-4">
                          <div className="grid grid-cols-3 gap-2">
                            {/* Houses */}
                            <div className="text-center">
                              <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Häuser</div>
                              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                {dashboardStats.totalHouses}
                              </div>
                            </div>
                            {/* Apartments */}
                            <div className="text-center border-x border-zinc-100 dark:border-zinc-800/60 px-1">
                              <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Wohnungen</div>
                              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                {dashboardStats.totalApartments}
                              </div>
                            </div>
                            {/* Tenants */}
                            <div className="text-center">
                              <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Mieter</div>
                              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                {dashboardStats.activeTenants}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section 3: Financial Summary Card (Rent Collection) */}
                        <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300 space-y-3.5">
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            <span>Mieteingang ({new Date().toLocaleString('de-DE', { month: 'long' })})</span>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-zinc-400 dark:text-zinc-500 text-[10px] font-medium">Ist-Miete</div>
                              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(dashboardStats.realRent)}
                              </div>
                            </div>
                            <div>
                              <div className="text-zinc-400 dark:text-zinc-500 text-[10px] font-medium">Soll-Miete</div>
                              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(dashboardStats.expectedRent)}
                              </div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-2 pt-1.5">
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              <span>Eingangsquote</span>
                              <span className="text-accent">{dashboardStats.rentCollectionProgress}%</span>
                            </div>
                            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden shadow-inner">
                              <div 
                                className="h-full bg-accent dark:bg-accent rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                                style={{ width: `${Math.min(100, Math.max(0, dashboardStats.rentCollectionProgress))}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Donut Chart: Portfolio-Verteilung by Expected Rent */}
                        {apartments.length > 0 && (
                          <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                              <span>Soll-Miete nach Häusern</span>
                            </div>
                            <HousesDonutChart houses={houses} apartments={apartments} />
                          </div>
                        )}

                        {/* Navigation Grid (Quick Shortcuts) */}
                        <div className="space-y-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">Verknüpfte Bereiche</div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <Link
                              href="/wohnungen"
                              className="group flex flex-col items-center justify-center p-3.5 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:border-accent/40 dark:hover:border-accent/40 shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer active:scale-95 text-center"
                            >
                              <Home className="h-5 w-5 mb-1.5 text-zinc-500 group-hover:text-accent dark:group-hover:text-accent transition-colors" />
                              <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Wohnungen</span>
                            </Link>
                            <Link
                              href="/haeuser"
                              className="group flex flex-col items-center justify-center p-3.5 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:border-accent/40 dark:hover:border-accent/40 shadow-xs hover:shadow-sm transition-all duration-300 cursor-pointer active:scale-95 text-center"
                            >
                              <Building2 className="h-5 w-5 mb-1.5 text-zinc-500 group-hover:text-accent dark:group-hover:text-accent transition-colors" />
                              <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Häuser</span>
                            </Link>
                          </div>
                        </div>

                        {/* Section 4: Secondary Links List */}
                        <div className="space-y-3 pt-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Einstellungen & Profil</div>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => { setSettingsInitialTab("profile"); setOpenSettingsModal(true); }}
                              className="group flex items-center gap-3 w-full px-1 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-50 transition-all duration-200 cursor-pointer text-left"
                            >
                              <User className="h-4 w-4 text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors" />
                              <span>Mein Profil</span>
                            </button>
                            <button
                              onClick={() => { setSettingsInitialTab("security"); setOpenSettingsModal(true); }}
                              className="group flex items-center gap-3 w-full px-1 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-50 transition-all duration-200 cursor-pointer text-left"
                            >
                              <Lock className="h-4 w-4 text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors" />
                              <span>Passwort ändern</span>
                            </button>
                            <button
                              onClick={() => { setSettingsInitialTab("display"); setOpenSettingsModal(true); }}
                              className="group flex items-center gap-3 w-full px-1 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-50 transition-all duration-200 cursor-pointer text-left"
                            >
                              <Settings className="h-4 w-4 text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors" />
                              <span>App-Einstellungen</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              );
            }
          })()}
        </div>
      </div>
      <SettingsModal open={openSettingsModal} onOpenChange={setOpenSettingsModal} initialTab={settingsInitialTab} />
      </>
    );
  }

  return (
    <>
    <div className="h-full w-full flex flex-col relative">
      {/* Header section */}
      <div className={cn("flex items-center pb-4", isCollapsed ? "justify-center px-0" : "pl-4 pr-4 justify-between")}>
        {isCollapsed && !isMobile ? (
          <button
            onClick={toggleCollapse}
            className="group relative w-12 h-12 flex items-center justify-center rounded-xl hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 transition-all duration-300 shrink-0 focus:outline-none cursor-pointer active:scale-95"
            title="Menü ausklappen"
          >
            <div className="relative w-8 h-8 transition-all duration-300 group-hover:opacity-0 group-hover:scale-90">
              <Image
                src={LOGO_URL}
                alt="IV Logo"
                fill
                className="object-cover rounded-full"
                sizes="32px"
                unoptimized
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
              <PanelLeft className="h-5 w-5 text-zinc-900 dark:text-zinc-50" />
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
                className="flex items-center justify-center rounded-lg w-8 h-8 text-zinc-500 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 hover:text-zinc-950 dark:hover:text-zinc-50 transition-all duration-200 ml-auto shrink-0 z-50 focus:outline-none cursor-pointer hover:scale-105 active:scale-95"
                title="Menü einklappen"
              >                <PanelLeft className="h-5 w-5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Tab Switcher & Search Row */}
      <div className={cn("px-5 pb-4 pt-1 flex items-center justify-center gap-2", isCollapsed && "flex-col justify-center gap-2")}>
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

          </TooltipProvider>
        </div>
      </div>

      {/* Navigation section */}
      <div className="flex-1 overflow-y-auto min-h-0 py-2 custom-scrollbar">
        {activeTab === 'tasks' ? (
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
                                  onClick={(e) => {
                                    if (item.href === ROUTES.SEARCH) {
                                      e.preventDefault();
                                      setOpen(true);
                                      return;
                                    }
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

      {/* Profile section - mobile only */}
      {isMobile && (
        <div className="pt-2 pb-4 flex flex-col gap-2 px-5 border-t border-border">
          <UserSettings collapsed={false} initialData={sidebarData} />
        </div>
      )}
    </div>
    <SettingsModal open={openSettingsModal} onOpenChange={setOpenSettingsModal} initialTab={settingsInitialTab} />
    </>
  )
}
