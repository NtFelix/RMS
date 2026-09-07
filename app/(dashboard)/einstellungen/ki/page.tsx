import { Suspense } from "react"
import AISection from "@/components/settings/ai-section"
import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function KIPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <AISection />
    </Suspense>
  )
}

