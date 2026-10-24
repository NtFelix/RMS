// Holds all request-time work of the dashboard layout: authentication, the
// active-subscription gate, sidebar data, the Modulrecht check for Kautionen and
// the CSP nonce. `layout.tsx` stays a static shell and wraps this component in a
// Suspense boundary, so the 26 dashboard routes can be prerendered.
//
// The gate returns `children` inside its own output, so a redirect or throw from
// `requireActiveSubscription()` means they are not rendered by this tree. Do not rely on that
// for access control, though: pages, server actions and API routes must check authentication
// and permissions themselves (plus RLS in the database).
//
// The redirect now streams after the static shell (HTTP 200 plus a client-side redirect)
// instead of being a 307 sent before any HTML, as the previous async layout did.
//
// The gate runs only when the layout renders (not on every soft navigation),
// the same as the previous async layout.

import { headers } from "next/headers"
import { CSPNonceSync } from "@/components/providers/csp-nonce-sync"
import { KautionenRechtSync } from "@/components/kaution/kautionen-recht-sync"
import DashboardInnerLayout from "./layout-inner"
import { requireActiveSubscription } from "@/lib/server/route-access"
import { getSidebarUserData } from "@/lib/server/user-data"
import { canViewKautionen as ladeCanViewKautionen } from "@/lib/server/kautionen-recht"

export async function DashboardGate({
  children,
}: {
  children: React.ReactNode
}) {
  // Ensure authentication and active subscription
  // This already fetches the user and profile, so we reuse them to avoid double fetching
  const { supabase, user, profile } = await requireActiveSubscription()

  // Pre-fetch all sidebar data on server to prevent loading flickers.
  // Modulrecht `kautionen: ansehen` (GH-6): nur UX für global gemountete Fenster (Menüpunkt "Kaution" im
  // Mieter-Bearbeiten-Fenster), unabhängig von der Seite. Der Kautionsdialog und die Datenbank prüfen erneut.
  // Bewusst nicht Teil von `getSidebarUserData` (das Modul hat keine Route und gehört nicht zu den Sidebar-Modulen).
  const [sidebarData, canViewKautionen] = await Promise.all([
    getSidebarUserData(supabase, user, profile),
    ladeCanViewKautionen(),
  ])

  const nonce = (await headers()).get('x-nonce')

  return (
    <>
      <CSPNonceSync nonce={nonce} />
      {/* Modulrecht "Kautionen" für global gemountete Fenster (Menüpunkt "Kaution" im Mieter-Bearbeiten-Fenster) */}
      <KautionenRechtSync canViewKautionen={canViewKautionen} userId={user.id} />
      <DashboardInnerLayout sidebarData={sidebarData}>
        {children}
      </DashboardInnerLayout>
    </>
  )
}
