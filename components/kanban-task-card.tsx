"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckCircle, Clock, GripVertical } from "lucide-react"
import { TaskContextMenu } from "@/components/task-context-menu"
import { useModalStore } from "@/hooks/use-modal-store"
import { toast } from "@/hooks/use-toast"
import { toggleTaskStatusAction } from "@/app/todos-actions"
import type { Task } from "@/components/task-board"
import { format } from "date-fns"
import { de } from "date-fns/locale"

interface KanbanTaskCardProps {
  task: Task
  onTaskUpdated: (task: Task) => void
  onTaskDeleted: (taskId: string) => void
}

export function KanbanTaskCard({ task, onTaskUpdated, onTaskDeleted }: KanbanTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const { openAufgabeModal } = useModalStore()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const statusColor =
    task.ist_erledigt
      ? "bg-green-50 text-green-700 hover:bg-green-50"
      : "bg-yellow-50 text-yellow-700 hover:bg-yellow-50"

  const statusIcon = task.ist_erledigt ? (
    <CheckCircle className="h-4 w-4 text-green-700" />
  ) : (
    <Clock className="h-4 w-4 text-yellow-700" />
  )

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd.MM.yyyy", { locale: de })
    } catch (e) {
      return dateString
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd.MM.yyyy HH:mm 'Uhr'", { locale: de })
    } catch (e) {
      return dateString
    }
  }

  const toggleTaskStatus = async () => {
    try {
      const result = await toggleTaskStatusAction(task.id, !task.ist_erledigt)
      if (result.success && result.task) {
        onTaskUpdated(result.task)
        toast({
          title: "Status aktualisiert",
          description: `Aufgabe wurde als ${result.task.ist_erledigt ? 'erledigt' : 'ausstehend'} markiert.`
        })
      } else if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Status:", error)
      toast({
        title: "Fehler",
        description: "Status konnte nicht aktualisiert werden.",
        variant: "destructive"
      })
    }
  }

  const handleEdit = () => {
    openAufgabeModal(task, onTaskUpdated)
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleTaskStatus()
  }

  return (
    <TaskContextMenu
      task={{
        id: task.id,
        name: task.name,
        beschreibung: task.beschreibung || '',
        ist_erledigt: task.ist_erledigt
      }}
      onEdit={handleEdit}
      onStatusToggle={toggleTaskStatus}
      onTaskDeleted={onTaskDeleted}
    >
      <Card
        ref={setNodeRef}
        style={style}
        className={`cursor-pointer transition-all hover:shadow-md ${
          isDragging ? "opacity-50 shadow-lg" : ""
        }`}
        onClick={handleEdit}
        {...attributes}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 pt-1">
              <Checkbox
                checked={task.ist_erledigt}
                onCheckedChange={toggleTaskStatus}
                onClick={handleCheckboxClick}
                className="h-4 w-4"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-medium text-sm mb-2 ${
                task.ist_erledigt ? 'line-through text-muted-foreground' : ''
              }`}>
                {task.name}
              </h3>
              {task.beschreibung && (
                <p className={`text-xs mb-3 line-clamp-2 ${
                  task.ist_erledigt ? 'line-through text-muted-foreground' : 'text-muted-foreground'
                }`}>
                  {task.beschreibung}
                </p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDate(task.erstellungsdatum)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${statusColor}`}>
                    <span className="flex items-center gap-1">
                      {statusIcon}
                      {task.ist_erledigt ? "Erledigt" : "Offen"}
                    </span>
                  </Badge>
                  <div
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TaskContextMenu>
  )
}