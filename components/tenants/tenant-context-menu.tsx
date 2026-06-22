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
}

export function TenantContextMenu({
  children,
  tenant,
  onEdit,
  onRefresh,
  canEdit = true,
  canDelete = true,
}: TenantContextMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const { openKautionModal, openTenantMailTemplatesModal, openApplicantScoreModal } = useModalStore()
  const templatesEnabled = useFeatureFlagEnabled('template-modal-enabled')

  const handleKaution = () => {
    try {
      // Ensure we're passing a clean tenant object with only the required fields
      const cleanTenant = {
        id: tenant.id,
        name: tenant.name,
        wohnung_id: tenant.wohnung_id
      };

      // Prepare kaution data if it exists
      let kautionData = undefined;

      if (tenant.kaution) {
        // Ensure amount is a number
        const amount = typeof tenant.kaution.amount === 'string'
          ? parseFloat(tenant.kaution.amount)
          : tenant.kaution.amount;

        // Ensure we have valid data
        if (isNaN(amount)) {
          throw new Error('Ungültiger Kautionbetrag');
        }

        kautionData = {
          amount,
          paymentDate: tenant.kaution.paymentDate || '',
          status: tenant.kaution.status || 'Ausstehend',
          createdAt: tenant.kaution.createdAt,
          updatedAt: tenant.kaution.updatedAt
        };
      }

      // Open the modal with the prepared data in the next event loop tick
      // to allow the context menu to close properly first.
      setTimeout(() => {
        openKautionModal(cleanTenant, kautionData);
      }, 0);

    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Fehler beim Laden der Kautiondaten. Bitte versuchen Sie es erneut.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await deleteTenantAction(tenant.id);

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
          {getVisibleActions(tenant, { templatesEnabled: !!templatesEnabled }).map((action) => {
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
            onClick={() => setDeleteDialogOpen(true)}
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
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Löschen..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
