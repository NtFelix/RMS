import { ShellPageSkeleton } from "@/components/dashboard/shell/page-skeleton"

// Suspense fallback of page.tsx and loading.tsx: same rail sections, top bar and row height as client-wrapper.tsx.
export function HaeuserSkeleton() {
  return (
    <ShellPageSkeleton
      label="Häuser werden geladen"
      title="Häuser"
      rail={[
        { label: "Ansichten", items: 2 },
        { label: "Kennzahlen", stats: 3 },
        { label: "Filter", items: 3 },
      ]}
    />
  )
}
