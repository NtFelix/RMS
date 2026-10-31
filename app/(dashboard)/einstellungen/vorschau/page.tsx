import { Suspense } from "react"
import FeaturePreviewSection from "@/components/settings/feature-preview-section"
import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons"

export default function VorschauPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <FeaturePreviewSection />
    </Suspense>
  )
}

