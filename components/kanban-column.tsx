"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { KanbanTaskCard } from "@/components/kanban-task-card"
import type { Task } from "@/components/task-board"

interface KanbanColumnProps {
  id: string
  title: string
  tasks: Task[]
  icon: React.ReactNode
  count: number
  onTaskUpdated: (task: Task) => void
  onTaskDeleted: (taskId: string) => void
}

export function KanbanColumn({
  id,
  title,
  tasks,
  icon,
  count,
  onTaskUpdated,
  onTaskDeleted,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id,
  })

  return (
    <Card className="flex-1 min-h-[600px]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
          </CardTitle>
          <Badge variant="secondary" className="text-sm">
            {count}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          ref={setNodeRef}
          className="min-h-[500px] space-y-3"
        >
          <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <KanbanTaskCard
                key={task.id}
                task={task}
                onTaskUpdated={onTaskUpdated}
                onTaskDeleted={onTaskDeleted}
              />
            ))}
          </SortableContext>
          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border-2 border-dashed border-muted rounded-lg">
              Keine Aufgaben
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}