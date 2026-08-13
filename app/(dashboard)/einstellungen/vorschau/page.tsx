import { Suspense } from "react"
import FeaturePreviewSection from "@/components/settings/feature-preview-section"
import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function VorschauPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <FeaturePreviewSection />
    </Suspense>
  )
}

