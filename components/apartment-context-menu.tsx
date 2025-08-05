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
import * as React from "react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Edit, Trash2, Eye } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import { loescheWohnung } from "@/app/(dashboard)/wohnungen/actions";
import type { Apartment } from "./apartment-table";
import { ApartmentOverviewModal } from "./apartment-overview-modal";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Edit, Trash2, Eye } from "lucide-react";

interface ApartmentContextMenuProps {
  children: React.ReactNode;
  apartment: Apartment;
  onEdit: () => void;
  onRefresh: () => void;
}

export function ApartmentContextMenu({
  children,
  apartment,
  onEdit,
  onRefresh,
}: ApartmentContextMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [overviewOpen, setOverviewOpen] = React.useState(false);

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
        }, 100);
      } else {
        toast({
          title: "Fehler",
          description: result.error || "Die Wohnung konnte nicht gelöscht werden.",
          variant: "destructive",
        });
      }
    } catch (error) {
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
          <ContextMenuItem
            onClick={() => setOverviewOpen(true)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Eye className="h-4 w-4" />
            <span>Übersicht</span>
          </ContextMenuItem>
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

      <ApartmentOverviewModal
        open={overviewOpen}
        onClose={() => setOverviewOpen(false)}
        apartmentId={apartment.id}
        apartment={apartment}
      />

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
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Löschen..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
