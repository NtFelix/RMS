"use client";

import { useMemo, useCallback } from "react";
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
        const grouped: Record<string, { total: number; completed: number; pending: number }> = {};

        tasks.forEach((task) => {
            if (task.faelligkeitsdatum) {
                const dateKey = format(new Date(task.faelligkeitsdatum), "yyyy-MM-dd");
                if (!grouped[dateKey]) {
                    grouped[dateKey] = { total: 0, completed: 0, pending: 0 };
                }
                grouped[dateKey].total++;
                if (task.ist_erledigt) {
                    grouped[dateKey].completed++;
                } else {
                    grouped[dateKey].pending++;
                }
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

    return (
        <div className="w-full">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4 px-2">
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
            <div className="grid grid-cols-7 gap-1 mb-2">
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
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const taskInfo = tasksByDate[dateKey];
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isDayToday = isToday(day);

                    return (
                        <button
                            key={dateKey}
                            onClick={() => onDayClick(day)}
                            className={cn(
                                "relative h-16 sm:h-20 p-1 rounded-lg border transition-all hover:bg-accent/50",
                                "flex flex-col items-start justify-start",
                                !isCurrentMonth && "text-muted-foreground/50 bg-muted/20",
                                isCurrentMonth && "bg-card hover:bg-accent",
                                isSelected && "ring-2 ring-primary bg-primary/5",
                                isDayToday && !isSelected && "border-primary"
                            )}
                        >
                            {/* Day Number */}
                            <span
                                className={cn(
                                    "text-sm font-medium inline-flex items-center justify-center w-6 h-6 rounded-full",
                                    isDayToday && "bg-red-500 text-white",
                                    isSelected && !isDayToday && "bg-primary text-primary-foreground"
                                )}
                            >
                                {format(day, "d")}
                            </span>

                            {/* Task Indicators */}
                            {taskInfo && (
                                <div className="flex flex-wrap gap-0.5 mt-1 w-full">
                                    {taskInfo.pending > 0 && (
                                        <div className="flex items-center gap-0.5 text-xs">
                                            <Clock className="h-3 w-3 text-yellow-600" />
                                            <span className="text-yellow-700 dark:text-yellow-500 font-medium">
                                                {taskInfo.pending}
                                            </span>
                                        </div>
                                    )}
                                    {taskInfo.completed > 0 && (
                                        <div className="flex items-center gap-0.5 text-xs ml-1">
                                            <Check className="h-3 w-3 text-green-600" />
                                            <span className="text-green-700 dark:text-green-500 font-medium">
                                                {taskInfo.completed}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
