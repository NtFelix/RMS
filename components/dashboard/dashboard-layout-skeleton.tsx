import Image from "next/image"
import { LOGO_URL } from "@/lib/constants"
import {
  FEATURE_FLAGGED_NAV_HREFS,
  sidebarNavGroups,
} from "@/components/dashboard/sidebar-nav-config"
import {
  DASHBOARD_CARD_CLASS,
  DASHBOARD_MAIN_CLASS,
  DASHBOARD_ROOT_CLASS,
  DASHBOARD_SIDEBAR_CLASS,
} from "@/components/dashboard/dashboard-layout-classes"

// Static skeleton of the dashboard shell: sidebar (brand header, navigation, user area), the rounded
// content card and the mobile bottom navigation. It needs no request data and no client state, so it can
// be prerendered as the Suspense fallback of the dashboard layout and is also used by DashboardLayout
// while it hydrates. Desktop and mobile are switched with CSS only (see the responsive utilities in
// globals.css), so the prerendered HTML is correct for both without JavaScript.

// The navigation of an owner without feature-flagged entries (Dashboard, Suche, Organisationen, Häuser,
// Wohnungen, Mieter, Finanzen, Betriebskosten, Aufgaben); which entries a user sees is not known up front.
// The entries are the real ones (icon and label), so the swap to the loaded sidebar changes nothing the user can
// see except the highlighted entry and the user area. The collapsed tablet layout (max-lg, see TABLET_BREAKPOINT)
// is done with CSS, as the loaded sidebar collapses at the same width.
const NAV_ITEMS = sidebarNavGroups.flatMap((group) =>
  group.items.filter((item) => !FEATURE_FLAGGED_NAV_HREFS.has(item.href)),
)
const MOBILE_NAV_ITEM_COUNT = 5

export function DashboardLayoutSkeleton() {
  return (
    <div className={DASHBOARD_ROOT_CLASS} role="status" aria-busy="true" aria-label="Wird geladen">
      <div className={`${DASHBOARD_SIDEBAR_CLASS} w-64 max-lg:w-[4.5rem]`}>
        <div className="flex h-full w-full flex-col p-2.5">
          {/* Brand header (organisation switcher): the real logo and the default name of the private workspace */}
          <div className="mb-2.5 flex w-full shrink-0 items-center px-1.5 pb-1.5 max-lg:justify-center max-lg:px-0">
            <div className="flex min-h-[40px] w-full items-center gap-2.5 p-1 pl-1 pr-2 max-lg:size-10 max-lg:justify-center max-lg:pr-1">
              <div className="relative size-8 min-h-8 min-w-8 shrink-0 overflow-hidden rounded-lg shadow-2xs">
                <Image src={LOGO_URL} alt="" fill className="rounded-lg object-cover" sizes="32px" unoptimized />
              </div>
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden text-left max-lg:hidden">
                <span className="truncate text-sm font-bold leading-tight text-zinc-900 dark:text-zinc-100">Mietevo</span>
                <span className="truncate text-[11px] font-medium leading-tight text-zinc-500 dark:text-zinc-400">
                  Immobilienverwaltung
                </span>
              </div>
            </div>
          </div>
          {/* Navigation: h-10 rows with gap-1.5, like the real nav links */}
          <div className="min-h-0 flex-1 p-1.5 max-lg:flex max-lg:flex-col max-lg:items-center max-lg:px-0 max-lg:py-1.5">
            <div className="grid w-full gap-1.5 max-lg:justify-items-center">
              {NAV_ITEMS.map((item) => (
                <div
                  key={item.href}
                  className="flex h-10 w-full items-center justify-start rounded-xl px-3 text-sm font-medium text-muted-foreground max-lg:mx-auto max-lg:w-10 max-lg:justify-center max-lg:px-0"
                >
                  <item.icon className="size-4 min-w-4 shrink-0" />
                  <span className="ml-3 flex-1 truncate max-lg:hidden">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
          {/* User area: avatar, name, apartment counter and progress bar */}
          <div className="flex shrink-0 flex-col gap-2 border-t border-border px-1.5 py-2.5 max-lg:items-center max-lg:px-0">
            <div className="flex items-center p-1 pr-2">
              <div className="size-10 shrink-0 rounded-full bg-muted animate-pulse" />
              <div className="ml-3 flex flex-1 flex-col gap-1.5 max-lg:hidden">
                <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                <div className="h-1.5 w-full rounded-full bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className={`${DASHBOARD_MAIN_CLASS} max-md:pl-3`}>
        <div className={DASHBOARD_CARD_CLASS}>
          <div className="flex flex-col gap-4 p-8">
            <div className="h-8 w-1/3 rounded bg-muted animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </main>

      {/* Mobile navigation placeholder */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background mobile-nav-responsive hydration-safe-mobile prevent-layout-shift"
        aria-hidden="true"
      >
        <div className="flex h-16 items-center justify-around px-2 py-2">
          {Array.from({ length: MOBILE_NAV_ITEM_COUNT }).map((_, i) => (
            <div key={i} className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center px-2 py-1">
              <div className="mb-1 size-5 rounded bg-muted animate-pulse" />
              <div className="h-3 w-8 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}
