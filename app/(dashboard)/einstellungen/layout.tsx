import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { SettingsLayoutClient } from "./settings-layout-client";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function EinstellungenLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: orgData } = await supabase
    .from("Organisation")
    .select("api_zugriff_aktiviert")
    .single();

  const apiZugriffAktiviert = orgData?.api_zugriff_aktiviert ?? false;

  return (
    <SettingsLayoutClient apiZugriffAktiviert={apiZugriffAktiviert}>
      {children}
    </SettingsLayoutClient>
  );
}
