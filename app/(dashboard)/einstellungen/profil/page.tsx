import { Suspense } from "react"
import ProfileSection from "@/components/settings/profile-section"
import { ProfileSkeleton } from "@/components/settings/section-skeletons"

export default function ProfilPage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileSection />
    </Suspense>
  )
}

