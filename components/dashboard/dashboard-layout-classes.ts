// Class strings shared by DashboardLayout, PrimaryRail and DashboardLayoutSkeleton. The skeleton is the Suspense
// fallback of the dashboard layout and the hydration fallback of DashboardLayout, so it must keep the
// geometry of the real shell; sharing the strings keeps the two from drifting apart.
//
// Shell: `surface-outer` background, icon rail without a container on the left, and one rounded container
// (secondary rail + main area) next to it. The viewport does not scroll, only the parts inside the container do.

export const DASHBOARD_ROOT_CLASS = "flex h-dvh w-full max-w-full overflow-hidden bg-surface-outer"

export const DASHBOARD_RAIL_CLASS = "flex h-full w-[60px] shrink-0 flex-col items-center py-2.5"

export const DASHBOARD_RAIL_ITEM_CLASS = "flex size-10 shrink-0 items-center justify-center rounded-xl"

export const DASHBOARD_RAIL_SEPARATOR_CLASS = "my-2 h-px w-6 shrink-0 bg-border-subtle"

// Spacing between the container and the viewport edge (none on the left, the rail provides it).
export const DASHBOARD_FRAME_CLASS = "min-w-0 flex-1 py-2 pr-2"

export const DASHBOARD_CONTAINER_CLASS =
  "relative flex h-full overflow-hidden rounded-2xl border border-border-subtle bg-surface-container shadow-sm"

export const DASHBOARD_MAIN_CLASS = "mobile-smooth-scroll relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
