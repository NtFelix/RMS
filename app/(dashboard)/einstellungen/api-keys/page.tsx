import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

import ApiKeysSection from "@/components/settings/api-keys-section";
import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons";

export const instant = false;

export default async function ApiKeysPage() {
  // The API-keys tab is gated by the org-wide flag only: regular members must be able to
  // reach this page to submit key requests ("API-Key beantragen"). Approval actions are
  // permission-checked server-side (api_key_genehmigen RPC requires api_keys/genehmigen),
  // so opening the page to members does not expose approval capabilities.
  const supabase = await createClient();
  const { data: orgData } = await supabase
    .from("Organisation")
    .select("api_zugriff_aktiviert")
    .single();

  if (!orgData?.api_zugriff_aktiviert) {
    redirect("/einstellungen/profil");
  }

  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <ApiKeysSection />
    </Suspense>
  );
}
