"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { TaskCard, type TaskCardTask } from "@/components/tasks/task-card"
import { useModalStore } from "@/hooks/use-modal-store"
import { toast } from "@/hooks/use-toast"
import { toggleTaskStatusAction } from "@/app/todos-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, CheckCircle } from "lucide-react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  closestCorners,
  rectIntersection,
  pointerWithin,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable"
import { KanbanColumn } from "@/components/tasks/kanban-column"
import { KanbanTaskCard } from "@/components/tasks/kanban-task-card"
import { TaskBoardTask as Task } from "@/types/Task"

interface TaskBoardProps {
  searchQuery: string
  tasks: Task[]
  onTaskUpdated: (task: Task) => void
  onTaskDeleted: (taskId: string) => void
}

export function TaskBoard({ 
  searchQuery, 
  tasks, 
  onTaskUpdated, 
  onTaskDeleted 
}: TaskBoardProps) {

  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks)
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)
  const [dragDirection, setDragDirection] = useState<'todo-to-done' | 'done-to-todo' | null>(null)
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update optimistic tasks when props change
  useEffect(() => {
    setOptimisticTasks(tasks)
  }, [tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Custom collision detection that prioritizes column drop zones
  const customCollisionDetection = useCallback((args: any) => {
    // First, let's see if we're intersecting with any droppable areas
    const pointerIntersections = pointerWithin(args)
    const intersections = pointerIntersections.length > 0 
      ? pointerIntersections 
      : rectIntersection(args)

    // If we have intersections, prioritize column drop zones
    if (intersections.length > 0) {
      const columnIntersections = intersections.filter(
        intersection => intersection.id === 'todo' || intersection.id === 'done'
      )
      
      if (columnIntersections.length > 0) {
        return columnIntersections
      }
    }

    return intersections.length > 0 ? intersections : closestCorners(args)
  }, [])

  // Memoized filtered and sorted tasks for better performance
  const { todoTasks, doneTasks } = useMemo(() => {
    const searchQueryLower = searchQuery.toLowerCase()
    
    const filteredTasks = optimisticTasks.filter(task => {
      if (!searchQuery) return true
      const taskDescription = task.beschreibung || ''
      const taskName = task.name || ''
      return taskName.toLowerCase().includes(searchQueryLower) ||
             taskDescription.toLowerCase().includes(searchQueryLower)
    })

    const todoTasks = filteredTasks
      .filter(task => !task.ist_erledigt)
      .sort((a, b) => new Date(b.aenderungsdatum).getTime() - new Date(a.aenderungsdatum).getTime())
    
    const doneTasks = filteredTasks
      .filter(task => task.ist_erledigt)
      .sort((a, b) => new Date(b.aenderungsdatum).getTime() - new Date(a.aenderungsdatum).getTime())

    return { todoTasks, doneTasks }
  }, [optimisticTasks, searchQuery])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = event.active.id as string
    const task = optimisticTasks.find(t => t.id === taskId)
    setActiveId(taskId)
    
    // Determine potential drag direction
    if (task) {
      setDragDirection(task.ist_erledigt ? 'done-to-todo' : 'todo-to-done')
    }
    
    // Clear any existing timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current)
    }
  }, [optimisticTasks])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, active } = event
    const overId = over?.id as string || null
    

    
    setOverId(overId)
    
    // Enhanced feedback for todo-to-done transition
    if (active && (overId === 'done' || overId === 'done-large')) {
      const task = optimisticTasks.find(t => t.id === active.id)
      if (task && !task.ist_erledigt) {
        // Add subtle haptic feedback if supported
        if (navigator.vibrate) {
          navigator.vibrate(10)
        }
      }
    }
  }, [optimisticTasks, dragDirection])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    const taskId = active.id as string
    const task = optimisticTasks.find(t => t.id === taskId)
    

    
    setActiveId(null)
    setOverId(null)
    setDragDirection(null)

    if (!over || !task) {

      return
    }

    // Determine new status based on drop zone (handle both regular and large zones)
    const newStatus = over.id === 'done' || over.id === 'done-large'
    const isCompletingTask = !task.ist_erledigt && newStatus
    
    // Only update if status actually changed
    if (task.ist_erledigt !== newStatus) {
      // Special handling for task completion
      if (isCompletingTask) {
        setCompletingTaskId(taskId)
        
        // Enhanced haptic feedback for completion
        if (navigator.vibrate) {
          navigator.vibrate([50, 30, 50])
        }
      }

      // Optimistic update for immediate feedback
      const optimisticTask = { 
        ...task, 
        ist_erledigt: newStatus,
        aenderungsdatum: new Date().toISOString()
      }
      setOptimisticTasks(prev => 
        prev.map(t => t.id === taskId ? optimisticTask : t)
      )

      // Enhanced feedback based on action
      if (isCompletingTask) {
        toast({
          title: "Aufgabe wird abgeschlossen",
          description: "Die Aufgabe wird als erledigt markiert.",
          duration: 2000,
        })
      } else if (!newStatus) {
        toast({
          title: "Aufgabe wird reaktiviert",
          description: "Die Aufgabe wird wieder als ausstehend markiert.",
          duration: 2000,
        })
      }

      try {
        const result = await toggleTaskStatusAction(taskId, newStatus)
        if (result.success && result.task) {
          onTaskUpdated(result.task)
          
          // Success feedback
          if (isCompletingTask) {
            toast({
              title: "Aufgabe abgeschlossen",
              description: `"${task.name}" wurde erfolgreich erledigt.`,
              duration: 3000,
            })
            
            // Clear completing state after animation
            setTimeout(() => setCompletingTaskId(null), 500)
          } else {
            toast({
              title: "Status aktualisiert",
              description: `Aufgabe wurde als ${result.task.ist_erledigt ? 'erledigt' : 'ausstehend'} markiert.`
            })
          }
        } else if (result.error) {
          // Revert optimistic update on error
          setOptimisticTasks(prev => 
            prev.map(t => t.id === taskId ? task : t)
          )
          setCompletingTaskId(null)
          throw new Error(result.error.message)
        }
      } catch (error) {
        // Revert optimistic update on error
        setOptimisticTasks(prev => 
          prev.map(t => t.id === taskId ? task : t)
        )
        setCompletingTaskId(null)
        console.error("Fehler beim Aktualisieren des Status:", error)
        toast({
          title: "Fehler",
          description: "Status konnte nicht aktualisiert werden.",
          variant: "destructive"
        })
      }
    }
  }, [optimisticTasks, onTaskUpdated])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current)
      }
    }
  }, [])

  const activeTask = activeId ? tasks.find(task => task.id === activeId) : null



  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
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
          isOver={overId === 'todo' || overId === 'todo-large'}
          dragDirection={dragDirection}
          completingTaskId={completingTaskId}
        />
        <KanbanColumn
          id="done"
          title="Erledigt"
          tasks={doneTasks}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          count={doneTasks.length}
          onTaskUpdated={onTaskUpdated}
          onTaskDeleted={onTaskDeleted}
          isOver={overId === 'done' || overId === 'done-large'}
          dragDirection={dragDirection}
          completingTaskId={completingTaskId}
        />
      </div>

      <DragOverlay dropAnimation={{
        duration: dragDirection === 'todo-to-done' ? 400 : 200,
        easing: dragDirection === 'todo-to-done' 
          ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' 
          : 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeTask ? (
          <Card className={`opacity-95 shadow-2xl border-2 z-50 will-change-transform transition-all duration-200 rounded-2xl ${
            dragDirection === 'todo-to-done' && (overId === 'done' || overId === 'done-large')
              ? 'border-green-400 bg-green-50 rotate-2 scale-105'
              : dragDirection === 'done-to-todo' && (overId === 'todo' || overId === 'todo-large')
              ? 'border-yellow-400 bg-yellow-50 rotate-1 scale-105'
              : 'border-primary/50 bg-background rotate-1 scale-105'
          }`}>
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
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`font-medium text-sm ${
                      activeTask.ist_erledigt ? 'line-through text-muted-foreground' : ''
                    }`}>
                      {activeTask.name}
                    </h3>
                    {dragDirection === 'todo-to-done' && (overId === 'done' || overId === 'done-large') && (
                      <span className="text-sm">✨</span>
                    )}
                  </div>
                  {activeTask.beschreibung && (
                    <p className={`text-xs line-clamp-2 ${
                      activeTask.ist_erledigt ? 'line-through text-muted-foreground' : 'text-muted-foreground'
                    }`}>
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
