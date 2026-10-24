// Request-time reads live here so layout.tsx is a static shell. This gate loads the
// organisation flag and the admin/permission checks on each request and renders
// SettingsLayoutClient; children are rendered only inside the gate's returned SettingsLayoutClient.
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isOrgAdminOrOwner, hasPermission } from "@/lib/permissions";
import { SettingsLayoutClient } from "./settings-layout-client";

export async function SettingsLayoutGate({ children }: { children: React.ReactNode }) {
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
