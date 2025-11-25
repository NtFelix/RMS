import type React from "react"
import { createClient } from "@/utils/supabase/server"
import { DashboardClientLayout } from "./dashboard-client-layout"

export default async function DashboardRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let onboardingCompleted = true
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single()
    onboardingCompleted = profile?.onboarding_completed ?? true
  }

  return (
    <DashboardClientLayout onboardingCompleted={onboardingCompleted}>
      {children}
    </DashboardClientLayout>
  )
}
