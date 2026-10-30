import { Suspense } from "react"
import DisplaySection from "@/components/settings/display-section"
import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons"

export default function DarstellungPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <DisplaySection />
    </Suspense>
  )
}

