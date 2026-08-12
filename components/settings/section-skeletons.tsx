import { Skeleton } from "@/components/ui/skeleton"
import { SettingsCard, SettingsSection } from "@/components/settings/shared"

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Persönliche Informationen"
        description="Verwalten Sie Ihre Profildaten und persönlichen Informationen."
      >
        <SettingsCard>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Skeleton className="h-9 w-32" />
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Rechnungsadresse"
        description="Verwalten Sie Ihre Rechnungsadresse für Rechnungen."
      >
        <SettingsCard>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex justify-end pt-4">
              <Skeleton className="h-9 w-48" />
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
}

export function SubscriptionSkeleton() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Aktueller Tarif"
        description="Übersicht Ihres gewählten Abonnements und Nutzungslimits."
      >
        <SettingsCard>
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
            <div className="pt-4 flex gap-4">
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-36" />
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
}

export function SettingsSectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <SettingsCard>
        <div className="space-y-4 py-2">
          <Skeleton className="h-20 w-full" />
        </div>
      </SettingsCard>
    </div>
  )
}
