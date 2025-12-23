"use client"

import * as React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Edit, Trash2, Droplet } from "lucide-react"
import { useModalStore } from "@/hooks/use-modal-store"
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
import { loescheWohnung } from "@/app/(dashboard)/wohnungen/actions"; // Added import
import type { Apartment } from "@/components/tables/apartment-table"; // Import the shared type
import { useOnboardingStore } from "@/hooks/use-onboarding-store";
// Remove local Apartment interface definition

interface ApartmentContextMenuProps {
  children: React.ReactNode
  apartment: Apartment // Now uses the imported Apartment type
  onEdit: () => void
  onRefresh: () => void
}

export function ApartmentContextMenu({
  children,
  apartment,
  onEdit,
  onRefresh,
}: ApartmentContextMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const { openWasserZaehlerModal } = useModalStore()

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await loescheWohnung(apartment.id);

      if (result.success) {
        toast({
          title: "Erfolg",
          description: `Die Wohnung "${apartment.name}" wurde erfolgreich gelöscht.`,
          variant: "success",
        });
        setTimeout(() => {
          onRefresh();
        }, 100); // Delay of 100 milliseconds
      } else {
        toast({
          title: "Fehler",
          description: result.error || "Die Wohnung konnte nicht gelöscht werden.",
          variant: "destructive",
        });
      }
    } catch (error) { // Catch unexpected errors from the action call itself or UI updates
      console.error("Unerwarteter Fehler beim Löschen der Wohnung:", error);
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
            id="context-menu-meter-item"
            onClick={() => {
              useOnboardingStore.getState().completeStep('create-meter-select');
              openWasserZaehlerModal(apartment.id, apartment.name);
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Droplet className="h-4 w-4" />
            <span>Wasserzähler</span>
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
            <AlertDialogTitle>Wohnung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie die Wohnung "{apartment.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
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
