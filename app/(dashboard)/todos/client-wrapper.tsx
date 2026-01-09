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

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Aufgabenkalender</h1>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput
            placeholder="Suchen..."
            className="rounded-full"
            wrapperClassName="w-full sm:w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
          />
          <ResponsiveButtonWithTooltip
            onClick={() => handleAddTask()}
            icon={<PlusCircle className="h-4 w-4" />}
            shortText="Neu"
          >
            Aufgabe hinzufügen
          </ResponsiveButtonWithTooltip>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-2xl h-fit lg:h-auto lg:max-h-[calc(100vh-200px)] overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <List className="h-5 w-5" />
              Aufgabenliste
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TaskSidebar
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              onTaskToggle={handleTaskToggle}
            />
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Kalender
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TaskCalendar
              tasks={filteredTasks}
              currentMonth={currentMonth}
              onMonthChange={handleMonthChange}
              onDayClick={handleDayClick}
              selectedDate={selectedDate}
            />
          </CardContent>
        </Card>
      </div>

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