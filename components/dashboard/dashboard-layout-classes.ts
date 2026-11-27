// Class strings shared by DashboardLayout, PrimaryRail and DashboardLayoutSkeleton. The skeleton is the Suspense
// fallback of the dashboard layout and the hydration fallback of DashboardLayout, so it must keep the
// geometry of the real shell; sharing the strings keeps the two from drifting apart.
//
// Shell: `surface-outer` background, icon rail without a container on the left, and one rounded container
// (secondary rail + main area) next to it. The viewport does not scroll, only the parts inside the container do.

export const DASHBOARD_ROOT_CLASS = "flex h-dvh w-full max-w-full overflow-hidden bg-surface-outer"

export const DASHBOARD_RAIL_CLASS = "flex h-full w-[60px] shrink-0 flex-col items-center py-2.5 sm:w-[68px]"

export const DASHBOARD_RAIL_ITEM_CLASS = "flex size-10 shrink-0 items-center justify-center rounded-xl"

// Navigation entry: a rounded rectangle tile around the icon (hover and active state) with a small label below it.
// On phones the rail stays narrow (icon only, label for screen readers) so the work area keeps its width.
export const DASHBOARD_RAIL_NAV_ITEM_CLASS =
  "group flex shrink-0 flex-col items-center justify-center outline-none sm:w-16 sm:gap-1 sm:py-1"

// Square tile with a small fixed radius (the theme's rounded-lg is 16px and would turn it into a pill)
export const DASHBOARD_RAIL_NAV_TILE_CLASS =
  "flex size-10 items-center justify-center rounded-[10px] group-focus-visible:ring-2 group-focus-visible:ring-ring"

export const DASHBOARD_RAIL_NAV_LABEL_CLASS = "w-full truncate text-center text-[10px] leading-tight max-sm:sr-only"

// Spacing between the container and the viewport edge (none on the left, the rail provides it).
export const DASHBOARD_FRAME_CLASS = "min-w-0 flex-1 py-2 pr-2"

export const DASHBOARD_CONTAINER_CLASS =
  "relative flex h-full overflow-hidden rounded-shell border border-border-subtle bg-surface-container shadow-sm"

// Slim bar on top of the work area (PageTopBar and the page skeletons share it, so loading does not shift the content).
// box-content: the height is the bar's content box, the bottom border comes on top.
export const SHELL_BAR_CLASS =
  "box-content flex h-shell-bar shrink-0 items-center gap-2 border-b border-border-subtle pl-4 pr-shell-bar-inset"

export const DASHBOARD_MAIN_CLASS = "mobile-smooth-scroll relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
