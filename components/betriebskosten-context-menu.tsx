"use client";

import * as React from "react";
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
import { deleteNebenkosten } from "@/app/betriebskosten-actions";
import { Nebenkosten } from "@/lib/data-fetching";
import { MoreHorizontal, Edit, Trash2, FileText, Droplets } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useModalStore } from "@/hooks/use-modal-store";

interface BetriebskostenContextMenuProps {
  betriebskosten: Nebenkosten;
}

export function BetriebskostenContextMenu({
  betriebskosten,
}: BetriebskostenContextMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { openBetriebskostenModal, openWasserzaehlerModal } = useModalStore();

  const handleEdit = () => {
    openBetriebskostenModal(betriebskosten, [], () => {});
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await deleteNebenkosten(betriebskosten.id);

      if (result.success) {
        toast({
          title: "Erfolg",
          description: "Die Betriebskostenabrechnung wurde erfolgreich gelöscht.",
          variant: "success",
        });
      } else {
        toast({
          title: "Fehler",
          description:
            result.message ||
            "Die Betriebskostenabrechnung konnte nicht gelöscht werden.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(
        "Unerwarteter Fehler beim Löschen der Betriebskostenabrechnung:",
        error
      );
      toast({
        title: "Systemfehler",
        description:
          "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleOpenWasserzaehlerModal = () => {
    openWasserzaehlerModal(betriebskosten, [], null, async () => {});
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Bearbeiten
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {}}>
            <FileText className="mr-2 h-4 w-4" />
            Übersicht
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenWasserzaehlerModal}>
            <Droplets className="mr-2 h-4 w-4" />
            Wasserzähler
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Betriebskostenabrechnung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diese Betriebskostenabrechnung wirklich löschen? Diese
              Aktion kann nicht rückgängig gemacht werden.
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
