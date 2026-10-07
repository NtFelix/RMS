"use client"

import * as React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Edit, User, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { deleteTenantAction } from "@/app/mieter-actions"
import { starteLoeschenMitKautionen, type Pruefsummen } from "@/lib/kautionen-loeschen"
import { useModalStore } from "@/hooks/use-modal-store"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { tenantActions, getVisibleActions, type TenantActionDef } from "@/components/tenants/tenant-menu-actions"

import { Tenant } from "@/types/Tenant";

interface TenantContextMenuProps {
  children: React.ReactNode
  tenant: Tenant
  onEdit: () => void
  onRefresh: () => void
  canEdit?: boolean
  canDelete?: boolean
  /** Modulrecht `kautionen: ansehen` (GH-6): ohne dieses Recht fehlt der Menüeintrag "Kaution". Standard: kein Recht. */
  canViewKautionen?: boolean
}

export function TenantContextMenu({
  children,
  tenant,
  onEdit,
  onRefresh,
  canEdit = true,
  canDelete = true,
  canViewKautionen = false,
}: TenantContextMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const { openKautionModal, openTenantMailTemplatesModal, openApplicantScoreModal } = useModalStore()
  const templatesEnabled = useFeatureFlagEnabled('template-modal-enabled')

  const handleKaution = () => {
    // Der Kautionsdialog lädt seine Daten selbst (getKautionDetailsAction); hier wird nur der Mieter übergeben.
    // Das Öffnen im nächsten Event-Loop-Tick bleibt, damit sich das Kontextmenü zuerst sauber schließt.
    setTimeout(() => {
      openKautionModal({ id: tenant.id, name: tenant.name, wohnung_id: tenant.wohnung_id });
    }, 0);
  };

  const handleDelete = async (pruefsummen: Pruefsummen = {}) => {
    try {
      setIsDeleting(true);
      const result = await deleteTenantAction(tenant.id, pruefsummen[tenant.id]);

      if (result.success) {
        toast({
          title: "Erfolg",
          description: `Der Mieter "${tenant.name}" wurde erfolgreich gelöscht.`,
          variant: "success",
        });
        setTimeout(() => {
          onRefresh();
        }, 100); // Delay of 100 milliseconds
      } else {
        toast({
          title: "Fehler",
          description: result.error?.message || "Der Mieter konnte nicht gelöscht werden.",
          variant: "destructive",
        });
      }
    } catch (error) { // Catch unexpected errors from the action call itself or UI updates
      console.error("Unerwarteter Fehler beim Löschen des Mieters:", error);
      toast({
        title: "Systemfehler",
        description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleTemplates = () => {
    // Open tenant mail templates modal with tenant name and email in the next tick
    setTimeout(() => {
      openTenantMailTemplatesModal(tenant.name, tenant.email);
    }, 0);
  };

  const handleScoreDetails = () => {
    // Open applicant score details modal in the next tick
    setTimeout(() => {
      openApplicantScoreModal({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email || undefined,
          bewerbung_score: tenant.bewerbung_score,
          bewerbung_metadaten: tenant.bewerbung_metadaten,
          bewerbung_mail_id: tenant.bewerbung_mail_id
        }
      });
    }, 0);
  };

  const actionHandlers: Record<string, () => void> = {
    kaution: handleKaution,
    datenblatt: handleScoreDetails,
    vorlagen: handleTemplates,
  }

  // Zuerst die Auswirkung laden, dann EIN Dialog: ohne gebuchte Kaution die übliche Frage, sonst die Übersicht (ersetzt die Frage).
  const handleDeleteStart = () =>
    void starteLoeschenMitKautionen("Mieter", [tenant.id], { einfach: () => setDeleteDialogOpen(true), loeschen: handleDelete });

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem 
            onClick={() => {
              setTimeout(() => {
                onEdit();
              }, 0);
            }} 
            disabled={!canEdit} 
            className="flex items-center gap-2 cursor-pointer"
          >
            <Edit className="h-4 w-4" />
            <span>Bearbeiten</span>
          </ContextMenuItem>
          {getVisibleActions(tenant, { templatesEnabled: !!templatesEnabled, canViewKautionen }).map((action) => {
            const handler = actionHandlers[action.key]
            if (!handler) return null
            return (
              <ContextMenuItem key={action.key} onClick={handler} className={cn("flex items-center gap-2 cursor-pointer", action.className)}>
                <action.icon className="h-4 w-4" />
                <span>{action.label}</span>
              </ContextMenuItem>
            )
          })}
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={handleDeleteStart}
            disabled={!canDelete}
            className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            <span>Löschen</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mieter löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Mieter "{tenant.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete()} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Löschen..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
