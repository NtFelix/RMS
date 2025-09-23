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
        className="overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer" 
        onClick={handleEditClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-base truncate">{task.name}</h3>
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Erstellt: {task.createdAt}</span>
                <span>Geändert: {task.updatedAt}</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Badge 
                variant="outline" 
                className={`${statusColor} cursor-pointer hover:opacity-80`} 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus();
                }}
              >
                <span className="flex items-center">
                  {statusIcon} {task.status}
                </span>
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </TaskContextMenu>
  )
}
