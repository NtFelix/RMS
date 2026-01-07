"use client"

import React, { useState, useMemo, useCallback } from "react"
import { CheckedState } from "@radix-ui/react-checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import { ChevronsUpDown, ArrowUp, ArrowDown, CheckSquare, FileText, Calendar, MoreVertical, X, Download, Trash2, Pencil, Check } from "lucide-react"
import { useModalStore } from "@/hooks/use-modal-store"
import { bulkDeleteTasksAction, toggleTaskStatusAction } from "@/app/todos-actions"
import { TaskContextMenu } from "@/components/tasks/task-context-menu"
import { ActionMenu } from "@/components/ui/action-menu"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { Task } from "@/types/Task"

// Define sortable fields for task table
type TaskSortKey = "name" | "beschreibung" | "ist_erledigt" | "erstellungsdatum" | "aenderungsdatum" | ""
type SortDirection = "asc" | "desc"

interface TaskTableProps {
  tasks: Task[];
  filter: string;
  searchQuery: string;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  selectedTasks?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  onTaskUpdated?: (task: Task) => void;
}

export function TaskTable({
  tasks,
  filter,
  searchQuery,
  onEdit,
  onDelete,
  selectedTasks: externalSelectedTasks,
  onSelectionChange,
  onTaskUpdated
}: TaskTableProps) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortKey, setSortKey] = useState<TaskSortKey>("aenderungsdatum")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [internalSelectedTasks, setInternalSelectedTasks] = useState<Set<string>>(new Set())
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const contextMenuRefs = React.useRef<Map<string, HTMLElement>>(new Map())

  // Use external selection state if provided, otherwise use internal
  const selectedTasks = externalSelectedTasks ?? internalSelectedTasks
  const setSelectedTasks = onSelectionChange ?? setInternalSelectedTasks

  const handleToggleStatus = useCallback(async (task: Task) => {
    const { success, error } = await toggleTaskStatusAction(task.id, !task.ist_erledigt)
    if (success) {
      toast({
        title: "Erfolg",
        description: `Aufgabe als ${!task.ist_erledigt ? 'erledigt' : 'ausstehend'} markiert.`,
        variant: "success",
      })
      onTaskUpdated?.({ ...task, ist_erledigt: !task.ist_erledigt })
      router.refresh()
    } else {
      toast({
        title: "Fehler",
        description: error?.message || "Status konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
    }
  }, [onTaskUpdated, router])

  // Sorting, filtering and search logic
  const sortedAndFilteredData = useMemo(() => {
    let result = [...tasks]

    // Apply filters
    if (filter === "completed") result = result.filter(t => t.ist_erledigt)
    else if (filter === "pending") result = result.filter(t => !t.ist_erledigt)

    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.beschreibung && t.beschreibung.toLowerCase().includes(q))
      )
    }

    // Apply sorting
    if (sortKey) {
      result.sort((a, b) => {
        let valA, valB

        if (sortKey === 'erstellungsdatum' || sortKey === 'aenderungsdatum') {
          valA = new Date(a[sortKey]).getTime()
          valB = new Date(b[sortKey]).getTime()
        } else {
          valA = a[sortKey]
          valB = b[sortKey]
        }

        if (valA === undefined || valA === null) valA = ''
        if (valB === undefined || valB === null) valB = ''

        // Convert to number if it's a numeric value for proper sorting
        const numA = parseFloat(String(valA));
        const numB = parseFloat(String(valB));

        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA < numB) return sortDirection === "asc" ? -1 : 1;
          if (numA > numB) return sortDirection === "asc" ? 1 : -1;
          return 0;
        } else {
          const strA = String(valA);
          const strB = String(valB);
          return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
        }
      })
    }

    return result
  }, [tasks, filter, searchQuery, sortKey, sortDirection])

  const visibleTaskIds = useMemo(() => sortedAndFilteredData.map((task) => task.id), [sortedAndFilteredData])

  const allSelected = visibleTaskIds.length > 0 && visibleTaskIds.every((id) => selectedTasks.has(id))
  const partiallySelected = visibleTaskIds.some((id) => selectedTasks.has(id)) && !allSelected

  const handleSelectAll = (checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedTasks)
    if (isChecked) {
      visibleTaskIds.forEach((id) => next.add(id))
    } else {
      visibleTaskIds.forEach((id) => next.delete(id))
    }
    setSelectedTasks(next)
  }

  const handleSelectTask = (taskId: string, checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedTasks)
    if (isChecked) {
      next.add(taskId)
    } else {
      next.delete(taskId)
    }
    setSelectedTasks(next)
  }

  const handleSort = (key: TaskSortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const renderSortIcon = (key: TaskSortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 dark:text-[#f3f4f6]" />
    ) : (
      <ArrowDown className="h-4 w-4 dark:text-[#f3f4f6]" />
    )
  }

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;

    setIsBulkDeleting(true);
    const selectedIds = Array.from(selectedTasks);

    try {
      const { success, deletedCount, error } = await bulkDeleteTasksAction(selectedIds);

      if (success && deletedCount !== undefined) {
        const failedCount = selectedIds.length - deletedCount;

        setShowBulkDeleteConfirm(false);
        setSelectedTasks(new Set());

        if (deletedCount > 0) {
          toast({
            title: "Erfolg",
            description: `${deletedCount} ${deletedCount === 1 ? 'Aufgabe' : 'Aufgaben'} erfolgreich gelöscht${failedCount > 0 ? `, ${failedCount} fehlgeschlagen` : ''}.`,
            variant: "success",
          });

          // Refresh the page to reflect the changes
          router.refresh();
        } else {
          toast({
            title: "Fehler",
            description: "Keine Aufgaben konnten gelöscht werden.",
            variant: "destructive",
          });
        }
      } else if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error("Fehler beim Löschen der Aufgaben:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
    }
  }

  // Helper function to properly escape CSV values
  const escapeCsvValue = (value: string | null | undefined): string => {
    if (!value) return ''
    const stringValue = String(value)
    // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  const handleBulkExport = () => {
    const selectedTasksData = tasks.filter(t => selectedTasks.has(t.id))

    // Create CSV header
    const headers = ['Name', 'Beschreibung', 'Status', 'Erstellt', 'Geändert']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')

    // Create CSV rows with proper escaping
    const csvRows = selectedTasksData.map(t => {
      const row = [
        t.name,
        t.beschreibung || '',
        t.ist_erledigt ? 'Erledigt' : 'Ausstehend',
        format(new Date(t.erstellungsdatum), 'dd.MM.yyyy', { locale: de }),
        format(new Date(t.aenderungsdatum), 'dd.MM.yyyy', { locale: de })
      ]
      return row.map(value => escapeCsvValue(value)).join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `aufgaben_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "Export erfolgreich",
      description: `${selectedTasks.size} Aufgaben exportiert.`,
      variant: "success",
    })
  }

  const TableHeaderCell = ({ sortKey, children, className = '', icon: Icon, sortable = true }: { sortKey: TaskSortKey, children: React.ReactNode, className?: string, icon: React.ElementType, sortable?: boolean }) => (
    <TableHead className={`${className} dark:text-[#f3f4f6] group/header`}>
      <div
        onClick={() => sortable && handleSort(sortKey)}
        className={`flex items-center gap-2 p-2 -ml-2 dark:text-[#f3f4f6] ${sortable ? 'cursor-pointer' : ''}`}
      >
        <Icon className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
        {children}
        {sortable && renderSortIcon(sortKey)}
      </div>
    </TableHead>
  )

  return (
    <div className="rounded-lg">
      {/* Bulk Action Bar - only show if using internal state */}
      {!externalSelectedTasks && selectedTasks.size > 0 && (
        <div className="mb-4 p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={true}
                onCheckedChange={() => setSelectedTasks(new Set())}
                className="data-[state=checked]:bg-primary"
              />
              <span className="font-medium text-sm">
                {selectedTasks.size} {selectedTasks.size === 1 ? 'Aufgabe' : 'Aufgaben'} ausgewählt
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTasks(new Set())}
              className="h-8 px-2 hover:bg-primary/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkExport}
              className="h-8 gap-2"
            >
              <Download className="h-4 w-4" />
              Exportieren
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="h-8 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="h-4 w-4" />
              Löschen
            </Button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] hover:bg-gray-50 dark:hover:bg-[#22272e] transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998] [&:hover_th]:[&:first-child]:rounded-tl-lg [&:hover_th]:[&:last-child]:rounded-tr-lg">
                <TableHead className="w-12 pl-0 pr-0 -ml-2">
                  <div className="flex items-center justify-start w-6 h-6 rounded-md transition-transform duration-100">
                    <Checkbox
                      aria-label="Alle Aufgaben auswählen"
                      checked={allSelected ? true : partiallySelected ? "indeterminate" : false}
                      onCheckedChange={handleSelectAll}
                      className="transition-transform duration-100 hover:scale-105"
                    />
                  </div>
                </TableHead>
                <TableHeaderCell sortKey="name" className="w-[250px] dark:text-[#f3f4f6]" icon={FileText}>Name</TableHeaderCell>
                <TableHeaderCell sortKey="beschreibung" className="dark:text-[#f3f4f6]" icon={FileText}>Beschreibung</TableHeaderCell>
                <TableHeaderCell sortKey="ist_erledigt" className="w-[120px] dark:text-[#f3f4f6]" icon={CheckSquare}>Status</TableHeaderCell>
                <TableHeaderCell sortKey="erstellungsdatum" className="w-[130px] dark:text-[#f3f4f6]" icon={Calendar}>Erstellt</TableHeaderCell>
                <TableHeaderCell sortKey="aenderungsdatum" className="w-[130px] dark:text-[#f3f4f6]" icon={Calendar}>Geändert</TableHeaderCell>
                <TableHeaderCell sortKey="" className="w-[80px] dark:text-[#f3f4f6] pr-2" icon={Pencil} sortable={false}>Aktionen</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Keine Aufgaben gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                sortedAndFilteredData.map((task, index) => {
                  const isLastRow = index === sortedAndFilteredData.length - 1
                  const isSelected = selectedTasks.has(task.id)



                  return (
                    <TaskContextMenu
                      key={task.id}
                      task={task}
                      onEdit={() => onEdit?.(task)}
                      onStatusToggle={() => handleToggleStatus(task)}
                      onTaskDeleted={() => router.refresh()}
                    >
                      <TableRow
                        key={task.id}
                        ref={(el) => {
                          if (el) {
                            contextMenuRefs.current.set(task.id, el)
                          } else {
                            contextMenuRefs.current.delete(task.id)
                          }
                        }}
                        className={`relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] ${isSelected
                          ? `bg-primary/10 dark:bg-primary/20 ${isLastRow ? 'rounded-b-lg' : ''}`
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        onClick={() => onEdit?.(task)}
                      >
                        <TableCell
                          className={`py-4 ${isSelected && isLastRow ? 'rounded-bl-lg' : ''}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Checkbox
                            aria-label={`Aufgabe ${task.name} auswählen`}
                            checked={selectedTasks.has(task.id)}
                            onCheckedChange={(checked) => handleSelectTask(task.id, checked)}
                          />
                        </TableCell>
                        <TableCell className={`font-medium py-4 dark:text-[#f3f4f6]`}>
                          <span className={task.ist_erledigt ? 'line-through text-muted-foreground' : ''}>
                            {task.name}
                          </span>
                        </TableCell>
                        <TableCell className={`py-4 dark:text-[#f3f4f6]`}>
                          <span className={task.ist_erledigt ? 'line-through text-muted-foreground' : ''}>
                            {task.beschreibung ? (
                              task.beschreibung.length > 50
                                ? `${task.beschreibung.substring(0, 50)}...`
                                : task.beschreibung
                            ) : '-'}
                          </span>
                        </TableCell>
                        <TableCell className={`py-4`}>
                          {task.ist_erledigt ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 dark:bg-green-900/30 dark:text-green-400">
                              Erledigt
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400">
                              Ausstehend
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className={`py-4 dark:text-[#f3f4f6] text-sm`}>
                          {format(new Date(task.erstellungsdatum), 'dd.MM.yyyy', { locale: de })}
                        </TableCell>
                        <TableCell className={`py-4 dark:text-[#f3f4f6] text-sm`}>
                          {format(new Date(task.aenderungsdatum), 'dd.MM.yyyy', { locale: de })}
                        </TableCell>
                        <TableCell
                          className={`py-2 pr-2 text-right w-[130px] ${isSelected && isLastRow ? 'rounded-br-lg' : ''}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <ActionMenu
                            actions={[
                              {
                                id: `edit-${task.id}`,
                                icon: Pencil,
                                label: "Bearbeiten",
                                onClick: () => onEdit?.(task),
                                variant: 'primary',
                              },
                              {
                                id: `toggle-task-${task.id}`,
                                icon: Check,
                                label: task.ist_erledigt ? "Als ausstehend markieren" : "Als erledigt markieren",
                                onClick: () => handleToggleStatus(task),
                                variant: 'default',
                              },
                              {
                                id: `more-${task.id}`,
                                icon: MoreVertical,
                                label: "Mehr Optionen",
                                onClick: (e) => {
                                  if (!e) return;
                                  const rowElement = contextMenuRefs.current.get(task.id)
                                  if (rowElement) {
                                    const contextMenuEvent = new MouseEvent('contextmenu', {
                                      bubbles: true,
                                      cancelable: true,
                                      view: window,
                                      clientX: e.clientX,
                                      clientY: e.clientY,
                                    })
                                    rowElement.dispatchEvent(contextMenuEvent)
                                  }
                                },
                                variant: 'default',
                              }
                            ]}
                            shape="pill"
                            visibility="always"
                            className="inline-flex"
                          />
                        </TableCell>
                      </TableRow>
                    </TaskContextMenu>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mehrere Aufgaben löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich {selectedTasks.size} Aufgaben löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? "Lösche..." : `${selectedTasks.size} Aufgaben löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}