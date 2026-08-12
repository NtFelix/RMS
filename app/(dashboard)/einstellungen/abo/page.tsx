import { Suspense } from "react"
import SubscriptionSection from "@/components/settings/subscription-section"
import { SubscriptionSkeleton } from "@/components/settings/section-skeletons"

export default function AboPage() {
  return (
    <Suspense fallback={<SubscriptionSkeleton />}>
      <SubscriptionSection />
    </Suspense>
  )
}

