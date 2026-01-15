"use client";


import { useMemo, useCallback } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
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
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TaskBoardTask as Task } from "@/types/Task";

interface TaskCalendarProps {
    tasks: Task[];
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
    onDayClick: (date: Date) => void;
    selectedDate?: Date | null;
}

export function TaskCalendar({
    tasks,
    currentMonth,
    onMonthChange,
    onDayClick,
    selectedDate,
}: TaskCalendarProps) {
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

    // Calculate calendar days including padding from adjacent months
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

        return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }, [currentMonth]);

    const handlePreviousMonth = useCallback(() => {
        onMonthChange(subMonths(currentMonth, 1));
    }, [currentMonth, onMonthChange]);

    const handleNextMonth = useCallback(() => {
        onMonthChange(addMonths(currentMonth, 1));
    }, [currentMonth, onMonthChange]);

    const handleMonthSelect = useCallback((value: string) => {
        const newMonth = parseInt(value, 10);
        const newDate = new Date(currentMonth);
        newDate.setMonth(newMonth);
        onMonthChange(newDate);
    }, [currentMonth, onMonthChange]);

    const handleYearSelect = useCallback((value: string) => {
        const newYear = parseInt(value, 10);
        const newDate = new Date(currentMonth);
        newDate.setFullYear(newYear);
        onMonthChange(newDate);
    }, [currentMonth, onMonthChange]);

    const currentYear = currentMonth.getFullYear();
    const currentMonthNum = currentMonth.getMonth();

    // Generate year options (current year ± 5 years)
    const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

    // Generate month options
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i,
        label: format(new Date(2000, i, 1), "MMMM", { locale: de }),
    }));

    // Weekday headers
    const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

    const weeks = Math.ceil(calendarDays.length / 7);

    return (
        <div className="w-full h-full flex flex-col">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4 px-2 shrink-0">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousMonth}
                    className="h-8 w-8 rounded-lg"
                    aria-label="Vorheriger Monat"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2">
                    <Select value={currentMonthNum.toString()} onValueChange={handleMonthSelect}>
                        <SelectTrigger className="h-8 w-32 text-sm rounded-lg">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((month) => (
                                <SelectItem key={month.value} value={month.value.toString()}>
                                    {month.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={currentYear.toString()} onValueChange={handleYearSelect}>
                        <SelectTrigger className="h-8 w-20 text-sm rounded-lg">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextMonth}
                    className="h-8 w-8 rounded-lg"
                    aria-label="Nächster Monat"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

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
                        />
                    );
                })}
            </div>
        </div>
    );
}

interface CalendarDayProps {
    day: Date;
    currentMonth: Date;
    selectedDate?: Date;
    onDayClick: (date: Date) => void;
    tasks: Task[];
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
                "group relative flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] font-medium transition-all border border-transparent cursor-grab active:cursor-grabbing w-full shadow-sm",
                task.ist_erledigt
                    ? "bg-gray-100 text-gray-500 line-through dark:bg-gray-800 dark:text-gray-400"
                    : "bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-100 hover:text-blue-700 dark:bg-[#1e1e1e] dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:border-blue-800 dark:hover:text-blue-200 border-gray-100 dark:border-gray-800",
                isDragging && "opacity-30"
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

function DraggableCalendarTask({ task }: { task: Task }) {
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
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

function CalendarDay({ day, currentMonth, selectedDate, onDayClick, tasks }: CalendarDayProps) {
    const dateKey = format(day, "yyyy-MM-dd");
    const { isOver, setNodeRef } = useDroppable({
        id: dateKey,
    });

    const isCurrentMonth = isSameMonth(day, currentMonth);
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    const isDayToday = isToday(day);

    // Limit displayed tasks
    const MAX_VISIBLE_TASKS = 3;
    const visibleTasks = tasks.slice(0, MAX_VISIBLE_TASKS);
    const hiddenCount = tasks.length > MAX_VISIBLE_TASKS ? tasks.length - MAX_VISIBLE_TASKS : 0;

    return (
        <div
            ref={setNodeRef}
            onClick={() => onDayClick(day)}
            className={cn(
                "relative w-full h-full p-1 rounded-lg border transition-all hover:bg-accent/50 group/day",
                "flex flex-col items-start justify-start overflow-hidden",
                !isCurrentMonth && "opacity-50 grayscale-[0.5] bg-muted/20",
                isCurrentMonth && "bg-card",
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
                    <DraggableCalendarTask key={task.id} task={task} />
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
