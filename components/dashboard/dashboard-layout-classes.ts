// Class strings shared by DashboardLayout and DashboardLayoutSkeleton. The skeleton is the Suspense
// fallback of the dashboard layout and the hydration fallback of DashboardLayout, so it must keep the
// geometry of the real shell; sharing the strings keeps the two from drifting apart.

export const DASHBOARD_ROOT_CLASS = "flex min-h-screen bg-background w-full max-w-full"

export const DASHBOARD_SIDEBAR_CLASS =
  "desktop-sidebar-responsive hydration-safe-desktop prevent-layout-shift overflow-hidden h-screen sticky top-0"

export const DASHBOARD_MAIN_CLASS =
  "flex flex-1 flex-col min-h-0 overflow-hidden main-content-responsive responsive-transition py-3 pr-3 pl-0"

export const DASHBOARD_CARD_CLASS =
  "flex-1 border shadow-xs bg-white dark:bg-[#181818] relative overflow-y-auto overflow-x-hidden rounded-[2rem] md:rounded-[2.5rem] responsive-transition prevent-layout-shift mobile-smooth-scroll mb-0"
