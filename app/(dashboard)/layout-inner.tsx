"use client" // Make this a client component
import type React from "react"
import { AuthProvider } from "@/components/auth/auth-provider"
import { EmailVerificationNotifier } from '@/components/auth/email-verification-notifier'
import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import dynamic from 'next/dynamic'
import DashboardOverlayLoader from "./dashboard-overlay-loader"

const OnboardingTour = dynamic(
  () => import('@/components/onboarding/onboarding-tour').then(mod => mod.OnboardingTour),
  { ssr: false },
)

export default function DashboardInnerLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <EmailVerificationNotifier />
      </Suspense>
      <DashboardLayout>{children}</DashboardLayout>
      <DashboardOverlayLoader />
      <OnboardingTour />
    </AuthProvider>
  )
}
