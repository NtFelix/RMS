import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ApiKeysSection from "@/components/settings/api-keys-section";
import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons";

export const instant = false;

export default async function ApiKeysPage() {
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
