import type { Metadata } from "next"
import { SettingsLayoutClient } from "./settings-layout-client"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function EinstellungenLayout({ children }: { children: React.ReactNode }) {
  return <SettingsLayoutClient>{children}</SettingsLayoutClient>
}
