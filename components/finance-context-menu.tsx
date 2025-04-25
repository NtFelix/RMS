"use client"

import * as React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { ArrowDownCircle, ArrowUpCircle, Edit, Trash2 } from "lucide-react"
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

interface Finanz {
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
  finance: Finanz
  onEdit: (finance: Finanz) => void
  onRefresh: () => void
}

export function FinanceContextMenu({
  children,
  finance,
  onEdit,
  onRefresh,
}: FinanceContextMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/finanzen?id=${finance.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Fehler beim Löschen der Transaktion")
      }

      toast({
        title: "Erfolg",
        description: "Die Transaktion wurde erfolgreich gelöscht.",
      })
      
      onRefresh()
    } catch (error) {
      console.error("Fehler beim Löschen der Transaktion:", error)
      toast({
        title: "Fehler",
        description: "Die Transaktion konnte nicht gelöscht werden. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleTypeToggle = async () => {
    try {
      const response = await fetch(`/api/finanzen?id=${finance.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...finance,
          ist_einnahmen: !finance.ist_einnahmen
        }),
      })

      if (!response.ok) {
        throw new Error("Fehler beim Ändern des Transaktionstyps")
      }

      toast({
        title: "Erfolg",
        description: `Die Transaktion wurde als ${!finance.ist_einnahmen ? "Einnahme" : "Ausgabe"} markiert.`,
      })
      
      onRefresh()
    } catch (error) {
      console.error("Fehler beim Ändern des Transaktionstyps:", error)
      toast({
        title: "Fehler",
        description: "Der Transaktionstyp konnte nicht geändert werden. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem onClick={() => onEdit(finance)} className="flex items-center gap-2 cursor-pointer">
            <Edit className="h-4 w-4" />
            <span>Bearbeiten</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handleTypeToggle} className="flex items-center gap-2 cursor-pointer">
            {finance.ist_einnahmen ? (
              <>
                <ArrowDownCircle className="h-4 w-4 text-red-500" />
                <span>Als Ausgabe markieren</span>
              </>
            ) : (
              <>
                <ArrowUpCircle className="h-4 w-4 text-green-500" />
                <span>Als Einnahme markieren</span>
              </>
            )}
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
              Diese Aktion kann nicht rückgängig gemacht werden. Die Transaktion wird permanent gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700" 
              disabled={isDeleting}
            >
              {isDeleting ? "Wird gelöscht..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
