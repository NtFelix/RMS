import { Tenant } from "@/types/Tenant"
import { Euro, Sparkles, FileText, UserCheck, type LucideIcon } from "lucide-react"

export interface TenantActionDef {
  key: string
  label: string
  icon: LucideIcon
  className?: string
  destructive?: boolean
}

export const tenantActions: TenantActionDef[] = [
  { key: "kaution", label: "Kaution", icon: Euro },
  { key: "datenblatt", label: "Datenblatt (AI)", icon: Sparkles, className: "text-indigo-600 dark:text-indigo-400" },
  { key: "uebernehmen", label: "Als Mieter übernehmen", icon: UserCheck, className: "text-emerald-600 dark:text-emerald-400" },
  { key: "vorlagen", label: "Vorlagen", icon: FileText },
]

export interface TenantActionsContext {
  templatesEnabled: boolean
  /**
   * Modulrecht `kautionen: ansehen` des Nutzers (GH-6). Ohne dieses Recht wird der Menüeintrag "Kaution" ausgeblendet.
   * Nur UX: Der Kautionsdialog bekommt seine Rechte autoritativ vom Server, die Datenbank prüft erneut.
   */
  canViewKautionen: boolean
  /** Recht zum Bearbeiten (Modul `mieter`). Ohne Recht wird "Als Mieter übernehmen" ausgeblendet. Standard: erlaubt. */
  canEdit?: boolean
}

export function getVisibleActions(tenant: Tenant, context: TenantActionsContext): TenantActionDef[] {
  return tenantActions.filter((action) => {
    // Bewerber haben noch kein Mietverhältnis und daher keine Kaution.
    if (action.key === "kaution" && (!context.canViewKautionen || tenant.status === "bewerber")) return false
    if (action.key === "datenblatt" && !tenant.bewerbung_metadaten) return false
    if (action.key === "uebernehmen" && (tenant.status !== "bewerber" || context.canEdit === false)) return false
    if (action.key === "vorlagen" && !context.templatesEnabled) return false
    return true
  })
}
