import type { Metadata } from "next"
import { SettingsLayoutClient } from "./settings-layout-client"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function EinstellungenLayout({ children }: { children: React.ReactNode }) {
  return <SettingsLayoutClient>{children}</SettingsLayoutClient>
}
