import { headers } from "next/headers"
import { CSPNonceSync } from "@/components/providers/csp-nonce-sync"
import DashboardInnerLayout from "./layout-inner"
import { requireActiveSubscription } from "@/lib/server/route-access"
import { getSidebarUserData } from "@/lib/server/user-data"

// Cloudflare Pages requires dynamic routes to be marked as edge
export const runtime = 'edge'

export default async function DashboardRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Ensure authentication and active subscription
  await requireActiveSubscription()

  // Pre-fetch all sidebar data on server to prevent loading flickers
  const sidebarData = await getSidebarUserData()

  const nonce = (await headers()).get('x-nonce')

  return (
    <>
      <CSPNonceSync nonce={nonce} />
      <DashboardInnerLayout sidebarData={sidebarData}>
        {children}
      </DashboardInnerLayout>
    </>
  )
}
