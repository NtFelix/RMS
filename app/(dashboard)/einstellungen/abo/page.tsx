import { getUserProfileForSettings } from '@/app/user-profile-actions'
import SubscriptionSection from "@/components/settings/subscription-section"

export default async function AboPage() {
  const profile = await getUserProfileForSettings()

  return <SubscriptionSection initialProfile={profile} />
}
