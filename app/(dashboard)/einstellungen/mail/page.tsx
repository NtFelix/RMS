import { Suspense } from "react"
import MailSection from "@/components/settings/mail-section"
import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons"

export default function MailPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <MailSection />
    </Suspense>
  )
}

