import { Suspense } from "react"
import DisplaySection from "@/components/settings/display-section"
import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function DarstellungPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <DisplaySection />
    </Suspense>
  )
}

