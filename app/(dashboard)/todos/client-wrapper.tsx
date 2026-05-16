"use client";

import { useState, useCallback, useMemo, useEffect, useReducer } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m, LazyMotion, domAnimation } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveButtonWithTooltip } from "@/components/ui/responsive-button";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar as CalendarIcon, List, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import dynamic from "next/dynamic";

const TaskCalendar = dynamic(
  () => import("@/components/tasks/task-calendar").then((mod) => mod.TaskCalendar),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-muted rounded-2xl" /> }
);

const TaskSidebar = dynamic(
  () => import("@/components/tasks/task-sidebar").then((mod) => mod.TaskSidebar),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-muted rounded-2xl" /> }
);

const TaskDayModal = dynamic(
  () => import("@/components/tasks/task-day-modal").then((mod) => mod.TaskDayModal),
  { ssr: false }
);

const CalendarTaskPill = dynamic(
  () => import("@/components/tasks/task-calendar").then((mod) => mod.CalendarTaskPill),
  { ssr: false }
);

const TaskItemCard = dynamic(
  () => import("@/components/tasks/task-sidebar").then((mod) => mod.TaskItemCard),
  { ssr: false }
);

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

// --- State Management ---

type TodosState = {
  searchQuery: string;
  tasks: TaskBoardTask[];
  currentMonth: Date;
  selectedDate: Date | null;
  isDayModalOpen: boolean;
  isSidebarOpen: boolean;
  activeTask: TaskBoardTask | null;
  activeId: string | null;
  mounted: boolean;
};

type TodosAction =
  | { type: "SET_SEARCH_QUERY"; query: string }
  | { type: "SET_TASKS"; tasks: TaskBoardTask[] }
  | { type: "UPDATE_TASK"; task: TaskBoardTask }
  | { type: "REMOVE_TASK"; id: string }
  | { type: "SET_MONTH"; date: Date }
  | { type: "SELECT_DAY"; date: Date }
  | { type: "CLOSE_DAY_MODAL" }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_ACTIVE_DRAG"; id: string | null; task: TaskBoardTask | null }
  | { type: "SET_MOUNTED" };

function todosReducer(state: TodosState, action: TodosAction): TodosState {
  switch (action.type) {
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.query };
    case "SET_TASKS":
      return { ...state, tasks: action.tasks };
    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.some(t => t.id === action.task.id)
          ? state.tasks.map(t => (t.id === action.task.id ? action.task : t))
          : [action.task, ...state.tasks]
      };
    case "REMOVE_TASK":
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.id) };
    case "SET_MONTH":
      return { ...state, currentMonth: action.date };
    case "SELECT_DAY":
      return { ...state, selectedDate: action.date, isDayModalOpen: true };
    case "CLOSE_DAY_MODAL":
      return { ...state, isDayModalOpen: false };
    case "TOGGLE_SIDEBAR":
      return { ...state, isSidebarOpen: !state.isSidebarOpen };
    case "SET_ACTIVE_DRAG":
      return { ...state, activeId: action.id, activeTask: action.task };
    case "SET_MOUNTED":
      return { ...state, mounted: true };
    default:
      return state;
  }
}

interface TodosClientWrapperProps {
  tasks: TaskBoardTask[];
}

