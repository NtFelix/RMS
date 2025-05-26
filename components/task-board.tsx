"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { TaskCard } from "@/components/task-card"
// import { TaskEditModal } from "@/components/task-edit-modal"; // Removed
import { useModalStore } from "@/hooks/use-modal-store"; // Added
import { toast } from "@/hooks/use-toast";
import { toggleTaskStatusAction } from "@/app/todos-actions"; // Added

export interface Task {
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
  initialTasks?: Task[]
}

export function TaskBoard({ filter, searchQuery, refreshTrigger, initialTasks }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks ?? [])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // const [editModalOpen, setEditModalOpen] = useState(false); // Removed
  // const [currentTask, setCurrentTask] = useState</* ... */ null>(null); // Removed
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0) // Keep for onRefresh from TaskCard if still needed for other ops

  // External refreshTrigger is still used, localRefreshTrigger might be used by other actions
  const combinedRefreshTrigger = refreshTrigger !== undefined ? refreshTrigger + localRefreshTrigger : localRefreshTrigger

  useEffect(() => {
    // Wenn initialTasks per SSR geladen und kein Refresh-Trigger aktiv, überspringe den Fetch
    // This condition might need re-evaluation if localRefreshTrigger's sole purpose was the edit modal.
    // For now, assuming combinedRefreshTrigger might still be relevant for other local updates.
    if (initialTasks && combinedRefreshTrigger === 0 && !localRefreshTrigger) { // Adjusted condition slightly
      setIsLoading(false)
      return
    }
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
  }, [combinedRefreshTrigger, initialTasks])

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
      const result = await toggleTaskStatusAction(id, !currentStatus);

      if (result.success) {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === id 
              ? { ...task, ist_erledigt: !currentStatus, aenderungsdatum: new Date().toISOString() } 
              : task
          )
        );
        toast({
          title: "Status aktualisiert",
          description: `Aufgabe als ${!currentStatus ? "erledigt" : "offen"} markiert.`,
        });
      } else {
        console.error("Error updating task status:", result.error?.message);
        toast({
          title: "Fehler",
          description: result.error?.message || "Der Status konnte nicht aktualisiert werden.",
          variant: "destructive",
        });
      }
    } catch (error) { // Catch unexpected errors from the action call itself or UI updates
      console.error("Unexpected error in handleToggleStatus:", error);
      toast({
        title: "Systemfehler",
        description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
    }
  };

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
                // Ensure taskData has the right shape for openAufgabeModal
                // TaskCard passes { id, name, beschreibung, ist_erledigt }
                // The modal store expects `aufgabeInitialData` which is `AufgabePayload & { id?: string }`
                // `AufgabePayload` is { name, beschreibung?, ist_erledigt? }
                // So, the structure { id, name, beschreibung, ist_erledigt } is compatible.
                useModalStore.getState().openAufgabeModal(taskData);
              }}
              onRefresh={() => setLocalRefreshTrigger(prev => prev + 1)} // This can remain if other actions trigger it
            />
          ))}
        </div>
      )}

      {/* TaskEditModal removed, global modal is used via useModalStore */}
    </div>
  )
}
