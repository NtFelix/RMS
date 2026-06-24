import { createClient } from "@/utils/supabase/server"
import ProfileSection from "@/components/settings/profile-section"

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <ProfileSection
      initialUser={user
        ? {
            email: user.email ?? "",
            firstName: user.user_metadata?.first_name ?? "",
            lastName: user.user_metadata?.last_name ?? "",
          }
        : undefined}
    />
  )
}
