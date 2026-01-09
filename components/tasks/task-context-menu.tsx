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
import { toast } from "@/hooks/use-toast"
import { deleteTaskAction } from "@/app/todos-actions"; // Added import
import { Task } from "@/types/Task"

interface TaskContextMenuProps {
  children: React.ReactNode
  task: Task
  onEdit: () => void
  onStatusToggle: () => void
  onTaskDeleted: (taskId: string) => void
}

export function TaskContextMenu({
  children,
  task,
  onEdit,
  onStatusToggle,
  onTaskDeleted,
}: TaskContextMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  // No isDeleting state here as per revised instructions, assuming button state not directly affected in this component.

  const handleDelete = async () => {
    try {
      // If a visual loading state is needed for the button, isDeleting state management should be re-added.
      const result = await deleteTaskAction(task.id);
      if (result.success && result.taskId) {
        onTaskDeleted(result.taskId);
        toast({
          title: "Erfolg",
          description: "Die Aufgabe wurde erfolgreich gelöscht.",
          variant: "success",
        });
      } else {
        toast({
          title: "Fehler",
          description: result.error?.message || "Die Aufgabe konnte nicht gelöscht werden.",
          variant: "destructive",
        });
      }
    } catch (error) { // Catch unexpected errors
      console.error("Unexpected error in handleDelete (TaskContextMenu):", error);
      toast({
        title: "Systemfehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false); // Ensure dialog always closes
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
