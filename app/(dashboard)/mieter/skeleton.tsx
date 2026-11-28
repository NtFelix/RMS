import { ShellPageSkeleton } from "@/components/dashboard/shell/page-skeleton"

// Suspense fallback of page.tsx and loading.tsx: same rail sections, top bar and row height as client-wrapper.tsx.
// The Bewerber entry (feature flag) is not known yet and joins the rail with the page.
export function MieterSkeleton() {
  return (
    <ShellPageSkeleton
      label="Mieter werden geladen"
      title="Mieter"
      rail={[
        { label: "Ansichten", items: 2 },
        { label: "Kennzahlen", stats: 3 },
        { label: "Filter", items: 3 },
      ]}
      rowClassName="h-[69px]"
      avatar
    />
  )
}
