import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isOrgAdminOrOwner, hasPermission } from "@/lib/permissions";
import McpSection from "@/components/settings/mcp-section";
import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons";

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

  const supabase = await createClient();

  // Fetch current active organisation
  const { data: orgData } = await supabase
    .from("Organisation")
    .select("id, name, mcp_zugriff_aktiviert")
    .maybeSingle();

  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <McpSection
        organisationId={orgData?.id}
        organisationName={orgData?.name}
        initialMcpZugriffAktiviert={orgData?.mcp_zugriff_aktiviert ?? true}
        hasVerwaltenPermission={true}
      />
    </Suspense>
  );
}
