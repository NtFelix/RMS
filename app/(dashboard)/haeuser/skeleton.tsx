import { Building, Home, Key } from "lucide-react"
import { PageSkeleton } from "@/components/skeletons/page-skeleton"
import { StatCardsSkeleton } from "@/components/skeletons/stat-cards-skeleton"

const ICON = "size-4 text-muted-foreground"

// Used as the Suspense fallback of page.tsx and as loading.tsx. It mirrors the list tab of client-wrapper.tsx.
export function HaeuserSkeleton() {
  return (
    <PageSkeleton
      label="Häuser werden geladen"
      hideDescriptionOnMobile
      tabCount={2}
      headerTitleWidth="w-40"
      headerDescriptionWidth="w-64"
    >
      <StatCardsSkeleton
        cards={[
          { title: "Häuser gesamt", icon: <Building className={ICON} /> },
          { title: "Wohnungen gesamt", icon: <Home className={ICON} /> },
          { title: "Freie Wohnungen", icon: <Key className={ICON} /> },
        ]}
      />
    </PageSkeleton>
  )
}
