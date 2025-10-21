"use client"

import * as React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Edit, ArrowUpDown, Trash2, TrendingUp, TrendingDown } from "lucide-react"
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
import { toggleFinanceStatusAction, deleteFinanceAction } from "@/app/finanzen-actions";

interface Finance {
  id: string
  wohnung_id?: string
  name: string
  datum?: string
  betrag: number
  ist_einnahmen: boolean
  notiz?: string
  Wohnungen?: { name: string }
}

interface FinanceContextMenuProps {
  children: React.ReactNode
  finance: Finance
  onEdit: () => void
  onRefresh?: () => void
}

export function FinanceContextMenu({
  children,
  finance,
  onEdit,
  onRefresh,
}: FinanceContextMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  const handleStatusToggle = async () => {
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(true);

    try {
      const result = await toggleFinanceStatusAction(finance.id, finance.ist_einnahmen);
      const newStatus = !finance.ist_einnahmen;

      if (result.success) {
        toast({
          title: "Status aktualisiert",
          description: `Die Transaktion wurde erfolgreich als ${newStatus ? "Einnahme" : "Ausgabe"} markiert.`,
          variant: "success",
        });
        onRefresh && onRefresh();
      } else {
        toast({
          title: "Fehler bei der Aktualisierung",
          description: result.error?.message || "Der Status konnte nicht aktualisiert werden.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Fehler beim Umschalten des Transaktionsstatus:", error);
      toast({
        title: "Systemfehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await deleteFinanceAction(finance.id);

      if (result.success) {
        toast({
          title: "Erfolg",
          description: "Die Transaktion wurde erfolgreich gelöscht.",
          variant: "success",
        });
        setTimeout(() => {
          onRefresh && onRefresh();
        }, 100); // Delay of 100 milliseconds
      } else {
        toast({
          title: "Fehler",
          description: result.error?.message || "Die Transaktion konnte nicht gelöscht werden.",
          variant: "destructive",
        });
      }
    } catch (error) { // Catch unexpected errors from the action call itself or UI updates
      console.error("Unerwarteter Fehler beim Löschen der Transaktion:", error);
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
            onClick={handleStatusToggle} 
            disabled={isUpdatingStatus}
            className="flex items-center gap-2 cursor-pointer"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span>
              {finance.ist_einnahmen 
                ? "Als Ausgabe umschalten" 
                : "Als Einnahme umschalten"}
            </span>
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
            <AlertDialogTitle>Transaktion löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diese Transaktion wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
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
