import { Suspense } from "react"
import AISection from "@/components/settings/ai-section"
import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons"

export default function KIPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <AISection />
    </Suspense>
  )
}

