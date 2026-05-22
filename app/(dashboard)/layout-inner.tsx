"use client"

import type React from "react"
import { AuthProvider } from "@/components/auth/auth-provider"
import { EmailVerificationNotifier } from '@/components/auth/email-verification-notifier'
import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { NestedDialogProvider } from "@/components/ui/nested-dialog"
import dynamic from 'next/dynamic'
import DashboardOverlayLoader from "./dashboard-overlay-loader"
import { SidebarUserData } from "@/lib/server/user-data"

const OnboardingTour = dynamic(
  () => import('@/components/onboarding/onboarding-tour').then(mod => mod.OnboardingTour),
  { ssr: false },
)

export default function DashboardInnerLayout({
  children,
  sidebarData,
}: Readonly<{
  children: React.ReactNode
  sidebarData: SidebarUserData
}>) {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <EmailVerificationNotifier />
      </Suspense>
      <NestedDialogProvider>
        <DashboardLayout sidebarData={sidebarData}>
          {children}
        </DashboardLayout>
        <DashboardOverlayLoader />
      </NestedDialogProvider>
      <OnboardingTour />
    </AuthProvider>
  )
}
