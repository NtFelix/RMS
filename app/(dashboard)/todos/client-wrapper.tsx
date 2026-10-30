"use client";

import { useState, useCallback, useEffect, useMemo, useReducer } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveButtonWithTooltip } from "@/components/ui/responsive-button";
import { 
  PlusCircle, 
  Calendar as CalendarIcon, 
  GripVertical, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  Clock, 
  CalendarOff,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { TaskCalendar } from "@/components/tasks/task-calendar";
import { TaskDayModal } from "@/components/tasks/task-day-modal";
import { TaskBoardTask } from "@/types/Task";
import { useModalStore } from "@/hooks/use-modal-store";
import { toggleTaskStatusAction, deleteTaskAction } from "@/app/todos-actions";
import { toast } from "@/hooks/use-toast";
import { useTaskDnd } from "@/components/tasks/task-dnd-provider";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DraggableTaskRowProps {
  task: TaskBoardTask;
  onTaskClick: (task: TaskBoardTask) => void;
  onTaskToggle: (taskId: string, completed: boolean) => void;
  formatDueDate: (dateStr: string) => string;
  canEdit?: boolean;
}

function DraggableTaskRow({
  task,
  onTaskClick,
  onTaskToggle,
  formatDueDate,
  canEdit = true,
}: DraggableTaskRowProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-task-${task.id}`,
    data: { task },
    disabled: !canEdit,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 p-2 rounded-xl transition-all duration-200 group border border-transparent",
        "hover:bg-primary/5 hover:border-primary/10 dark:hover:bg-primary/10",
        canEdit ? "cursor-grab active:cursor-grabbing select-none" : "cursor-default select-none",
        isDragging && "opacity-40 scale-95 cursor-grabbing bg-primary/5",
        task.ist_erledigt && "opacity-60"
      )}
    >
      <GripVertical className="size-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      <Checkbox
        checked={task.ist_erledigt}
        onCheckedChange={(checked) => onTaskToggle(task.id, checked as boolean)}
        onClick={(e) => { e.stopPropagation(); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="shrink-0"
        disabled={!canEdit}
      />
      <div
        className="flex-1 min-w-0"
        onClick={(e) => { e.stopPropagation(); if (canEdit) onTaskClick(task); }}
        onKeyUp={(e) => { if (canEdit && (e.key === 'Enter' || e.key === ' ')) { e.stopPropagation(); onTaskClick(task); } }}
        role={canEdit ? 'button' : undefined}
        tabIndex={canEdit ? 0 : undefined}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p draggable={false} className={cn("text-xs font-medium truncate pointer-events-none", task.ist_erledigt && "line-through text-muted-foreground")}>
          {task.name}
        </p>
        {task.faelligkeitsdatum && (
          <p draggable={false} className="text-[10px] text-muted-foreground mt-0.5 pointer-events-none">
            {formatDueDate(task.faelligkeitsdatum)}
          </p>
        )}
      </div>
      {task.ist_erledigt ? (
        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      ) : (
        <Circle className="size-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

function DroppableNoDateTrigger({
  noDateOpen,
  noDateCount,
}: {
  noDateOpen: boolean;
  noDateCount: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "sidebar-remove-date-zone" });
  return (
    <CollapsibleTrigger
      ref={setNodeRef}
      className={cn(
        "flex items-center justify-between w-full p-2 rounded-xl transition-all duration-200 border group/trigger",
        isOver
          ? "bg-primary/8 border-primary/30 dark:bg-primary/10 dark:border-primary/40 shadow-sm"
          : "border-transparent hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30"
      )}
    >
      <div className="flex items-center gap-1.5">
        <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", noDateOpen && "rotate-90")} />
        <CalendarOff className={cn("h-3.5 w-3.5 transition-colors", isOver ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("text-xs font-semibold transition-colors", isOver && "text-primary")}>Ohne Datum</span>
        {isOver && <span className="text-[9px] font-bold text-primary animate-pulse">– Datum entfernen</span>}
      </div>
      <Badge variant="outline" className="h-4.5 px-1.5 text-[10px]">{noDateCount}</Badge>
    </CollapsibleTrigger>
  );
}

const dueDateFormatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' });

function formatDueDate(dateStr: string) {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return dueDateFormatter.format(date);
  } catch {
    return dateStr;
  }
}

interface SidebarTaskListProps {
  tasks: TaskBoardTask[];
  setTasks: React.Dispatch<React.SetStateAction<TaskBoardTask[]>>;
  onTaskClick: (task: TaskBoardTask) => void;
  onTaskToggle: (taskId: string, completed: boolean) => void;
  canEdit?: boolean;
}

type CollapsibleKey = 'upcoming' | 'noDate' | 'overdue' | 'later' | 'done';

function collapsibleReducer(state: Record<CollapsibleKey, boolean>, action: { key: CollapsibleKey; open: boolean }) {
  return { ...state, [action.key]: action.open };
}

function SidebarTaskList({ tasks, setTasks, onTaskClick, onTaskToggle, canEdit = true }: SidebarTaskListProps) {
  const [collapsibleState, dispatchCollapsible] = useReducer(collapsibleReducer, {
    upcoming: true,
    noDate: true,
    overdue: true,
    later: false,
    done: false,
  });

  const { addDateChangeListener, removeDateChangeListener } = useTaskDnd();
  useEffect(() => {
    const handler = (taskId: string, date: string | null) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, faelligkeitsdatum: date } : t));
    };
    addDateChangeListener(handler);
    return () => removeDateChangeListener(handler);
  }, [addDateChangeListener, removeDateChangeListener, setTasks]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const nextWeek = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d;
  }, [today]);

  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);
  const nextWeekStr = useMemo(() => nextWeek.toISOString().split('T')[0], [nextWeek]);

  const { upcomingTasks, noDateTasks, overdueTasks, laterTasks, doneTasks } = useMemo(() => {
    const upcoming: TaskBoardTask[] = [];
    const noDate: TaskBoardTask[] = [];
    const overdue: TaskBoardTask[] = [];
    const later: TaskBoardTask[] = [];
    const done: TaskBoardTask[] = [];

    tasks.forEach((task) => {
      if (task.ist_erledigt) {
        done.push(task);
        return;
      }
      if (!task.faelligkeitsdatum) {
        noDate.push(task);
      } else if (task.faelligkeitsdatum < todayStr) {
        overdue.push(task);
      } else if (task.faelligkeitsdatum <= nextWeekStr) {
        upcoming.push(task);
      } else {
        later.push(task);
      }
    });

    upcoming.sort((a, b) => (a.faelligkeitsdatum ?? '').localeCompare(b.faelligkeitsdatum ?? ''));
    overdue.sort((a, b) => (b.faelligkeitsdatum ?? '').localeCompare(a.faelligkeitsdatum ?? ''));
    later.sort((a, b) => (a.faelligkeitsdatum ?? '').localeCompare(b.faelligkeitsdatum ?? ''));
    noDate.sort((a, b) => new Date(b.erstellungsdatum ?? 0).getTime() - new Date(a.erstellungsdatum ?? 0).getTime());
    done.sort((a, b) => new Date(b.aenderungsdatum ?? b.erstellungsdatum ?? 0).getTime() - new Date(a.aenderungsdatum ?? a.erstellungsdatum ?? 0).getTime());

    return { upcomingTasks: upcoming, noDateTasks: noDate, overdueTasks: overdue, laterTasks: later, doneTasks: done };
  }, [tasks, todayStr, nextWeekStr]);

  const totalOpen = overdueTasks.length + upcomingTasks.length + laterTasks.length + noDateTasks.length;

  return (
    <div className="space-y-1 mt-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1 pb-1">Aufgabenliste</div>

      {totalOpen === 0 && doneTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="size-8 text-emerald-400 mb-2" />
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Keine Aufgaben vorhanden</p>
        </div>
      )}

      {overdueTasks.length > 0 && (
        <Collapsible open={collapsibleState.overdue} onOpenChange={(open) => dispatchCollapsible({ key: 'overdue', open })}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-xl transition-all duration-200 hover:bg-red-50/50 dark:hover:bg-red-950/20 border border-transparent group/trigger">
            <div className="flex items-center gap-1.5">
              <ChevronRight className={cn("size-3.5 text-red-500 transition-transform duration-200", collapsibleState.overdue && "rotate-90")} />
              <Clock className="size-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">Überfällig</span>
            </div>
            <Badge variant="destructive" className="h-4.5 px-1.5 text-[10px]">{overdueTasks.length}</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-0.5 space-y-0.5 pl-1">
            {overdueTasks.map(task => (
              <DraggableTaskRow key={task.id} task={task} onTaskClick={onTaskClick} onTaskToggle={onTaskToggle} formatDueDate={formatDueDate} canEdit={canEdit} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      <Collapsible open={collapsibleState.upcoming} onOpenChange={(open) => dispatchCollapsible({ key: 'upcoming', open })}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-xl transition-all duration-200 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 border border-transparent group/trigger">
          <div className="flex items-center gap-1.5">
            <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform duration-200", collapsibleState.upcoming && "rotate-90")} />
            <Clock className="size-3.5 text-yellow-600" />
            <span className="text-xs font-semibold">Anstehend</span>
          </div>
          <Badge variant="secondary" className="h-4.5 px-1.5 text-[10px]">{upcomingTasks.length}</Badge>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-0.5 space-y-0.5 pl-1">
          {upcomingTasks.map(task => (
            <DraggableTaskRow key={task.id} task={task} onTaskClick={onTaskClick} onTaskToggle={onTaskToggle} formatDueDate={formatDueDate} canEdit={canEdit} />
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={collapsibleState.later} onOpenChange={(open) => dispatchCollapsible({ key: 'later', open })}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-xl transition-all duration-200 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 border border-transparent group/trigger">
          <div className="flex items-center gap-1.5">
            <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform duration-200", collapsibleState.later && "rotate-90")} />
            <Clock className="size-3.5 text-blue-500" />
            <span className="text-xs font-semibold">Später</span>
          </div>
          <Badge variant="outline" className="h-4.5 px-1.5 text-[10px]">{laterTasks.length}</Badge>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-0.5 space-y-0.5 pl-1">
          {laterTasks.map(task => (
            <DraggableTaskRow key={task.id} task={task} onTaskClick={onTaskClick} onTaskToggle={onTaskToggle} formatDueDate={formatDueDate} canEdit={canEdit} />
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={collapsibleState.noDate} onOpenChange={(open) => dispatchCollapsible({ key: 'noDate', open })}>
        <DroppableNoDateTrigger noDateOpen={collapsibleState.noDate} noDateCount={noDateTasks.length} />
        <CollapsibleContent className="mt-0.5 flex flex-col gap-0.5 pl-1">
          {noDateTasks.map(task => (
            <DraggableTaskRow key={task.id} task={task} onTaskClick={onTaskClick} onTaskToggle={onTaskToggle} formatDueDate={formatDueDate} canEdit={canEdit} />
          ))}
        </CollapsibleContent>
      </Collapsible>

      {doneTasks.length > 0 && (
        <Collapsible open={collapsibleState.done} onOpenChange={(open) => dispatchCollapsible({ key: 'done', open })}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-xl transition-all duration-200 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 border border-transparent group/trigger">
            <div className="flex items-center gap-1.5">
              <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform duration-200", collapsibleState.done && "rotate-90")} />
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Erledigt</span>
            </div>
            <Badge variant="outline" className="h-4.5 px-1.5 text-[10px]">{doneTasks.length}</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-0.5 space-y-0.5 pl-1">
            {doneTasks.map(task => (
              <DraggableTaskRow key={task.id} task={task} onTaskClick={onTaskClick} onTaskToggle={onTaskToggle} formatDueDate={formatDueDate} canEdit={canEdit} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function TaskOverviewStats({ tasks }: { tasks: TaskBoardTask[] }) {
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.ist_erledigt).length;
    const open = total - completed;
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = tasks.filter(t => !t.ist_erledigt && t.faelligkeitsdatum && t.faelligkeitsdatum < todayStr).length;
    const dueToday = tasks.filter(t => !t.ist_erledigt && t.faelligkeitsdatum && t.faelligkeitsdatum === todayStr).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, open, overdue, dueToday, completionRate };
  }, [tasks]);

  return (
    <>
      <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300 space-y-4 shrink-0">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 mb-1">Offen</div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {taskStats.open}
            </div>
          </div>
          <div className="text-center border-x border-zinc-100 dark:border-zinc-800/60 px-1">
            <div className="text-[10px] font-semibold text-red-500 dark:text-red-400 mb-1">Überfällig</div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {taskStats.overdue}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 mb-1">Erledigt</div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {taskStats.completed}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] shadow-xs hover:shadow-sm transition-all duration-300 space-y-3 shrink-0">
        <div className="flex justify-between items-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="size-3.5" />
            Erfüllungsquote
          </span>
          <span className="text-accent">{taskStats.completionRate}%</span>
        </div>
        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-accent dark:bg-accent rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
            style={{ width: `${Math.min(100, Math.max(0, taskStats.completionRate))}%` }}
          />
        </div>
      </div>
    </>
  );
}

function TaskCreateButton({ onClick, canCreate }: { onClick: () => void; canCreate: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canCreate}
      className={cn(
        "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 text-xs font-bold transition-all duration-300 shrink-0",
        canCreate 
          ? "hover:border-accent/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 text-zinc-800 dark:text-zinc-200 hover:text-accent dark:hover:text-accent active:scale-98 cursor-pointer" 
          : "opacity-50 cursor-not-allowed text-zinc-400 dark:text-zinc-600"
      )}
      title={!canCreate ? "Keine Berechtigung zum Erstellen" : undefined}
    >
      <PlusCircle className="size-4" />
      Neue Aufgabe erstellen
    </button>
  );
}

interface TodosClientWrapperProps {
  tasks: TaskBoardTask[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export default function TodosClientWrapper({ tasks: initialTasks, canCreate = true, canEdit = true, canDelete = true }: TodosClientWrapperProps) {
  const [tasks, setTasks] = useState<TaskBoardTask[]>(initialTasks);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const { openAufgabeModal } = useModalStore();

  const { addDateChangeListener, removeDateChangeListener } = useTaskDnd();
  useEffect(() => {
    const handler = (taskId: string, date: string | null) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, faelligkeitsdatum: date, aenderungsdatum: new Date().toISOString() } : t));
    };
    addDateChangeListener(handler);
    return () => removeDateChangeListener(handler);
  }, [addDateChangeListener, removeDateChangeListener]);

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
    if (!canCreate) {
      toast({
        title: "Fehler",
        description: "Sie haben keine Berechtigung, Aufgaben zu erstellen.",
        variant: "destructive",
      });
      return;
    }
    const initialData = defaultDate
      ? { faelligkeitsdatum: format(defaultDate, "yyyy-MM-dd") }
      : undefined;
    openAufgabeModal(initialData, handleTaskUpdated);
  }, [openAufgabeModal, handleTaskUpdated, canCreate]);

  const handleTaskClick = useCallback((task: TaskBoardTask) => {
    if (!canEdit) {
      toast({
        title: "Fehler",
        description: "Sie haben keine Berechtigung, Aufgaben zu bearbeiten.",
        variant: "destructive",
      });
      return;
    }
    openAufgabeModal(task, handleTaskUpdated);
  }, [openAufgabeModal, handleTaskUpdated, canEdit]);

  const handleTaskToggle = useCallback(async (taskId: string, completed: boolean) => {
    if (!canEdit) {
      toast({
        title: "Fehler",
        description: "Sie haben keine Berechtigung, Aufgaben zu bearbeiten.",
        variant: "destructive",
      });
      return;
    }
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
  }, [tasks, handleActionError, canEdit]);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    if (!canDelete) {
      toast({
        title: "Fehler",
        description: "Sie haben keine Berechtigung, Aufgaben zu löschen.",
        variant: "destructive",
      });
      return;
    }
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
  }, [tasks, handleActionError, canDelete]);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setIsDayModalOpen(true);
  }, []);

  const handleMonthChange = useCallback((date: Date) => {
    setCurrentMonth(date);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col p-4 sm:p-6 min-h-0 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-full min-h-0">
        <Card className="lg:col-span-3 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] overflow-hidden flex flex-col h-full min-h-0">
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="text-lg">Aufgaben Übersicht</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Statistiken und Listen
            </p>
          </CardHeader>

          <div className="px-6 pb-2 shrink-0">
            <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
          </div>

          <CardContent className="flex-1 flex flex-col gap-4 pt-2 overflow-y-auto custom-scrollbar min-h-0">
            <TaskOverviewStats tasks={tasks} />
            <TaskCreateButton onClick={() => handleAddTask()} canCreate={canCreate} />
            <SidebarTaskList
              tasks={tasks}
              setTasks={setTasks}
              onTaskClick={handleTaskClick}
              onTaskToggle={handleTaskToggle}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-9 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] flex flex-col h-full min-h-0">
          <CardHeader className="shrink-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Aufgaben Board</CardTitle>
                <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                  Verwalten und planen Sie Ihre Termine im interaktiven Kalender
                </p>
              </div>
              <div className="mt-0 sm:mt-1">
                <ResponsiveButtonWithTooltip
                  onClick={() => handleAddTask()}
                  icon={<PlusCircle className="size-4" />}
                  shortText="Hinzufügen"
                  disabled={!canCreate}
                  tooltip="Keine Berechtigung zum Erstellen"
                  showTooltip={!canCreate}
                >
                  Aufgabe hinzufügen
                </ResponsiveButtonWithTooltip>
              </div>
            </div>
          </CardHeader>

          <div className="px-4 sm:px-6 shrink-0">
            <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
          </div>

          <CardContent className="flex-1 flex flex-col gap-6 pt-6 min-h-0 overflow-hidden">
            <div className="bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-[#3C4251] p-4 flex flex-col h-full min-h-0 overflow-hidden">
              <div className="flex items-center gap-2 mb-4 shrink-0">
                <CalendarIcon className="size-5 text-muted-foreground" />
                <h3 className="font-medium">Kalender</h3>
              </div>
              <div className="flex-1 min-h-0">
                <TaskCalendar
                  tasks={tasks}
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
      </div>

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
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}
    </div>
  );
}
