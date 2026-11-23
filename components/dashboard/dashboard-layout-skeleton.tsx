import Image from "next/image"
import { LOGO_URL } from "@/lib/constants"
import {
  FEATURE_FLAGGED_NAV_HREFS,
  sidebarNavGroups,
} from "@/components/dashboard/sidebar-nav-config"
import {
  DASHBOARD_CONTAINER_CLASS,
  DASHBOARD_FRAME_CLASS,
  DASHBOARD_MAIN_CLASS,
  DASHBOARD_RAIL_CLASS,
  DASHBOARD_RAIL_ITEM_CLASS,
  DASHBOARD_RAIL_NAV_ITEM_CLASS,
  DASHBOARD_RAIL_NAV_LABEL_CLASS,
  DASHBOARD_RAIL_NAV_TILE_CLASS,
  DASHBOARD_ROOT_CLASS,
} from "@/components/dashboard/dashboard-layout-classes"

// Static skeleton of the dashboard shell: icon rail (organisation, navigation groups, user), the rounded
// container and a placeholder page. It needs no request data and no client state, so it can be prerendered as the
// Suspense fallback of the dashboard layout and is also used by DashboardLayout while it hydrates. The geometry
// is the same on every viewport (the rail stays visible on phones), so it needs no responsive switching.
// The secondary rail is left out: whether a page has one is only known once the page has rendered.

// The navigation of an owner without feature-flagged entries (Dashboard, Suche, Organisationen, Häuser,
// Wohnungen, Mieter, Finanzen, Betriebskosten, Aufgaben); which entries a user sees is not known up front.
// The entries are the real ones (icon and label), so the swap to the loaded rail changes nothing the user can
// see except the highlighted entry and the user area.
const NAV_ITEMS = sidebarNavGroups
  .flatMap((group) => group.items)
  .filter((item) => !FEATURE_FLAGGED_NAV_HREFS.has(item.href))

export function DashboardLayoutSkeleton() {
  return (
    <div className={DASHBOARD_ROOT_CLASS} role="status" aria-busy="true" aria-label="Wird geladen">
      <aside className={DASHBOARD_RAIL_CLASS}>
        {/* Organisation switcher: the real logo */}
        <div className={DASHBOARD_RAIL_ITEM_CLASS}>
          <div className="relative size-8 overflow-hidden rounded-lg shadow-2xs">
            <Image src={LOGO_URL} alt="" fill className="rounded-lg object-cover" sizes="32px" unoptimized />
          </div>
        </div>

        <div className="mt-2 flex min-h-0 w-full flex-1 flex-col items-center overflow-hidden">
          <div className="flex flex-col items-center gap-0.5">
            {NAV_ITEMS.map((item) => (
              <div key={item.href} className={`${DASHBOARD_RAIL_NAV_ITEM_CLASS} text-muted-foreground`}>
                <span className={DASHBOARD_RAIL_NAV_TILE_CLASS}>
                  <item.icon className="size-5 shrink-0" aria-hidden="true" />
                </span>
                <span className={`${DASHBOARD_RAIL_NAV_LABEL_CLASS} font-medium`}>{item.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User menu: avatar */}
        <div className="flex w-full shrink-0 flex-col items-center pt-2">
          <div className="size-10 rounded-full bg-muted animate-pulse" />
        </div>
      </aside>

      <div className={DASHBOARD_FRAME_CLASS}>
        <div className={DASHBOARD_CONTAINER_CLASS}>
          <main className={DASHBOARD_MAIN_CLASS}>
            <div className="flex flex-col gap-4 p-8">
              <div className="h-8 w-1/3 rounded bg-muted animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
