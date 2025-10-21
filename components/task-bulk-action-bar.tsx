"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Download, Trash2, CheckSquare, Square } from "lucide-react"
import { Task } from "@/types/Task"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { bulkUpdateTaskStatusesAction } from "@/app/todos-actions"

interface TaskBulkActionBarProps {
  selectedTasks: Set<string>
  tasks: Task[]
  onClearSelection: () => void
  onExport: () => void
  onDelete: () => void
  onUpdate?: () => void // Callback to refresh the task list after update
}

export function TaskBulkActionBar({
  selectedTasks,
  tasks,
  onClearSelection,
  onExport,
  onDelete,
  onUpdate,
}: TaskBulkActionBarProps) {
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>("completed")
  const [isUpdating, setIsUpdating] = useState(false)

  if (selectedTasks.size === 0) return null

  const handleUpdateStatus = async () => {
    const newStatus = selectedStatus === "completed"
    
    setIsUpdating(true)
    
    try {
      const selectedTaskIds = Array.from(selectedTasks)
      const { success, updatedCount, error } = await bulkUpdateTaskStatusesAction(selectedTaskIds, newStatus)
      
      if (success && updatedCount) {
        const failedUpdates = selectedTaskIds.length - updatedCount
        
        if (updatedCount > 0) {
          toast({
            title: "Erfolgreich aktualisiert",
            description: `${updatedCount} von ${selectedTaskIds.length} Aufgaben wurden erfolgreich aktualisiert.`,
            variant: "success"
          })
        }
        
        if (failedUpdates > 0) {
          toast({
            title: "Teilweise Fehler",
            description: `Bei ${failedUpdates} von ${selectedTaskIds.length} Aufgaben ist ein Fehler aufgetreten.`,
            variant: "destructive"
          })
        }
        
        setIsStatusDialogOpen(false)
        setSelectedStatus("completed")
        onUpdate?.()
        onClearSelection()
      } else if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Aufgaben:", error)
      toast({
        title: "Fehler",
        description: "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={true}
            onCheckedChange={onClearSelection}
            className="data-[state=checked]:bg-primary"
          />
          <span className="font-medium text-sm">
            {selectedTasks.size} {selectedTasks.size === 1 ? 'Aufgabe' : 'Aufgaben'} ausgewählt
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8 px-2 hover:bg-primary/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsStatusDialogOpen(true)}
          className="h-8 gap-2"
        >
          <CheckSquare className="h-4 w-4" />
          Status ändern
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="h-8 gap-2"
        >
          <Download className="h-4 w-4" />
          Exportieren
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="h-8 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <Trash2 className="h-4 w-4" />
          Löschen
        </Button>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Status ändern</DialogTitle>
            <DialogDescription>
              Ändern Sie den Status von {selectedTasks.size} {selectedTasks.size === 1 ? 'ausgewählter Aufgabe' : 'ausgewählten Aufgaben'}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
                disabled={isUpdating}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Status auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Erledigt
                    </div>
                  </SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <Square className="h-4 w-4" />
                      Ausstehend
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStatusDialogOpen(false)}
              disabled={isUpdating}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleUpdateStatus}
              disabled={!selectedStatus || isUpdating}
            >
              {isUpdating ? 'Wird gespeichert...' : 'Status ändern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}