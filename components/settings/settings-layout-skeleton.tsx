import {
  SETTINGS_CONTENT_CLASS,
  SETTINGS_LAYOUT_CLASS,
  SETTINGS_SIDEBAR_CLASS,
} from "@/components/settings/settings-layout-classes"
import { Skeleton } from "@/components/ui/skeleton"

// Static Suspense fallback of the settings layout: the sidebar with a search field and the "Konto" group,
// next to the content area. It needs no data. Tabs that depend on permissions or feature flags (E-Mail, KI,
// API-Keys, MCP-Server) are left out because they are unknown before the layout resolves; the "Konto" group
// always has these seven entries (Profil, Sicherheit, Abo, Darstellung, Datenexport, Vorschau, Mietevo).

const ALWAYS_VISIBLE_TAB_COUNT = 7

export function SettingsLayoutSkeleton() {
  return (
    <div className={SETTINGS_LAYOUT_CLASS} role="status" aria-busy="true" aria-label="Wird geladen">
      <div className={SETTINGS_SIDEBAR_CLASS}>
        <div className="p-3 pb-2">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="px-2 pb-3">
          {/* The real label is a full text line of 19px (text-[11px] inherits the page line height) */}
          <div className="px-2.5 pb-1 pt-2">
            <div className="flex h-[19px] items-center">
              <Skeleton className="h-2.5 w-12" />
            </div>
          </div>
          <div className="space-y-0.5">
            {Array.from({ length: ALWAYS_VISIBLE_TAB_COUNT }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
      <div className={SETTINGS_CONTENT_CLASS}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    </div>
  )
}
