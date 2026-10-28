import { Users, BadgeCheck, Euro } from "lucide-react"
import { PageSkeleton } from "@/components/skeletons/page-skeleton"
import { StatCardsSkeleton } from "@/components/skeletons/stat-cards-skeleton"

const ICON = "size-4 text-muted-foreground"

// Used as the Suspense fallback of page.tsx and as loading.tsx. It mirrors the "Mieter" tab of
// client-wrapper.tsx; the real page nests its content in one extra flex column, hence `gap-6` on all widths.
export function MieterSkeleton() {
  return (
    <PageSkeleton
      label="Mieter werden geladen"
      gapClassName="gap-6"
      hideDescriptionOnMobile
      headerTitleWidth="w-40"
      headerDescriptionWidth="w-64"
      buttonWidth="w-44"
      tabCount={3}
      tabWidth="w-28"
      tabContainerWidth="sm:w-[380px]"
    >
      <StatCardsSkeleton
        cards={[
          { title: "Mieter gesamt", icon: <Users className={ICON} /> },
          { title: "Aktiv / Ehemalig", icon: <BadgeCheck className={ICON} /> },
          { title: "Ø Nebenkosten", icon: <Euro className={ICON} /> },
        ]}
      />
    </PageSkeleton>
  )
}