export default function TodosClientWrapper({ tasks: initialTasks }: TodosClientWrapperProps) {
  const [state, dispatch] = useReducer(todosReducer, {
    searchQuery: "",
    tasks: initialTasks,
    currentMonth: new Date(),
    selectedDate: null,
    isDayModalOpen: false,
    isSidebarOpen: true,
    activeTask: null,
    activeId: null,
    mounted: false
  });

  useEffect(() => {
    dispatch({ type: "SET_MOUNTED" });
  }, []);

  // Update tasks if initialTasks prop changes (respecting react-doctor recommendation)
  useEffect(() => {
    dispatch({ type: "SET_TASKS", tasks: initialTasks });
  }, [initialTasks]);

  const { openAufgabeModal } = useModalStore();

  const handleActionError = useCallback((previousTasks: TaskBoardTask[], defaultMessage: string, serverError?: { message: string }) => {
    dispatch({ type: "SET_TASKS", tasks: previousTasks });
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
    if (!state.searchQuery) return state.tasks;
    const query = state.searchQuery.toLowerCase();
    return state.tasks.filter(
      (task) =>
        task.name.toLowerCase().includes(query) ||
        (task.beschreibung && task.beschreibung.toLowerCase().includes(query))
    );
  }, [state.tasks, state.searchQuery]);

  const handleTaskUpdated = useCallback((updatedTask: TaskBoardTask) => {
    dispatch({ type: "UPDATE_TASK", task: updatedTask });
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
    const previousTasks = state.tasks;
    const updatedTask = state.tasks.find(t => t.id === taskId);
    if (updatedTask) {
      handleTaskUpdated({ ...updatedTask, ist_erledigt: completed, aenderungsdatum: new Date().toISOString() });
    }

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
  }, [state.tasks, handleTaskUpdated, handleActionError]);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    const previousTasks = state.tasks;
    const taskToDelete = state.tasks.find((t) => t.id === taskId);

    dispatch({ type: "REMOVE_TASK", id: taskId });

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
  }, [state.tasks, handleActionError]);

  const handleDayClick = useCallback((date: Date) => {
    dispatch({ type: "SELECT_DAY", date });
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeTask = event.active.data.current?.task as TaskBoardTask | null;
    dispatch({ type: "SET_ACTIVE_DRAG", id: event.active.id as string, task: activeTask });
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    const taskData = active.data.current?.task as TaskBoardTask | undefined;
    const taskId = taskData?.id;

    dispatch({ type: "SET_ACTIVE_DRAG", id: null, task: null });

    if (!over || !taskId) return;

    const previousTasks = state.tasks;
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Handle dropping on "No Date" zone
    if (over.id === "remove-date-zone") {
      if (!task.faelligkeitsdatum) return;
      const updatedTask = { ...task, faelligkeitsdatum: null, aenderungsdatum: new Date().toISOString() };
      handleTaskUpdated(updatedTask);

      try {
        const result = await updateTaskDueDateAction(taskId, null);
        if (!result.success) {
          handleActionError(previousTasks, "Datum konnte nicht entfernt werden.", result.error);
        } else {
          toast({ title: "Datum entfernt", description: "Die Fälligkeit der Aufgabe wurde entfernt." });
        }
      } catch (error) {
        handleActionError(previousTasks, "Datum konnte nicht entfernt werden.");
      }
      return;
    }

    const dateStr = over.id as string;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
    if (task.faelligkeitsdatum === dateStr) return;

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
  }, [state.tasks, handleTaskUpdated, handleActionError]);

  const handleMonthChange = useCallback((date: Date) => {
    dispatch({ type: "SET_MONTH", date });
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8 bg-white dark:bg-[#181818]">
          <div
            className="absolute inset-0 z-[-1] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
            }}
          />

          <Card className="bg-zinc-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
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
                    icon={<PlusCircle className="size-4" />}
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
              <div className={cn(
                "grid gap-6 lg:h-[calc(100vh-250px)] transition-all duration-300 ease-in-out",
                state.isSidebarOpen ? "grid-cols-1 lg:grid-cols-[280px_1fr]" : "grid-cols-1 lg:grid-cols-[60px_1fr]"
              )}>
                <SidebarSection 
                  isSidebarOpen={state.isSidebarOpen}
                  searchQuery={state.searchQuery}
                  filteredTasks={filteredTasks}
                  onToggleSidebar={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
                  onSearchChange={(query) => dispatch({ type: "SET_SEARCH_QUERY", query })}
                  onTaskClick={handleTaskClick}
                  onTaskToggle={handleTaskToggle}
                />

                <div className="order-1 lg:order-2 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-[#3C4251] p-4 flex flex-col h-full overflow-hidden">
                  <div className="flex items-center gap-2 mb-4 shrink-0">
                    <CalendarIcon className="size-5 text-muted-foreground" />
                    <h3 className="font-semibold">Kalender</h3>
                  </div>
                  <TaskCalendar
                    tasks={filteredTasks}
                    currentMonth={state.currentMonth}
                    onMonthChange={handleMonthChange}
                    onDayClick={handleDayClick}
                    selectedDate={state.selectedDate}
                    onTaskClick={handleTaskClick}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {state.selectedDate && (
            <TaskDayModal
              open={state.isDayModalOpen}
              onOpenChange={(open) => !open && dispatch({ type: "CLOSE_DAY_MODAL" })}
              date={state.selectedDate}
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              onTaskToggle={handleTaskToggle}
              onTaskDelete={handleTaskDelete}
              onAddTask={handleAddTask}
            />
          )}

          {state.mounted ? createPortal(
            <DragOverlay>
              {state.activeTask ? (
                state.activeId?.startsWith("calendar-") ? (
                  <div className="w-[150px]">
                    <CalendarTaskPill task={state.activeTask} />
                  </div>
                ) : (
                  <div className="w-[280px]">
                    <TaskItemCard task={state.activeTask} onTaskClick={() => { }} onTaskToggle={() => { }} isOverlay />
                  </div>
                )
              ) : null}
            </DragOverlay>,
            document.body
          ) : null}
        </div>
      </DndContext>
    </LazyMotion>
  );
}

