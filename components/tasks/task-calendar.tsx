"use client";

import { useMemo, useCallback, useState } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    startOfWeek,
    endOfWeek,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    addYears,
    subYears,
    startOfYear,
    endOfYear,
    eachMonthOfInterval,
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Check, Clock, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TaskBoardTask as Task } from "@/types/Task";

interface TaskCalendarProps {
    tasks: Task[];
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
    onDayClick: (date: Date) => void;
    selectedDate?: Date | null;
    onTaskClick?: (task: Task) => void;
}

export function TaskCalendar({
    tasks,
    currentMonth,
    onMonthChange,
    onDayClick,
    selectedDate,
    onTaskClick,
}: TaskCalendarProps) {
    const [view, setView] = useState<"month" | "week" | "year">("month");
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Group tasks by date for efficient lookup
    const tasksByDate = useMemo(() => {
        const grouped: Record<string, Task[]> = {};

        tasks.forEach((task) => {
            if (task.faelligkeitsdatum) {
                const dateKey = format(new Date(task.faelligkeitsdatum), "yyyy-MM-dd");
                if (!grouped[dateKey]) {
                    grouped[dateKey] = [];
                }
                grouped[dateKey].push(task);
            }
        });

        return grouped;
    }, [tasks]);

    // Calculate calendar days based on view
    const calendarDays = useMemo(() => {
        if (view === "year") return []; // Handled separately

        if (view === "week") {
            const start = startOfWeek(currentMonth, { weekStartsOn: 1 });
            const end = endOfWeek(currentMonth, { weekStartsOn: 1 });
            return eachDayOfInterval({ start, end });
        }

        // Month View (Default)
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

        return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }, [currentMonth, view]);

    const handlePrevious = useCallback(() => {
        if (view === "month") onMonthChange(subMonths(currentMonth, 1));
        else if (view === "week") onMonthChange(subWeeks(currentMonth, 1));
        else if (view === "year") onMonthChange(subYears(currentMonth, 1));
    }, [currentMonth, onMonthChange, view]);

    const handleNext = useCallback(() => {
        if (view === "month") onMonthChange(addMonths(currentMonth, 1));
        else if (view === "week") onMonthChange(addWeeks(currentMonth, 1));
        else if (view === "year") onMonthChange(addYears(currentMonth, 1));
    }, [currentMonth, onMonthChange, view]);

    const handleToday = useCallback(() => {
        onMonthChange(new Date());
    }, [onMonthChange]);

    const handleDateSelect = useCallback((date: Date | undefined) => {
        if (date) {
            onMonthChange(date);
            setIsDatePickerOpen(false);
        }
    }, [onMonthChange]);

    // Format current period text
    const periodText = useMemo(() => {
        if (view === "year") return format(currentMonth, "yyyy");
        if (view === "week") {
            const start = startOfWeek(currentMonth, { weekStartsOn: 1 });
            const end = endOfWeek(currentMonth, { weekStartsOn: 1 });
            // If same month: "October 2026"
            // If overlapping months: "Sep - Oct 2026"
            if (isSameMonth(start, end)) {
                return format(start, "MMMM yyyy", { locale: de });
            }
            if (dateFnsIsSameYear(start, end)) {
                return `${format(start, "MMM", { locale: de })} - ${format(end, "MMMM yyyy", { locale: de })}`;
            }
            return `${format(start, "MMM yyyy", { locale: de })} - ${format(end, "MMM yyyy", { locale: de })}`;
        }
        return format(currentMonth, "MMMM yyyy", { locale: de });
    }, [currentMonth, view]);

    // Helper for year IsSameYear check to avoid import conflict if any
    function dateFnsIsSameYear(d1: Date, d2: Date) {
        return d1.getFullYear() === d2.getFullYear();
    }

    const weeks = view === "week" ? 1 : Math.ceil(calendarDays.length / 7);
    const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

    return (
        <div className="w-full h-full flex flex-col">
            {/* Unified Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 px-1 shrink-0">
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                    <Button variant="outline" size="sm" onClick={handleToday} className="mr-2">
                        Heute
                    </Button>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePrevious}
                            className="h-8 w-8"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleNext}
                            className="h-8 w-8"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" className="text-lg font-semibold hover:bg-transparent px-2 min-w-[140px] justify-center sm:justify-start">
                                {periodText}
                                <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={currentMonth}
                                onSelect={handleDateSelect}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="bg-muted/50 p-1 rounded-full flex items-center gap-1">
                    {(["week", "month", "year"] as const).map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={cn(
                                "relative px-3 py-1 text-xs font-medium rounded-full transition-colors z-10",
                                view === v ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {view === v && (
                                <motion.div
                                    layoutId="activeViewPill"
                                    className="absolute inset-0 bg-background rounded-full shadow-sm border border-border/50 -z-10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            {v === "week" ? "Woche" : v === "month" ? "Monat" : "Jahr"}
                        </button>
                    ))}
                </div>
            </div>

            {/* View Content */}
            {view === "year" ? (
                <YearView
                    currentYear={currentMonth}
                    tasksByDate={tasksByDate}
                    onMonthClick={(date) => {
                        onMonthChange(date);
                        setView("month");
                    }}
                />
            ) : (
                <>
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2 shrink-0">
                        {weekDays.map((day) => (
                            <div
                                key={day}
                                className="text-center text-sm font-medium text-muted-foreground py-2"
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div
                        className="grid grid-cols-7 gap-1 flex-1 min-h-0"
                        style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
                    >
                        {calendarDays.map((day) => {
                            const dateKey = format(day, "yyyy-MM-dd");
                            const dayTasks = tasksByDate[dateKey] || [];

                            return (
                                <CalendarDay
                                    key={dateKey}
                                    day={day}
                                    currentMonth={currentMonth}
                                    selectedDate={selectedDate || undefined}
                                    onDayClick={onDayClick}
                                    tasks={dayTasks}
                                    onTaskClick={onTaskClick}
                                    isWeekView={view === "week"}
                                />
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// Year View Component
function YearView({ currentYear, tasksByDate, onMonthClick }: {
    currentYear: Date,
    tasksByDate: Record<string, Task[]>,
    onMonthClick: (date: Date) => void
}) {
    const months = eachMonthOfInterval({
        start: startOfYear(currentYear),
        end: endOfYear(currentYear)
    });

    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 overflow-y-auto pr-2">
            {months.map(month => {
                const monthStr = format(month, "yyyy-MM");
                // Count tasks for this month
                const tasksCount = Object.keys(tasksByDate).reduce((acc, dateKey) => {
                    if (dateKey.startsWith(monthStr)) return acc + tasksByDate[dateKey].length;
                    return acc;
                }, 0);

                const isCurrentMonth = isSameMonth(month, new Date());

                return (
                    <div
                        key={monthStr}
                        onClick={() => onMonthClick(month)}
                        className={cn(
                            "flex flex-col p-4 rounded-xl border cursor-pointer transition-all hover:bg-accent/50 hover:border-primary/50",
                            isCurrentMonth && "bg-primary/5 border-primary"
                        )}
                    >
                        <span className={cn("font-medium mb-2", isCurrentMonth && "text-primary")}>
                            {format(month, "MMMM", { locale: de })}
                        </span>
                        <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                            <div className={cn("w-2 h-2 rounded-full", tasksCount > 0 ? "bg-primary" : "bg-muted-foreground/30")} />
                            {tasksCount} Aufgaben
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

interface CalendarDayProps {
    day: Date;
    currentMonth: Date;
    selectedDate?: Date;
    onDayClick: (date: Date) => void;
    tasks: Task[];
    onTaskClick?: (task: Task) => void;
    isWeekView?: boolean;
}

export function CalendarTaskPill({
    task,
    isDragging,
    onClick
}: {
    task: Task,
    isDragging?: boolean,
    onClick?: (e: React.MouseEvent) => void
}) {
    return (
        <div
            className={cn(
                "group relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all border cursor-grab active:cursor-grabbing w-full shadow-sm",
                task.ist_erledigt
                    ? "bg-gray-100 text-gray-500 border-transparent line-through dark:bg-gray-800 dark:text-gray-400"
                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:shadow-md dark:bg-[#1e1e1e] dark:text-gray-300 dark:border-gray-700 dark:hover:border-blue-400",
                isDragging && "opacity-50 ring-2 ring-blue-500 ring-offset-2 z-50"
            )}
            onClick={onClick}
        >
            <div className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                task.ist_erledigt ? "bg-gray-400" : "bg-blue-500"
            )} />
            <span className="truncate">{task.name}</span>
        </div>
    );
}

function DraggableCalendarTask({ task, onTaskClick }: { task: Task, onTaskClick?: (task: Task) => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `calendar-${task.id}`,
        data: {
            type: "Task",
            task: task,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <CalendarTaskPill
                task={task}
                isDragging={isDragging}
                onClick={(e) => {
                    e.stopPropagation();
                    onTaskClick?.(task);
                }}
            />
        </div>
    );
}

function CalendarDay({ day, currentMonth, selectedDate, onDayClick, tasks, onTaskClick, isWeekView }: CalendarDayProps) {
    const dateKey = format(day, "yyyy-MM-dd");
    const { isOver, setNodeRef } = useDroppable({
        id: dateKey,
    });

    const isCurrentMonth = isSameMonth(day, currentMonth);
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    const isDayToday = isToday(day);

    // Limit displayed tasks
    const MAX_VISIBLE_TASKS = isWeekView ? 12 : 3;
    const visibleTasks = tasks.slice(0, MAX_VISIBLE_TASKS);
    const hiddenCount = tasks.length > MAX_VISIBLE_TASKS ? tasks.length - MAX_VISIBLE_TASKS : 0;

    return (
        <div
            ref={setNodeRef}
            onClick={() => onDayClick(day)}
            className={cn(
                "relative w-full h-full p-1 rounded-lg border transition-all hover:bg-accent/50 group/day",
                "flex flex-col items-start justify-start overflow-hidden",
                !isCurrentMonth && !isWeekView && "opacity-50 grayscale-[0.5] bg-muted/20",
                (isCurrentMonth || isWeekView) && "bg-card",
                isSelected && "ring-2 ring-primary bg-primary/5",
                isDayToday && !isSelected && "border-primary",
                isOver && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20 z-10"
            )}
        >
            {/* Day Number */}
            <span
                className={cn(
                    "text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full mb-1",
                    isDayToday && "bg-red-500 text-white shadow-sm",
                    isSelected && !isDayToday && "bg-primary text-primary-foreground"
                )}
            >
                {format(day, "d")}
            </span>

            {/* Tasks List */}
            <div className="w-full flex flex-col gap-0.5 min-h-0 flex-1">
                {visibleTasks.map(task => (
                    <DraggableCalendarTask key={task.id} task={task} onTaskClick={onTaskClick} />
                ))}

                {hiddenCount > 0 && (
                    <div className="px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">
                        +{hiddenCount} weitere
                    </div>
                )}
            </div>
        </div>
    );
}
