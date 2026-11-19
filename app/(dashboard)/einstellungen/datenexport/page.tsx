import { Suspense } from "react"
import { redirect } from "next/navigation"
import { isOrgAdminOrOwner } from "@/lib/permissions"
import ExportSection from "@/components/settings/export-section"
import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons"

export default async function DatenexportPage() {
  // Convenience only: GET /api/export enforces owner/admin on the server
  if (!(await isOrgAdminOrOwner())) {
    redirect("/einstellungen/profil")
  }

  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <ExportSection />
    </Suspense>
  )
}
