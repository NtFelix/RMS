import type React from "react"
import {
  BarChart3, Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare,
  Folder, Mail, Search, Network, Bot,
} from "lucide-react"
import { ROUTES } from "@/lib/constants"

// Navigation of the dashboard sidebar. Kept free of client code so that DashboardLayoutSkeleton (prerendered)
// can show the same entries, with the same icons and labels, as the loaded sidebar.

export type SidebarNavItemType = {
  title: string;
  href: string;
  icon: React.ElementType;
};

export type SidebarNavGroupType = {
  label: string;
  items: SidebarNavItemType[];
};

export const sidebarNavGroups: SidebarNavGroupType[] = [
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
      {
        title: "KI-Agenten",
        href: "/agenten",
        icon: Bot,
      },
    ]
  }
];

export const SIDEBAR_MODULE_MAP: Record<string, string> = {
  '/haeuser': 'haeuser',
  '/wohnungen': 'wohnungen',
  '/mieter': 'mieter',
  '/finanzen': 'finanzen',
  '/betriebskosten': 'betriebskosten',
  '/todos': 'aufgaben',
  '/dateien': 'dokumente',
  '/organisation': 'organisation',
  '/agenten': 'agenten',
};

// Entries that only appear once their PostHog feature flag has loaded. The skeleton leaves them out, so they
// show up afterwards without moving the rest of the sidebar's chrome.
export const FEATURE_FLAGGED_NAV_HREFS: ReadonlySet<string> = new Set(['/dateien', '/mails', '/agenten'])
