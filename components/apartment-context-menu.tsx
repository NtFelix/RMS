"use client"

import * as React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Edit, Building, Trash2 } from "lucide-react"
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
import { toast } from "@/components/ui/use-toast"
import { loescheWohnung } from "@/app/(dashboard)/wohnungen/actions"; // Added import

interface Apartment {
  id: string
  name: string
  groesse: number
  miete: number
  haus_id?: string
  Haeuser?: { name: string }
}

interface ApartmentContextMenuProps {
  children: React.ReactNode
  apartment: Apartment
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

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await loescheWohnung(apartment.id);

      if (result.success) {
        toast({
          title: "Erfolg",
          description: `Die Wohnung "${apartment.name}" wurde erfolgreich gelöscht.`,
        });
        onRefresh(); // Call the existing onRefresh callback
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
