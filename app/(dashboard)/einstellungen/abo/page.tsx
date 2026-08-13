import { Suspense } from "react"
import SubscriptionSection from "@/components/settings/subscription-section"
import { SubscriptionSkeleton } from "@/components/settings/section-skeletons"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function AboPage() {
  return (
    <Suspense fallback={<SubscriptionSkeleton />}>
      <SubscriptionSection />
    </Suspense>
  )
}

