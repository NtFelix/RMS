"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { TaskCard, type TaskCardTask } from "@/components/task-card"
import { useModalStore } from "@/hooks/use-modal-store"
import { toast } from "@/hooks/use-toast"
import { toggleTaskStatusAction } from "@/app/todos-actions"
import { MobileFilterButton, FilterOption } from "@/components/mobile/mobile-filter-button"
import { MobileSearchBar } from "@/components/mobile/mobile-search-bar"
import { useIsMobile } from "@/hooks/use-mobile"

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
  onFilterChange?: (filter: string) => void
  onSearchChange?: (search: string) => void
}

export function TaskBoard({ 
  filter, 
  searchQuery, 
  tasks, 
  onTaskUpdated, 
  onTaskDeleted,
  onFilterChange,
  onSearchChange
}: TaskBoardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { openAufgabeModal } = useModalStore()
  const isMobile = useIsMobile()
  
  // Mobile filter options
  const filterOptions: FilterOption[] = useMemo(() => {
    const totalTasks = tasks.length
    const openTasks = tasks.filter(task => !task.ist_erledigt).length
    const doneTasks = tasks.filter(task => task.ist_erledigt).length

    return [
      { id: 'all', label: 'Alle', count: totalTasks },
      { id: 'open', label: 'Offen', count: openTasks },
      { id: 'done', label: 'Erledigt', count: doneTasks }
    ]
  }, [tasks])

  // Mobile filter handlers
  const handleMobileFilterChange = useCallback((filters: string[]) => {
    // For task filters, we only allow one filter at a time
    const newFilter = filters.length > 0 ? filters[filters.length - 1] : 'all'
    onFilterChange?.(newFilter)
  }, [onFilterChange])

  const handleMobileSearchChange = useCallback((search: string) => {
    onSearchChange?.(search)
  }, [onSearchChange])

  // Get active filters for mobile filter button
  const activeFilters = useMemo(() => {
    return filter === 'all' ? [] : [filter]
  }, [filter])

  // Filter and sort tasks based on current filter and search query
  const filteredTasks = tasks.filter(task => {
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'done' && task.ist_erledigt) || 
      (filter === 'open' && !task.ist_erledigt)
      
    const taskDescription = task.beschreibung || ''
    const taskName = task.name || ''
    const searchQueryLower = searchQuery.toLowerCase()
    const matchesSearch = 
      taskName.toLowerCase().includes(searchQueryLower) ||
      taskDescription.toLowerCase().includes(searchQueryLower)
    
    return matchesFilter && matchesSearch
  }).sort((a, b) => {
    // Sort by completion status (pending first) and then by date (newest first)
    if (a.ist_erledigt !== b.ist_erledigt) {
      return a.ist_erledigt ? 1 : -1
    }
    return new Date(b.aenderungsdatum).getTime() - new Date(a.aenderungsdatum).getTime()
  })

  // Function to refresh tasks from the server
  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/todos")
      if (!response.ok) {
        throw new Error("Fehler beim Laden der Aufgaben")
      }
      return await response.json()
    } catch (error) {
      console.error("Error fetching tasks:", error)
      toast({
        title: "Fehler",
        description: "Die Aufgaben konnten nicht geladen werden.",
        variant: "destructive",
      })
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/todos/${taskId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Fehler beim Löschen der Aufgabe')
      }
      
      // Notify parent component about the deletion
      onTaskDeleted(taskId)
      
      toast({
        title: "Erfolg",
        description: "Aufgabe wurde erfolgreich gelöscht.",
      })
    } catch (error) {
      console.error('Fehler beim Löschen der Aufgabe:', error)
      toast({
        title: "Fehler",
        description: "Aufgabe konnte nicht gelöscht werden.",
        variant: "destructive"
      })
    }
  }

  // Toggle task status
  const toggleTaskStatus = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      if (!task) return
      
      const result = await toggleTaskStatusAction(taskId, !task.ist_erledigt)
      if (result.success && result.task) {
        // Use the updated task data from the server
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

  const handleEdit = useCallback((task: TaskCardTask) => {
    // Convert TaskCardTask to Task by ensuring required fields are present
    const taskWithDefaults: Task = {
      ...task,
      beschreibung: task.beschreibung || task.description || '',
      erstellungsdatum: task.erstellungsdatum || task.createdAt || new Date().toISOString(),
      aenderungsdatum: task.aenderungsdatum || task.updatedAt || new Date().toISOString()
    }
    openAufgabeModal(taskWithDefaults, (updatedTask: Task) => {
      onTaskUpdated(updatedTask)
    })
  }, [openAufgabeModal, onTaskUpdated])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

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

  return (
    <div className="w-full">
      {/* Mobile Filter and Search Bar */}
      {isMobile && (onFilterChange || onSearchChange) && (
        <div className="flex items-center gap-3 p-4 mb-4 border border-gray-200 rounded-xl bg-gray-50/50">
          {onFilterChange && (
            <MobileFilterButton
              filters={filterOptions}
              activeFilters={activeFilters}
              onFilterChange={handleMobileFilterChange}
            />
          )}
          {onSearchChange && (
            <MobileSearchBar
              value={searchQuery}
              onChange={handleMobileSearchChange}
              placeholder="Aufgabe suchen..."
            />
          )}
        </div>
      )}
      {isLoading && tasks.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery || filter !== "all"
              ? "Keine Aufgaben gefunden, die den Suchkriterien entsprechen."
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
                description: task.beschreibung || '',
                status: task.ist_erledigt ? "Erledigt" : "Offen",
                createdAt: formatDate(task.erstellungsdatum),
                updatedAt: formatDateTime(task.aenderungsdatum),
                ist_erledigt: task.ist_erledigt,
                beschreibung: task.beschreibung,
                erstellungsdatum: task.erstellungsdatum,
                aenderungsdatum: task.aenderungsdatum
              }}
              onToggleStatus={() => toggleTaskStatus(task.id)}
              onEdit={handleEdit}
              onTaskDeleted={onTaskDeleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}
