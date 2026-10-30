import { Suspense } from "react"
import InformationSection from "@/components/settings/information-section"
import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons"

export default function MietevoPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <InformationSection />
    </Suspense>
  )
}

