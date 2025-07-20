"use client";

import * as React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Edit, Trash2, Euro } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deleteTenantAction, getSuggestedKaution } from "@/app/mieter-actions";
import { useModalStore } from "@/hooks/use-modal-store";
import { Tenant } from "@/types/Tenant";

interface TenantContextMenuProps {
  children: React.ReactNode;
  tenant: Tenant;
  onEdit: () => void;
  onRefresh: () => void;
}

export function TenantContextMenu({
  children,
  tenant,
  onEdit,
  onRefresh,
}: TenantContextMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { openKautionModal } = useModalStore();

  const handleOpenKautionModal = async () => {
    let suggestedAmount: number | undefined;
    if (tenant.wohnung_id) {
      const result = await getSuggestedKaution(tenant.wohnung_id);
      if (result.success) {
        suggestedAmount = result.suggestedAmount;
      }
    }
    openKautionModal(tenant, tenant.kaution, suggestedAmount);
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await deleteTenantAction(tenant.id);

      if (result.success) {
        toast.success(`Der Mieter "${tenant.name}" wurde erfolgreich gelöscht.`);
        setTimeout(() => {
          onRefresh();
        }, 100);
      } else {
        toast.error(result.error?.message || "Der Mieter konnte nicht gelöscht werden.");
      }
    } catch (error) {
      console.error("Unerwarteter Fehler beim Löschen des Mieters:", error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem onClick={onEdit} className="flex items-center gap-2 cursor-pointer">
            <Edit className="h-4 w-4" />
            <span>Bearbeiten</span>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={handleOpenKautionModal}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Euro className="h-4 w-4" />
            <span>Kaution</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => setDeleteDialogOpen(true)}
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
