"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock } from "lucide-react"
import { TaskContextMenu } from "@/components/task-context-menu"

export interface TaskCardTask {
  id: string
  name: string
  description: string
  status: string
  createdAt: string
  updatedAt: string
  ist_erledigt: boolean
  beschreibung?: string
  erstellungsdatum?: string
  aenderungsdatum?: string
}

interface TaskCardProps {
  task: TaskCardTask
  onToggleStatus: () => void
  onEdit: (task: TaskCardTask) => void
  onTaskDeleted: (taskId: string) => void
}

export function TaskCard({ task, onToggleStatus, onEdit, onTaskDeleted }: TaskCardProps) {
  const statusColor =
    task.status === "Erledigt"
      ? "bg-green-50 text-green-700 hover:bg-green-50"
      : "bg-yellow-50 text-yellow-700 hover:bg-yellow-50"

  const statusIcon =
    task.status === "Erledigt" ? (
      <CheckCircle className="h-4 w-4 mr-1 text-green-700" />
    ) : (
      <Clock className="h-4 w-4 mr-1 text-yellow-700" />
    )

  const handleEditClick = () => {
    onEdit({
      ...task,
      beschreibung: task.beschreibung || task.description,
      erstellungsdatum: task.erstellungsdatum || task.createdAt,
      aenderungsdatum: task.aenderungsdatum || task.updatedAt
    })
  }

  return (
    <TaskContextMenu 
      task={{
        id: task.id,
        name: task.name,
        beschreibung: task.beschreibung || task.description || '',
        ist_erledigt: task.ist_erledigt
      }}
      onEdit={handleEditClick}
      onStatusToggle={onToggleStatus}
      onTaskDeleted={onTaskDeleted}
    >
      <Card 
        className="overflow-hidden rounded-xl border border-[#F1F3F3] shadow-md hover:shadow-lg transition-all cursor-pointer" 
        onClick={handleEditClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{task.name}</CardTitle>
            <Badge 
              variant="outline" 
              className={`${statusColor} cursor-pointer hover:opacity-80`} 
              onClick={(e) => {
                e.stopPropagation(); // Verhindert, dass der Klick die Bearbeitungsfunktion auslöst
                onToggleStatus();
              }}
            >
              <span className="flex items-center">
                {statusIcon} {task.status}
              </span>
            </Badge>
          </div>
          <CardDescription className="text-sm text-muted-foreground">Erstellt am {task.createdAt}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{task.description}</p>
          <div className="mt-4 flex justify-between text-xs text-muted-foreground">
            <span>Zuletzt geändert: {task.updatedAt}</span>
          </div>
        </CardContent>
      </Card>
    </TaskContextMenu>
  )
}