// --- Sub-components to keep the main component manageable ---

interface SidebarSectionProps {
  isSidebarOpen: boolean;
  searchQuery: string;
  filteredTasks: TaskBoardTask[];
  onToggleSidebar: () => void;
  onSearchChange: (query: string) => void;
  onTaskClick: (task: TaskBoardTask) => void;
  onTaskToggle: (id: string, completed: boolean) => void;
}

function SidebarSection({
  isSidebarOpen,
  searchQuery,
  filteredTasks,
  onToggleSidebar,
  onSearchChange,
  onTaskClick,
  onTaskToggle
}: SidebarSectionProps) {
  return (
    <div className={cn(
      "order-2 lg:order-1 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-[#3C4251] p-4 h-fit lg:h-full overflow-hidden flex flex-col transition-all duration-300",
      !isSidebarOpen && "items-center px-2"
    )}>
      <div className={cn("flex flex-col gap-4 mb-4 shrink-0", !isSidebarOpen && "gap-2 mb-2")}>
        <div className={cn("flex items-center gap-2", !isSidebarOpen && "justify-center")}>
          <AnimatePresence mode="popLayout">
            {isSidebarOpen && (
              <m.div
                key="header-title"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: "auto" }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 flex-1 overflow-hidden"
              >
                <List className="size-5 text-muted-foreground shrink-0" />
                <h3 className="font-semibold whitespace-nowrap">Aufgabenliste</h3>
              </m.div>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={onToggleSidebar}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="size-4 text-muted-foreground" />
            ) : (
              <PanelLeftOpen className="size-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        <AnimatePresence mode="popLayout">
          {isSidebarOpen && (
            <m.div
              key="search"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <SearchInput
                placeholder="Aufgaben suchen…"
                className="rounded-full"
                wrapperClassName="w-full"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onClear={() => onSearchChange("")}
              />
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <div className={cn("overflow-y-auto flex-1 -mr-2 pr-2", !isSidebarOpen && "overflow-visible")}>
        {searchQuery && filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="bg-zinc-50 dark:bg-gray-800/50 p-3 rounded-full mb-3">
              <PlusCircle className="size-6 text-muted-foreground/50 rotate-45" />
            </div>
            <p className="text-sm font-semibold">Keine Aufgaben gefunden</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ihre Suche ergab keine Treffer.
            </p>
            <Button 
              variant="link" 
              size="sm" 
              className="mt-2 text-primary"
              onClick={() => onSearchChange("")}
            >
              Suche löschen
            </Button>
          </div>
        ) : (
          <TaskSidebar
            tasks={filteredTasks}
            onTaskClick={onTaskClick}
            onTaskToggle={onTaskToggle}
            collapsed={!isSidebarOpen}
          />
        )}
      </div>
    </div>
  );
}
