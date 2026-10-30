// Class strings shared by the real settings layout (SettingsLayoutClient, SettingsSidebar) and its
// Suspense fallback (SettingsLayoutSkeleton), so the skeleton keeps the geometry of the loaded layout.

export const SETTINGS_LAYOUT_CLASS = "flex h-full gap-3 p-4"

export const SETTINGS_SIDEBAR_CLASS =
  "flex flex-col bg-white dark:bg-[#181818] relative border border-border/50 rounded-2xl shadow-xs w-56"

export const SETTINGS_CONTENT_CLASS = "flex-1 overflow-y-auto min-w-0 p-4"
