"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { TaskCard, type TaskCardTask } from "@/components/task-card"
import { useModalStore } from "@/hooks/use-modal-store"
import { toast } from "@/hooks/use-toast"
import { toggleTaskStatusAction } from "@/app/todos-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle } from "lucide-react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { KanbanColumn } from "@/components/kanban-column"
import { KanbanTaskCard } from "@/components/kanban-task-card"

export interface Task extends Omit<TaskCardTask, 'status' | 'createdAt' | 'updatedAt'> {
  erstellungsdatum: string
  aenderungsdatum: string
}

interface TaskBoardProps {
  filter: string
  searchQuery: string
  tasks: Task[]
  onTaskUpdated: (task: Task) => void
  onTaskDeleted: (taskId: string) => void
}

export function TaskBoard({ 
  filter, 
  searchQuery, 
  tasks, 
  onTaskUpdated, 
  onTaskDeleted 
}: TaskBoardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Filter tasks based on search query only (ignore filter for kanban)
  const filteredTasks = tasks.filter(task => {
    const taskDescription = task.beschreibung || ''
    const taskName = task.name || ''
    const searchQueryLower = searchQuery.toLowerCase()
    const matchesSearch = 
      taskName.toLowerCase().includes(searchQueryLower) ||
      taskDescription.toLowerCase().includes(searchQueryLower)
    
    return matchesSearch
  })

  // Separate tasks into columns
  const todoTasks = filteredTasks.filter(task => !task.ist_erledigt)
    .sort((a, b) => new Date(b.aenderungsdatum).getTime() - new Date(a.aenderungsdatum).getTime())
  
  const doneTasks = filteredTasks.filter(task => task.ist_erledigt)
    .sort((a, b) => new Date(b.aenderungsdatum).getTime() - new Date(a.aenderungsdatum).getTime())

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const taskId = active.id as string
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // Determine new status based on drop zone
    const newStatus = over.id === 'done'
    
    // Only update if status actually changed
    if (task.ist_erledigt !== newStatus) {
      try {
        const result = await toggleTaskStatusAction(taskId, newStatus)
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
  }

  const activeTask = activeId ? tasks.find(task => task.id === activeId) : null

  if (isLoading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KanbanColumn
          id="todo"
          title="Zu erledigen"
          tasks={todoTasks}
          icon={<Clock className="h-5 w-5 text-yellow-600" />}
          count={todoTasks.length}
          onTaskUpdated={onTaskUpdated}
          onTaskDeleted={onTaskDeleted}
        />
        <KanbanColumn
          id="done"
          title="Erledigt"
          tasks={doneTasks}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          count={doneTasks.length}
          onTaskUpdated={onTaskUpdated}
          onTaskDeleted={onTaskDeleted}
        />
      </div>

      <DragOverlay>
        {activeTask ? (
          <Card className="opacity-90 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-1">
                  <Checkbox
                    checked={activeTask.ist_erledigt}
                    className="h-4 w-4"
                    disabled
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm mb-2">{activeTask.name}</h3>
                  {activeTask.beschreibung && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {activeTask.beschreibung}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
