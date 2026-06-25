import { createClient } from "@/utils/supabase/server"
import { getUserProfileForSettings } from "@/app/user-profile-actions"
import { SettingsDataProvider } from "./settings-context"
import SettingsSidebarLayout from "./settings-layout"

export default async function EinstellungenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const [userResult, profileResult] = await Promise.all([
    supabase.auth.getUser(),
    getUserProfileForSettings(),
  ])

  const user = userResult.data?.user
  const profileError = !!(
    profileResult &&
    "error" in profileResult &&
    profileResult.error
  )
  const profile =
    profileResult && !("error" in profileResult) ? profileResult : null

  return (
    <SettingsDataProvider
      data={{
        email: user?.email ?? "",
        user: user
          ? {
              email: user.email ?? "",
              firstName: user.user_metadata?.first_name ?? "",
              lastName: user.user_metadata?.last_name ?? "",
            }
          : undefined,
        authUser: user ?? undefined,
        profile: profileError ? null : profile,
        profileError,
      }}
    >
      <SettingsSidebarLayout>{children}</SettingsSidebarLayout>
    </SettingsDataProvider>
  )
}
