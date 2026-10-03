import type { Metadata } from "next"
import { headers } from "next/headers"
import { CSPNonceSync } from "@/components/providers/csp-nonce-sync"
import DashboardInnerLayout from "./layout-inner"
import { requireActiveSubscription } from "@/lib/server/route-access"
import { getSidebarUserData } from "@/lib/server/user-data"
import { hasPermission } from "@/lib/permissions"
import { privateNoindexMetadata } from "@/lib/seo"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = privateNoindexMetadata

// Cloudflare Pages requires dynamic routes to be marked as edge

export default async function DashboardRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Ensure authentication and active subscription
  // This already fetches the user and profile, so we reuse them to avoid double fetching
  const { supabase, user, profile } = await requireActiveSubscription()

  // Pre-fetch all sidebar data on server to prevent loading flickers.
  // Modulrecht `kautionen: ansehen` (GH-6): nur UX für global gemountete Fenster (Menüpunkt "Kaution" im
  // Mieter-Bearbeiten-Fenster), unabhängig von der Seite. Der Kautionsdialog und die Datenbank prüfen erneut.
  // Bewusst nicht Teil von `getSidebarUserData` (das Modul hat keine Route und gehört nicht zu den Sidebar-Modulen).
  const [sidebarData, canViewKautionen] = await Promise.all([
    getSidebarUserData(supabase, user, profile),
    hasPermission("kautionen", "ansehen"),
  ])

  const nonce = (await headers()).get('x-nonce')

  return (
    <>
      <CSPNonceSync nonce={nonce} />
      <DashboardInnerLayout sidebarData={sidebarData} canViewKautionen={canViewKautionen}>
        {children}
      </DashboardInnerLayout>
    </>
  )
}
