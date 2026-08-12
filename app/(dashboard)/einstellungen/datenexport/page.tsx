import { Suspense } from "react"
import ExportSection from "@/components/settings/export-section"
import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons"

export default function DatenexportPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <ExportSection />
    </Suspense>
  )
}

