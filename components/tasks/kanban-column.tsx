"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { KanbanTaskCard } from "@/components/tasks/kanban-task-card"
import type { TaskBoardTask as Task } from "@/types/Task"

interface KanbanColumnProps {
  id: string
  title: string
  tasks: Task[]
  icon: React.ReactNode
  count: number
  onTaskUpdated: (task: Task) => void
  onTaskDeleted: (taskId: string) => void
  isOver?: boolean
  dragDirection?: 'todo-to-done' | 'done-to-todo' | null
  completingTaskId?: string | null
}

export function KanbanColumn({
  id,
  title,
  tasks,
  icon,
  count,
  onTaskUpdated,
  onTaskDeleted,
  isOver: isOverProp,
  dragDirection,
  completingTaskId,
}: KanbanColumnProps) {
  const { setNodeRef, isOver: isOverDroppable } = useDroppable({
    id,
  })
  
  // Create an additional larger drop zone for better detection
  const { setNodeRef: setLargeDropRef, isOver: isOverLarge } = useDroppable({
    id: `${id}-large`,
  })
  
  const isOver = isOverProp || isOverDroppable || isOverLarge
  const isCompletionTarget = (id === 'done' || id === 'done-large') && dragDirection === 'todo-to-done' && isOver
  const isReactivationTarget = (id === 'todo' || id === 'todo-large') && dragDirection === 'done-to-todo' && isOver

  return (
    <div
      ref={setLargeDropRef}
      className={`flex-1 min-h-[600px] transition-all duration-200 ${
        isCompletionTarget 
          ? 'ring-2 ring-green-400 bg-green-50/30 shadow-md' 
          : isReactivationTarget
          ? 'ring-2 ring-yellow-400 bg-yellow-50/30 shadow-md'
          : isOver 
          ? 'ring-2 ring-primary bg-primary/5' 
          : ''
      } rounded-3xl p-3`}
    >
      <div ref={setNodeRef} className="h-full w-full">
      <Card className="h-full shadow-md rounded-3xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className={`flex items-center gap-2 text-lg ${
              isCompletionTarget ? 'text-green-700' : ''
            }`}>
              {icon}
              {title}
              {isCompletionTarget && <span className="text-lg">🎯</span>}
            </CardTitle>
            <Badge variant="secondary" className={`text-sm ${
              isCompletionTarget ? 'bg-green-100 text-green-800' : ''
            }`}>
              {count}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 h-full">
          <div
            className={`min-h-[500px] space-y-4 rounded-2xl transition-all duration-200 p-4 ${
              isCompletionTarget 
                ? 'bg-green-50/20 border-2 border-dashed border-green-400' 
                : isReactivationTarget
                ? 'bg-yellow-50/20 border-2 border-dashed border-yellow-400'
                : isOver 
                ? 'bg-primary/5 border-2 border-dashed border-primary' 
                : 'border-2 border-dashed border-transparent'
            }`}
          >
            <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
              {tasks.map((task) => (
                <KanbanTaskCard
                  key={task.id}
                  task={task}
                  onTaskUpdated={onTaskUpdated}
                  onTaskDeleted={onTaskDeleted}
                  isCompleting={completingTaskId === task.id}
                />
              ))}
            </SortableContext>
            {tasks.length === 0 && (
              <div className={`flex flex-col items-center justify-center h-32 text-sm border-2 border-dashed rounded-2xl transition-all duration-300 ${
                isCompletionTarget 
                  ? 'border-green-400 bg-green-50/20 text-green-700' 
                  : isReactivationTarget
                  ? 'border-yellow-400 bg-yellow-50/20 text-yellow-700'
                  : isOver 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-muted text-muted-foreground'
              }`}>
                {isCompletionTarget ? (
                  <>
                    <span className="text-2xl mb-2">🎯</span>
                    <span className="font-medium">Hier ablegen zum Abschließen!</span>
                  </>
                ) : isReactivationTarget ? (
                  <>
                    <span className="text-2xl mb-2">🔄</span>
                    <span className="font-medium">Hier ablegen zum Reaktivieren!</span>
                  </>
                ) : isOver ? (
                  'Hier ablegen'
                ) : (
                  'Keine Aufgaben'
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}