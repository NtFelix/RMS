import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isOrgAdminOrOwner, hasPermission } from "@/lib/permissions";
import McpSection from "@/components/settings/mcp-section";
import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons";
import { type UserMcpAuthorizationRecord } from "@/app/oauth/consent/actions";

export const instant = false;

export default async function McpSettingsPage() {
  const [isAdminOrOwner, canManagePermission] = await Promise.all([
    isOrgAdminOrOwner(),
    hasPermission("organisation", "verwalten"),
  ]);
  const canManageOrg = isAdminOrOwner || canManagePermission;

  if (!canManageOrg) {
    redirect("/einstellungen/profil");
  }

  const supabase = await createSupabaseServerClient();

  // Fetch current active organisation and user's MCP authorizations concurrently
  const [{ data: orgData }, { data: authorizationsData }] = await Promise.all([
    supabase
      .from("Organisation")
      .select("id, name, mcp_zugriff_aktiviert")
      .maybeSingle(),
    supabase
      .from("MCP_Nutzer_Autorisierungen")
      .select("id, client_id, client_name, client_icon, redirect_uri, erlaubte_organisations_ids, alle_erlaubt, scopes, zuletzt_verwendet_am, erstellt_am, geaendert_am")
      .order("zuletzt_verwendet_am", { ascending: false, nullsFirst: false }),
  ]);

  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <McpSection
        organisationId={orgData?.id}
        organisationName={orgData?.name}
        initialMcpZugriffAktiviert={orgData?.mcp_zugriff_aktiviert ?? true}
        initialAuthorizations={(authorizationsData as UserMcpAuthorizationRecord[]) || []}
        hasVerwaltenPermission={true}
      />
    </Suspense>
  );
}

