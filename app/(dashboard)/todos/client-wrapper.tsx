"use client";

import { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveButtonWithTooltip } from "@/components/ui/responsive-button";
import { SearchInput } from "@/components/ui/search-input";
import { PlusCircle, Calendar as CalendarIcon, List } from "lucide-react";
import { TaskCalendar } from "@/components/tasks/task-calendar";
import { TaskSidebar } from "@/components/tasks/task-sidebar";
import { TaskDayModal } from "@/components/tasks/task-day-modal";
import { TaskBoardTask } from "@/types/Task";
import { useModalStore } from "@/hooks/use-modal-store";
import { toggleTaskStatusAction, deleteTaskAction } from "@/app/todos-actions";
import { toast } from "@/hooks/use-toast";

interface TodosClientWrapperProps {
  tasks: TaskBoardTask[];
}

export default function TodosClientWrapper({ tasks: initialTasks }: TodosClientWrapperProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState<TaskBoardTask[]>(initialTasks);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const { openAufgabeModal } = useModalStore();

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

  const handleTaskDeleted = useCallback((taskId: string) => {
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId)
    );
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
        // Revert on error
        setTasks(previousTasks);
        toast({
          title: "Fehler",
          description: result.error?.message || "Status konnte nicht aktualisiert werden.",
          variant: "destructive",
        });
      } else {
        toast({
          title: completed ? "Aufgabe erledigt" : "Aufgabe reaktiviert",
          description: completed
            ? "Die Aufgabe wurde als erledigt markiert."
            : "Die Aufgabe wurde als ausstehend markiert.",
        });
      }
    } catch (error) {
      setTasks(previousTasks);
      toast({
        title: "Fehler",
        description: "Status konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    }
  }, [tasks]);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    const previousTasks = tasks;
    const taskToDelete = tasks.find((t) => t.id === taskId);

    // Optimistic delete
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));

    try {
      const result = await deleteTaskAction(taskId);
      if (!result.success) {
        setTasks(previousTasks);
        toast({
          title: "Fehler",
          description: result.error?.message || "Aufgabe konnte nicht gelöscht werden.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Aufgabe gelöscht",
          description: `"${taskToDelete?.name}" wurde gelöscht.`,
        });
      }
    } catch (error) {
      setTasks(previousTasks);
      toast({
        title: "Fehler",
        description: "Aufgabe konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  }, [tasks]);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setIsDayModalOpen(true);
  }, []);

  const handleMonthChange = useCallback((date: Date) => {
    setCurrentMonth(date);
  }, []);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8 bg-white dark:bg-[#181818]">
      {/* Background gradient */}
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
        }}
      />

      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Aufgabenkalender</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                Verwalten Sie hier Ihre Aufgaben und Termine
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
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:h-[calc(100vh-250px)]">
            {/* Sidebar */}
            <div className="order-2 lg:order-1 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-[#3C4251] p-4 h-fit lg:h-full overflow-hidden flex flex-col">
              <div className="flex flex-col gap-4 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <List className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-medium">Aufgabenliste</h3>
                </div>
                <SearchInput
                  placeholder="Aufgaben suchen..."
                  className="rounded-full"
                  wrapperClassName="w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery("")}
                />
              </div>
              <div className="overflow-y-auto flex-1 -mr-2 pr-2">
                <TaskSidebar
                  tasks={filteredTasks}
                  onTaskClick={handleTaskClick}
                  onTaskToggle={handleTaskToggle}
                />
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
    </div>
  );
}