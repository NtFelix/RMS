import { Home, Key, Euro, Ruler } from "lucide-react"
import { PageSkeleton } from "@/components/skeletons/page-skeleton"
import { StatCardsSkeleton } from "@/components/skeletons/stat-cards-skeleton"

const ICON = "size-4 text-muted-foreground"

// Used as the Suspense fallback of page.tsx and as loading.tsx. It mirrors the list tab of client.tsx.
export function WohnungenSkeleton() {
  return (
    <PageSkeleton label="Wohnungen werden geladen" hideDescriptionOnMobile tabCount={2} buttonWidth="w-48">
      <StatCardsSkeleton
        cards={[
          { title: "Wohnungen gesamt", icon: <Home className={ICON} /> },
          { title: "Frei / Vermietet", icon: <Key className={ICON} /> },
          { title: "Ø Miete", icon: <Euro className={ICON} /> },
          { title: "Ø Preis pro m²", icon: <Ruler className={ICON} /> },
        ]}
      />
    </PageSkeleton>
  )
}
