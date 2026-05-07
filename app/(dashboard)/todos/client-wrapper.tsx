"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveButtonWithTooltip } from "@/components/ui/responsive-button";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar as CalendarIcon, List, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { TaskCalendar, CalendarTaskPill } from "@/components/tasks/task-calendar";
import { TaskSidebar, TaskItemCard } from "@/components/tasks/task-sidebar";
import { TaskDayModal } from "@/components/tasks/task-day-modal";
import { TaskBoardTask } from "@/types/Task";
import { useModalStore } from "@/hooks/use-modal-store";
import { toggleTaskStatusAction, deleteTaskAction, updateTaskDueDateAction } from "@/app/todos-actions";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent
} from "@dnd-kit/core";


interface TodosClientWrapperProps {
  tasks: TaskBoardTask[];
}

export default function TodosClientWrapper({ tasks: initialTasks }: TodosClientWrapperProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState<TaskBoardTask[]>(initialTasks);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { openAufgabeModal } = useModalStore();
  const [activeTask, setActiveTask] = useState<TaskBoardTask | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleActionError = useCallback((previousTasks: TaskBoardTask[], defaultMessage: string, serverError?: { message: string }) => {
    setTasks(previousTasks);
    toast({
      title: "Fehler",
      description: serverError?.message || defaultMessage,
      variant: "destructive",
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Filter tasks based on search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(
      (task) =>
        task.name.toLowerCase().includes(query) ||
        (task.beschreibung && task.beschreibung.toLowerCase().includes(query))
    );
  }, [tasks, searchQuery]);

  const handleTaskUpdated = useCallback((updatedTask: TaskBoardTask) => {
    setTasks((currentTasks) => {
      const exists = currentTasks.some((task) => task.id === updatedTask.id);
      if (exists) {
        return currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task
        );
      }
      return [updatedTask, ...currentTasks];
    });
  }, []);



  const handleAddTask = useCallback((defaultDate?: Date) => {
    try {
      const initialData = defaultDate
        ? { faelligkeitsdatum: format(defaultDate, "yyyy-MM-dd") }
        : undefined;
      openAufgabeModal(initialData, handleTaskUpdated);
    } catch (error) {
      console.error("Error opening task modal:", error);
    }
  }, [openAufgabeModal, handleTaskUpdated]);

  const handleTaskClick = useCallback((task: TaskBoardTask) => {
    openAufgabeModal(task, handleTaskUpdated);
  }, [openAufgabeModal, handleTaskUpdated]);

  const handleTaskToggle = useCallback(async (taskId: string, completed: boolean) => {
    // Optimistic update
    const previousTasks = tasks;
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? { ...task, ist_erledigt: completed, aenderungsdatum: new Date().toISOString() }
          : task
      )
    );

    try {
      const result = await toggleTaskStatusAction(taskId, completed);
      if (!result.success) {
        handleActionError(previousTasks, "Status konnte nicht aktualisiert werden.", result.error);
      } else {
        toast({
          title: completed ? "Aufgabe erledigt" : "Aufgabe reaktiviert",
          description: completed
            ? "Die Aufgabe wurde als erledigt markiert."
            : "Die Aufgabe wurde als ausstehend markiert.",
        });
      }
    } catch (error) {
      handleActionError(previousTasks, "Status konnte nicht aktualisiert werden.");
    }
  }, [tasks, handleActionError]);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    const previousTasks = tasks;
    const taskToDelete = tasks.find((t) => t.id === taskId);

    // Optimistic delete
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));

    try {
      const result = await deleteTaskAction(taskId);
      if (!result.success) {
        handleActionError(previousTasks, "Aufgabe konnte nicht gelöscht werden.", result.error);
      } else {
        toast({
          title: "Aufgabe gelöscht",
          description: `"${taskToDelete?.name}" wurde gelöscht.`,
        });
      }
    } catch (error) {
      handleActionError(previousTasks, "Aufgabe konnte nicht gelöscht werden.");
    }
  }, [tasks, handleActionError]);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setIsDayModalOpen(true);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    if (event.active.data.current?.task) {
      setActiveTask(event.active.data.current.task as TaskBoardTask);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setActiveId(null);

    if (!over) return;

    // Extract task ID securely from data if available, or fallback (though data should be there)
    const taskData = active.data.current?.task as TaskBoardTask | undefined;
    const taskId = taskData?.id;

    if (!taskId) return;

    // Handle dropping on "No Date" zone
    if (over.id === "remove-date-zone") {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || !task.faelligkeitsdatum) return;

      // Optimistic update
      const previousTasks = tasks;
      const updatedTask = { ...task, faelligkeitsdatum: null, aenderungsdatum: new Date().toISOString() };
      handleTaskUpdated(updatedTask);

      try {
        const result = await updateTaskDueDateAction(taskId, null);
        if (!result.success) {
          handleActionError(previousTasks, "Datum konnte nicht entfernt werden.", result.error);
        } else {
          toast({
            title: "Datum entfernt",
            description: "Die Fälligkeit der Aufgabe wurde entfernt.",
          });
        }
      } catch (error) {
        handleActionError(previousTasks, "Datum konnte nicht entfernt werden.");
      }
      return;
    }

    const dateStr = over.id as string;

    // Validate date string (simple check if it matches yyyy-MM-dd format used in calendar keys)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.faelligkeitsdatum === dateStr) return;

    // Optimistic update
    const previousTasks = tasks;
    const updatedTask = { ...task, faelligkeitsdatum: dateStr, aenderungsdatum: new Date().toISOString() };
    handleTaskUpdated(updatedTask);

    try {
      const result = await updateTaskDueDateAction(taskId, dateStr);
      if (!result.success) {
        handleActionError(previousTasks, "Datum konnte nicht aktualisiert werden.", result.error);
      } else {
        toast({
          title: "Aufgabe verschoben",
          description: `Fälligkeitsdatum auf ${format(parseISO(dateStr), 'dd.MM.yyyy')} geändert.`,
        });
      }
    } catch (error) {
      handleActionError(previousTasks, "Datum konnte nicht aktualisiert werden.");
    }

  }, [tasks, handleTaskUpdated, handleActionError]);

  const handleMonthChange = useCallback((date: Date) => {
    setCurrentMonth(date);
  }, []);


  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8 bg-white dark:bg-[#181818]">
        {/* Background gradient */}
        <div
          className="absolute inset-0 z-[-1] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
          }}
        />

        <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Aufgaben Board</CardTitle>
                <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                  Verwalten Sie hier alle Ihre Aufgaben
                </p>
              </div>
              <div className="mt-0 sm:mt-1">
                <ResponsiveButtonWithTooltip
                  onClick={() => handleAddTask()}
                  icon={<PlusCircle className="h-4 w-4" />}
                  shortText="Hinzufügen"
                >
                  Aufgabe hinzufügen
                </ResponsiveButtonWithTooltip>
              </div>
            </div>
          </CardHeader>

          <div className="px-4 sm:px-6">
            <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
          </div>

          <CardContent className="flex flex-col gap-6 pt-6">

            {/* Calendar and Sidebar Grid */}
            <div className={cn(
              "grid gap-6 lg:h-[calc(100vh-250px)] transition-all duration-300 ease-in-out",
              isSidebarOpen ? "grid-cols-1 lg:grid-cols-[280px_1fr]" : "grid-cols-1 lg:grid-cols-[60px_1fr]"
            )}>
              {/* Sidebar */}
              <div className={cn(
                "order-2 lg:order-1 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-[#3C4251] p-4 h-fit lg:h-full overflow-hidden flex flex-col transition-all duration-300",
                !isSidebarOpen && "items-center px-2"
              )}>
                <div className={cn("flex flex-col gap-4 mb-4 shrink-0", !isSidebarOpen && "gap-2 mb-2")}>
                  <div className={cn("flex items-center gap-2", !isSidebarOpen && "justify-center")}>
                    <AnimatePresence mode="popLayout">
                      {isSidebarOpen && (
                        <motion.div
                          key="header-title"
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2 flex-1 overflow-hidden"
                        >
                          <List className="h-5 w-5 text-muted-foreground shrink-0" />
                          <h3 className="font-medium whitespace-nowrap">Aufgabenliste</h3>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => setSidebarOpen(!isSidebarOpen)}
                    >
                      {isSidebarOpen ? (
                        <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>

                  <AnimatePresence mode="popLayout">
                    {isSidebarOpen && (
                      <motion.div
                        key="search"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <SearchInput
                          placeholder="Aufgaben suchen..."
                          className="rounded-full"
                          wrapperClassName="w-full"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onClear={() => setSearchQuery("")}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className={cn("overflow-y-auto flex-1 -mr-2 pr-2", !isSidebarOpen && "overflow-visible")}>
                  {searchQuery && filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-full mb-3">
                        <PlusCircle className="h-6 w-6 text-muted-foreground/50 rotate-45" />
                      </div>
                      <p className="text-sm font-medium">Keine Aufgaben gefunden</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ihre Suche ergab keine Treffer.
                      </p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="mt-2 text-primary"
                        onClick={() => setSearchQuery("")}
                      >
                        Suche löschen
                      </Button>
                    </div>
                  ) : (
                    <TaskSidebar
                      tasks={filteredTasks}
                      onTaskClick={handleTaskClick}
                      onTaskToggle={handleTaskToggle}
                      collapsed={!isSidebarOpen}
                    />
                  )}
                </div>
              </div>

              {/* Calendar */}
              <div className="order-1 lg:order-2 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-[#3C4251] p-4 flex flex-col h-full overflow-hidden">
                <div className="flex items-center gap-2 mb-4 shrink-0">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-medium">Kalender</h3>
                </div>
                <TaskCalendar
                  tasks={filteredTasks}
                  currentMonth={currentMonth}
                  onMonthChange={handleMonthChange}
                  onDayClick={handleDayClick}
                  selectedDate={selectedDate}
                  onTaskClick={handleTaskClick}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Day Modal */}
        {selectedDate && (
          <TaskDayModal
            open={isDayModalOpen}
            onOpenChange={setIsDayModalOpen}
            date={selectedDate}
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            onTaskToggle={handleTaskToggle}
            onTaskDelete={handleTaskDelete}
            onAddTask={handleAddTask}
          />
        )}

        {mounted ? createPortal(
          <DragOverlay>
            {activeTask ? (
              activeId?.startsWith("calendar-") ? (
                <div className="w-[150px]">
                  <CalendarTaskPill task={activeTask} />
                </div>
              ) : (
                <div className="w-[280px]">
                  <TaskItemCard task={activeTask} onTaskClick={() => { }} onTaskToggle={() => { }} isOverlay />
                </div>
              )
            ) : null}
          </DragOverlay>,
          document.body
        ) : null}
      </div>
    </DndContext>
  );
}