"use client";

import { useState, useCallback, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveButtonWithTooltip } from "@/components/ui/responsive-button";
import { PlusCircle, Calendar as CalendarIcon } from "lucide-react";
import { TaskCalendar } from "@/components/tasks/task-calendar";
import { TaskDayModal } from "@/components/tasks/task-day-modal";
import { TaskBoardTask } from "@/types/Task";
import { useModalStore } from "@/hooks/use-modal-store";
import { toggleTaskStatusAction, deleteTaskAction } from "@/app/todos-actions";
import { toast } from "@/hooks/use-toast";
import { useTaskDnd } from "@/components/tasks/task-dnd-provider";


interface TodosClientWrapperProps {
  tasks: TaskBoardTask[];
}

export default function TodosClientWrapper({ tasks: initialTasks }: TodosClientWrapperProps) {
  const [tasks, setTasks] = useState<TaskBoardTask[]>(initialTasks);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const { openAufgabeModal } = useModalStore();

  // Subscribe to date changes from the shared DnD provider (handles sidebar→calendar and calendar→calendar drops)
  const { addDateChangeListener, removeDateChangeListener } = useTaskDnd();
  useEffect(() => {
    const handler = (taskId: string, date: string | null) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, faelligkeitsdatum: date, aenderungsdatum: new Date().toISOString() } : t));
    };
    addDateChangeListener(handler);
    return () => removeDateChangeListener(handler);
  }, [addDateChangeListener, removeDateChangeListener]);

  // Sync task toggle changes from sidebar
  useEffect(() => {
    const handleSidebarToggle = (e: Event) => {
      const { taskId, completed } = (e as CustomEvent).detail;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ist_erledigt: completed, aenderungsdatum: new Date().toISOString() } : t));
    };
    const handleSidebarTaskUpdated = (e: Event) => {
      const updated = (e as CustomEvent).detail;
      if (!updated?.id) return;
      setTasks(prev => {
        const exists = prev.some(t => t.id === updated.id);
        if (exists) return prev.map(t => t.id === updated.id ? { ...t, ...updated } : t);
        return [updated, ...prev];
      });
    };
    window.addEventListener('sidebar-task-toggled', handleSidebarToggle);
    window.addEventListener('sidebar-task-updated', handleSidebarTaskUpdated);
    return () => {
      window.removeEventListener('sidebar-task-toggled', handleSidebarToggle);
      window.removeEventListener('sidebar-task-updated', handleSidebarTaskUpdated);
    };
  }, []);

  const handleActionError = useCallback((previousTasks: TaskBoardTask[], defaultMessage: string, serverError?: { message: string }) => {
    setTasks(previousTasks);
    toast({
      title: "Fehler",
      description: serverError?.message || defaultMessage,
      variant: "destructive",
    });
  }, []);

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
    const initialData = defaultDate
      ? { faelligkeitsdatum: format(defaultDate, "yyyy-MM-dd") }
      : undefined;
    openAufgabeModal(initialData, handleTaskUpdated);
  }, [openAufgabeModal, handleTaskUpdated]);

  const handleTaskClick = useCallback((task: TaskBoardTask) => {
    openAufgabeModal(task, handleTaskUpdated);
  }, [openAufgabeModal, handleTaskUpdated]);

  const handleTaskToggle = useCallback(async (taskId: string, completed: boolean) => {
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
    } catch {
      handleActionError(previousTasks, "Status konnte nicht aktualisiert werden.");
    }
  }, [tasks, handleActionError]);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    const previousTasks = tasks;
    const taskToDelete = tasks.find((t) => t.id === taskId);
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));

    try {
      const result = await deleteTaskAction(taskId);
      if (!result.success) {
        handleActionError(previousTasks, "Aufgabe konnte nicht gelöscht werden.", result.error);
      } else {
        toast({ title: "Aufgabe gelöscht", description: `"${taskToDelete?.name}" wurde gelöscht.` });
      }
    } catch {
      handleActionError(previousTasks, "Aufgabe konnte nicht gelöscht werden.");
    }
  }, [tasks, handleActionError]);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setIsDayModalOpen(true);
  }, []);

  const handleMonthChange = useCallback((date: Date) => {
    setCurrentMonth(date);
  }, []);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8">
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem]">
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
          {/* Calendar – full width, tasks come from sidebar */}
          <div className="bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-[#3C4251] p-4 flex flex-col lg:h-[calc(100vh-270px)] overflow-hidden">
            <div className="flex items-center gap-2 mb-4 shrink-0">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Kalender</h3>
            </div>
            <TaskCalendar
              tasks={tasks}
              currentMonth={currentMonth}
              onMonthChange={handleMonthChange}
              onDayClick={handleDayClick}
              selectedDate={selectedDate}
              onTaskClick={handleTaskClick}
            />
          </div>
        </CardContent>
      </Card>

      {/* Day Modal */}
      {selectedDate && (
        <TaskDayModal
          open={isDayModalOpen}
          onOpenChange={setIsDayModalOpen}
          date={selectedDate}
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onTaskToggle={handleTaskToggle}
          onTaskDelete={handleTaskDelete}
          onAddTask={handleAddTask}
        />
      )}
    </div>
  );
}