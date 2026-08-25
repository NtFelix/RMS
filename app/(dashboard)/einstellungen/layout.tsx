import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isOrgAdminOrOwner, hasPermission } from "@/lib/permissions";
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
  const supabase = await createSupabaseServerClient();
  const [{ data: orgData }, isAdminOrOwner, canManagePermission] = await Promise.all([
    supabase
      .from("Organisation")
      .select("api_zugriff_aktiviert")
      .single(),
    isOrgAdminOrOwner(),
    hasPermission("organisation", "verwalten"),
  ]);

  const apiZugriffAktiviert = orgData?.api_zugriff_aktiviert ?? false;
  const canManageOrg = isAdminOrOwner || canManagePermission;

  return (
    <SettingsLayoutClient
      apiZugriffAktiviert={apiZugriffAktiviert}
      canManageOrg={canManageOrg}
    >
      {children}
    </SettingsLayoutClient>
  );
}
