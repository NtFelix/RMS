import type React from "react"
import { createServerClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { DashboardClientLayout } from "./dashboard-client-layout"

export default async function DashboardRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = cookies()
  const supabase = createServerClient(cookieStore)
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
