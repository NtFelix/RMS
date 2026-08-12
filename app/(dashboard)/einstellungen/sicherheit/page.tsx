import { Suspense } from "react"
import SecuritySection from "@/components/settings/security-section"
import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons"

export default function SicherheitPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <SecuritySection />
    </Suspense>
  )
}

