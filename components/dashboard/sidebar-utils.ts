import type React from "react"
import { ROUTES } from "@/lib/constants"
import type { OrganisationItem } from "@/components/common/user-settings"
import { useOnboardingStore } from "@/hooks/use-onboarding-store"

// Plain helpers shared by the global navigation of the dashboard (PrimaryRail and DashboardSidebar); they live
// apart from sidebar-shared.tsx so that file only exports components and hooks.

export function getRoleLabel(role?: string): string {
  if (role === "owner") return "Eigentümer"
  if (role === "admin") return "Admin"
  return "Mitarbeiter"
}

// Safe hyphenated HTML id instead of raw slashes; the onboarding tour finds the entries by it (#sidebar-nav-<path>).
export function getNavItemId(href: string): string {
  return `sidebar-nav-${href.replace(/^\//, "").replace(/\//g, "-") || "home"}`
}

// Side effects of a click on an entry: "Suche" opens the command menu instead of navigating.
export function handleNavItemClick(
  event: React.MouseEvent,
  href: string,
  openCommandMenu: (open: boolean) => void,
): boolean {
  if (href === ROUTES.SEARCH) {
    event.preventDefault()
    openCommandMenu(true)
    return false
  }
  if (href === ROUTES.HOME) {
    useOnboardingStore.getState().completeStep("overview-open")
  }
  return true
}

export function getActiveOrganisationLabel(organisations: OrganisationItem[], currentOrgId: string | null) {
  const activeOrg = organisations.find((o) => o.organisation_id === currentOrgId)
  return {
    name: currentOrgId === null ? "Mietevo" : activeOrg?.name || "Mietevo",
    subtitle:
      currentOrgId === null ? "Immobilienverwaltung" : activeOrg ? getRoleLabel(activeOrg.rolle) : "Organisation",
  }
}
