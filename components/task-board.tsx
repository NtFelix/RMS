"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { TaskCard } from "@/components/task-card"
import { TaskEditModal } from "@/components/task-edit-modal"
import { toast } from "@/components/ui/use-toast"

interface Task {
  id: string
  name: string
  beschreibung: string
  ist_erledigt: boolean
  erstellungsdatum: string
  aenderungsdatum: string
}

interface TaskBoardProps {
  filter: string
  searchQuery: string
  refreshTrigger?: number
}

export function TaskBoard({ filter, searchQuery, refreshTrigger }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<{
    id: string
    name: string
    beschreibung: string
    ist_erledigt: boolean
  } | null>(null)
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0)

  // Kombiniere externe und lokale Refresh-Trigger
  const combinedRefreshTrigger = refreshTrigger !== undefined ? refreshTrigger + localRefreshTrigger : localRefreshTrigger

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/todos")
        if (!response.ok) {
          throw new Error("Fehler beim Laden der Aufgaben")
        }
        const data = await response.json()
        setTasks(data)
      } catch (error) {
        console.error("Error fetching tasks:", error)
        toast({
          title: "Fehler",
          description: "Die Aufgaben konnten nicht geladen werden.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [combinedRefreshTrigger])

  useEffect(() => {
    let result = [...tasks]

    // Filter by status
    if (filter === "open") {
      result = result.filter((task) => !task.ist_erledigt)
    } else if (filter === "done") {
      result = result.filter((task) => task.ist_erledigt)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (task) => task.name.toLowerCase().includes(query) || task.beschreibung.toLowerCase().includes(query),
      )
    }

    setFilteredTasks(result)
  }, [filter, searchQuery, tasks])

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

  // Handle task status toggle
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch("/api/todos", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, ist_erledigt: !currentStatus }),
      })

      if (!response.ok) {
        throw new Error("Fehler beim Aktualisieren des Status")
      }

      // Update local state
      setTasks(tasks.map(task => 
        task.id === id ? { ...task, ist_erledigt: !currentStatus, aenderungsdatum: new Date().toISOString() } : task
      ))

      toast({
        title: "Status aktualisiert",
        description: `Aufgabe als ${!currentStatus ? "erledigt" : "offen"} markiert.`,
      })
    } catch (error) {
      console.error("Error updating task status:", error)
      toast({
        title: "Fehler",
        description: "Der Status konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
          <p className="text-center text-muted-foreground">Lädt Aufgaben...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
          <p className="text-center text-muted-foreground">
            {filter !== "all" || searchQuery
              ? "Keine passenden Aufgaben gefunden."
              : "Keine Aufgaben vorhanden. Fügen Sie eine neue Aufgabe hinzu."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={{
                id: task.id,
                name: task.name,
                description: task.beschreibung,
                status: task.ist_erledigt ? "Erledigt" : "Offen",
                createdAt: formatDate(task.erstellungsdatum),
                updatedAt: formatDateTime(task.aenderungsdatum),
                ist_erledigt: task.ist_erledigt
              }}
              onToggleStatus={() => handleToggleStatus(task.id, task.ist_erledigt)}
              onEdit={(taskData) => {
                setCurrentTask(taskData)
                setEditModalOpen(true)
              }}
              onRefresh={() => setLocalRefreshTrigger(prev => prev + 1)}
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <TaskEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onTaskUpdated={() => setLocalRefreshTrigger(prev => prev + 1)}
        task={currentTask}
      />
    </div>
  )
}
