"use client"

import * as React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Check, Edit, Trash2 } from "lucide-react"
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

interface TaskContextMenuProps {
  children: React.ReactNode
  task: {
    id: string
    name: string
    beschreibung: string
    ist_erledigt: boolean
  }
  onEdit: () => void
  onStatusToggle: () => void
  onRefresh: () => void
}

export function TaskContextMenu({
  children,
  task,
  onEdit,
  onStatusToggle,
  onRefresh,
}: TaskContextMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/todos/${task.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Fehler beim Löschen der Aufgabe")
      }

      toast({
        title: "Erfolg",
        description: "Die Aufgabe wurde erfolgreich gelöscht.",
      })
      
      onRefresh()
    } catch (error) {
      console.error("Fehler beim Löschen der Aufgabe:", error)
      toast({
        title: "Fehler",
        description: "Die Aufgabe konnte nicht gelöscht werden. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem onClick={onEdit} className="flex items-center gap-2 cursor-pointer">
            <Edit className="h-4 w-4" />
            <span>Bearbeiten</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={onStatusToggle} className="flex items-center gap-2 cursor-pointer">
            <Check className="h-4 w-4" />
            <span>
              {task.ist_erledigt ? "Als unerledigt markieren" : "Als erledigt markieren"}
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
            <AlertDialogTitle>Aufgabe löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die Aufgabe wird permanent gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
