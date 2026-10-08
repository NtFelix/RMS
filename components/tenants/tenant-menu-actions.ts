import { Tenant } from "@/types/Tenant"
import { Euro, Sparkles, FileText, type LucideIcon } from "lucide-react"

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
  { key: "vorlagen", label: "Vorlagen", icon: FileText },
]

export interface TenantActionsContext {
  templatesEnabled: boolean
  /**
   * Modulrecht `kautionen: ansehen` des Nutzers (GH-6). Ohne dieses Recht wird der Menüeintrag "Kaution" ausgeblendet.
   * Nur UX: Der Kautionsdialog bekommt seine Rechte autoritativ vom Server, die Datenbank prüft erneut.
   */
  canViewKautionen: boolean
}

export function getVisibleActions(tenant: Tenant, context: TenantActionsContext): TenantActionDef[] {
  return tenantActions.filter((action) => {
    if (action.key === "kaution" && !context.canViewKautionen) return false
    if (action.key === "datenblatt" && !tenant.bewerbung_metadaten) return false
    if (action.key === "vorlagen" && !context.templatesEnabled) return false
    return true
  })
}
