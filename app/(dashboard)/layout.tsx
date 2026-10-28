import type { Metadata } from "next"
import { Suspense } from "react"
import { DashboardGate } from "./dashboard-gate"
import { DashboardLayoutSkeleton } from "@/components/dashboard/dashboard-layout-skeleton"
import { privateNoindexMetadata } from "@/lib/seo"

export const metadata: Metadata = privateNoindexMetadata

// Static shell: no request-time work happens here. All auth, subscription and
// sidebar work lives in DashboardGate, which runs inside the Suspense boundary.
export default function DashboardRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense fallback={<DashboardLayoutSkeleton />}>
      <DashboardGate>{children}</DashboardGate>
    </Suspense>
  )
}
