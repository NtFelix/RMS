"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { GripVertical, CalendarCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { updateTaskDueDateAction } from "@/app/todos-actions";
import { toast } from "@/hooks/use-toast";

// ─── Context ─────────────────────────────────────────────────────────────────

interface TaskDndContextValue {
  /** Called when a task's due date changes (set or cleared) from any source */
  onTaskDateChanged: (taskId: string, date: string | null) => void;
  /** Register a listener that gets called when a task date changes */
  addDateChangeListener: (fn: (taskId: string, date: string | null) => void) => void;
  removeDateChangeListener: (fn: (taskId: string, date: string | null) => void) => void;
}

const TaskDndContext = createContext<TaskDndContextValue>({
  onTaskDateChanged: () => {},
  addDateChangeListener: () => {},
  removeDateChangeListener: () => {},
});

export function useTaskDnd() {
  return useContext(TaskDndContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ActiveDragTask {
  id: string;
  name: string;
  faelligkeitsdatum?: string | null;
  source: "sidebar" | "calendar";
}

export function TaskDndProvider({ children }: { children: React.ReactNode }) {
  const [activeTask, setActiveTask] = useState<ActiveDragTask | null>(null);
  const [mounted, setMounted] = useState(false);
  const [listeners] = useState<Set<(taskId: string, date: string | null) => void>>(() => new Set());

  useEffect(() => { setMounted(true); }, []);

  const addDateChangeListener = useCallback((fn: (taskId: string, date: string | null) => void) => {
    listeners.add(fn);
  }, [listeners]);

  const removeDateChangeListener = useCallback((fn: (taskId: string, date: string | null) => void) => {
    listeners.delete(fn);
  }, [listeners]);

  const onTaskDateChanged = useCallback((taskId: string, date: string | null) => {
    listeners.forEach(fn => fn(taskId, date));
  }, [listeners]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task;
    const source = (event.active.id as string).startsWith("calendar-") ? "calendar" : "sidebar";
    if (task) {
      setActiveTask({ ...task, source });
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskData = active.data.current?.task;
    if (!taskData) return;

    const taskId = taskData.id;
    const overId = over.id as string;

    // Drop on "Ohne Datum" zone (sidebar or calendar's remove-date-zone)
    if (overId === "remove-date-zone" || overId === "sidebar-remove-date-zone") {
      if (!taskData.faelligkeitsdatum) return;

      // Notify all listeners (sidebar + calendar)
      onTaskDateChanged(taskId, null);
      window.dispatchEvent(new CustomEvent("sidebar-task-date-changed", { detail: { taskId, date: null } }));

      try {
        const result = await updateTaskDueDateAction(taskId, null);
        if (!result.success) {
          onTaskDateChanged(taskId, taskData.faelligkeitsdatum); // rollback
          toast({ title: "Fehler", description: "Datum konnte nicht entfernt werden.", variant: "destructive" });
        } else {
          toast({ title: "Datum entfernt", description: "Die Fälligkeit der Aufgabe wurde entfernt." });
        }
      } catch {
        onTaskDateChanged(taskId, taskData.faelligkeitsdatum);
        toast({ title: "Fehler", description: "Datum konnte nicht entfernt werden.", variant: "destructive" });
      }
      return;
    }

    // Drop on a calendar day (date string yyyy-MM-dd)
    if (/^\d{4}-\d{2}-\d{2}$/.test(overId)) {
      if (taskData.faelligkeitsdatum === overId) return; // No change

      onTaskDateChanged(taskId, overId);
      window.dispatchEvent(new CustomEvent("sidebar-task-date-changed", { detail: { taskId, date: overId } }));

      try {
        const result = await updateTaskDueDateAction(taskId, overId);
        if (!result.success) {
          onTaskDateChanged(taskId, taskData.faelligkeitsdatum ?? null); // rollback
          toast({ title: "Fehler", description: "Datum konnte nicht gesetzt werden.", variant: "destructive" });
        } else {
          const formattedDate = format(parseISO(overId), "dd. MMMM yyyy", { locale: de });
          toast({ title: "Aufgabe verschoben", description: `Fälligkeitsdatum auf ${formattedDate} gesetzt.` });
        }
      } catch {
        onTaskDateChanged(taskId, taskData.faelligkeitsdatum ?? null);
        toast({ title: "Fehler", description: "Datum konnte nicht gesetzt werden.", variant: "destructive" });
      }
      return;
    }
  }, [onTaskDateChanged]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return format(parseISO(dateStr), "dd. MMM", { locale: de });
    } catch {
      return null;
    }
  };

  return (
    <TaskDndContext.Provider value={{ onTaskDateChanged, addDateChangeListener, removeDateChangeListener }}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {children}

        {/* Global drag overlay — beautiful card shown while dragging */}
        {mounted && createPortal(
          <DragOverlay
            dropAnimation={{
              duration: 180,
              easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
            }}
          >
            {activeTask ? (
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl shadow-2xl border border-primary/20 bg-white dark:bg-zinc-900 min-w-[180px] max-w-[260px] rotate-2 scale-105 ring-1 ring-primary/10"
                style={{ backdropFilter: "blur(8px)" }}
              >
                <div className="shrink-0 p-1.5 rounded-lg bg-primary/10">
                  <GripVertical className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                    {activeTask.name}
                  </p>
                  {activeTask.faelligkeitsdatum ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <CalendarCheck className="h-2.5 w-2.5 shrink-0" />
                      {formatDate(activeTask.faelligkeitsdatum)}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground mt-0.5">Kein Datum</p>
                  )}
                </div>
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </TaskDndContext.Provider>
  );
}
