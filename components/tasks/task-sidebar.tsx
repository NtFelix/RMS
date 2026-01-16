"use client";

import { useMemo, useState } from "react";
import { format, isAfter, isBefore, addDays, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import {
    ChevronDown,
    ChevronRight,
    Clock,
    CalendarOff,
    CheckCircle2,
    Circle,
    GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TaskBoardTask as Task } from "@/types/Task";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface TaskSidebarProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onTaskToggle: (taskId: string, completed: boolean) => void;
}

interface TaskItemProps {
    task: Task;
    onTaskClick: (task: Task) => void;
    onTaskToggle: (taskId: string, completed: boolean) => void;
}

// Basic visual component for the task
export function TaskItemCard({
    task,
    onTaskClick,
    onTaskToggle,
    isOverlay,
    isDragging
}: TaskItemProps & { isOverlay?: boolean, isDragging?: boolean }) {
    return (
        <div
            className={cn(
                "flex items-start gap-2 p-2 rounded-lg transition-all duration-200 group border border-transparent",
                !isOverlay && [
                    "hover:bg-primary/5 hover:border-primary/20 hover:shadow-sm cursor-grab active:cursor-grabbing",
                    "dark:hover:bg-primary/10 dark:hover:border-primary/30"
                ],
                isOverlay && "bg-white dark:bg-[#181818] border-gray-200 dark:border-[#3C4251] shadow-lg rotate-2 scale-105",
                isDragging && "opacity-30",
                task.ist_erledigt && "opacity-60"
            )}
            onClick={() => onTaskClick?.(task)}
        >
            <div className="mt-1 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity px-0.5">
                <GripVertical className="h-3 w-3" />
            </div>

            <Checkbox
                checked={task.ist_erledigt}
                onCheckedChange={(checked) => onTaskToggle?.(task.id, checked as boolean)}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
                <p
                    className={cn(
                        "text-sm font-medium truncate",
                        task.ist_erledigt && "line-through text-muted-foreground"
                    )}
                >
                    {task.name}
                </p>
                {task.faelligkeitsdatum && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(task.faelligkeitsdatum), "dd. MMM", { locale: de })}
                    </p>
                )}
            </div>
            {task.ist_erledigt ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            ) : (
                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
        </div>
    );
}

function TaskItem(props: TaskItemProps) {
    const { task } = props;
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `sidebar-${task.id}`,
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
            <TaskItemCard {...props} isDragging={isDragging} />
        </div>
    );
}

export function TaskSidebar({
    tasks,
    onTaskClick,
    onTaskToggle,
}: TaskSidebarProps) {
    const [isUpcomingOpen, setIsUpcomingOpen] = useState(true);
    const [isNoDateOpen, setIsNoDateOpen] = useState(true);
    const [isOverdueOpen, setIsOverdueOpen] = useState(true);

    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);

    // Categorize tasks
    const { upcomingTasks, noDateTasks, overdueTasks } = useMemo(() => {
        const upcoming: Task[] = [];
        const noDate: Task[] = [];
        const overdue: Task[] = [];

        tasks.forEach((task) => {
            // Skip completed tasks for upcoming/overdue
            if (task.ist_erledigt) {
                // Completed tasks with no date still show in no-date section
                if (!task.faelligkeitsdatum) {
                    noDate.push(task);
                }
                return;
            }

            if (!task.faelligkeitsdatum) {
                noDate.push(task);
            } else {
                const dueDate = startOfDay(new Date(task.faelligkeitsdatum));

                if (isBefore(dueDate, today)) {
                    // Overdue
                    overdue.push(task);
                } else if (!isAfter(dueDate, nextWeek)) {
                    // Due within next 7 days (including today)
                    upcoming.push(task);
                }
            }
        });

        // Sort by due date
        upcoming.sort((a, b) => {
            const dateA = new Date(a.faelligkeitsdatum!).getTime();
            const dateB = new Date(b.faelligkeitsdatum!).getTime();
            return dateA - dateB;
        });

        overdue.sort((a, b) => {
            const dateA = new Date(a.faelligkeitsdatum!).getTime();
            const dateB = new Date(b.faelligkeitsdatum!).getTime();
            return dateB - dateA; // Most overdue first
        });

        // Sort no-date tasks by creation date
        noDate.sort((a, b) => {
            return new Date(b.erstellungsdatum).getTime() - new Date(a.erstellungsdatum).getTime();
        });

        return { upcomingTasks: upcoming, noDateTasks: noDate, overdueTasks: overdue };
    }, [tasks, today, nextWeek]);

    const { setNodeRef: setNoDateRef, isOver: isNoDateOver } = useDroppable({
        id: "remove-date-zone",
    });

    return (
        <div className="h-full flex flex-col gap-4 overflow-y-auto">
            {/* Overdue Section */}
            {overdueTasks.length > 0 && (
                <Collapsible open={isOverdueOpen} onOpenChange={setIsOverdueOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg transition-all duration-200 hover:bg-red-50/50 hover:border-red-100 hover:shadow-sm dark:hover:bg-red-950/20 dark:hover:border-red-900/30 group/trigger border border-transparent">
                        <div className="flex items-center gap-2">
                            {isOverdueOpen ? (
                                <ChevronDown className="h-4 w-4 text-red-500" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-red-500" />
                            )}
                            <Clock className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                Überfällig
                            </span>
                        </div>
                        <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                            {overdueTasks.length}
                        </Badge>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-1">
                        {overdueTasks.map((task) => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                onTaskClick={onTaskClick}
                                onTaskToggle={onTaskToggle}
                            />
                        ))}
                    </CollapsibleContent>
                </Collapsible>
            )}

            {/* Upcoming Section */}
            <Collapsible open={isUpcomingOpen} onOpenChange={setIsUpcomingOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg transition-all duration-200 hover:bg-orange-50/50 hover:border-orange-100 hover:shadow-sm dark:hover:bg-orange-950/20 dark:hover:border-orange-900/30 group/trigger border border-transparent">
                    <div className="flex items-center gap-2">
                        {isUpcomingOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium">Anstehend</span>
                    </div>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {upcomingTasks.length}
                    </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1">
                    {upcomingTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground px-2 py-4 text-center">
                            Keine anstehenden Aufgaben
                        </p>
                    ) : (
                        upcomingTasks.map((task) => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                onTaskClick={onTaskClick}
                                onTaskToggle={onTaskToggle}
                            />
                        ))
                    )}
                </CollapsibleContent>
            </Collapsible>

            {/* No Date Section */}
            <Collapsible open={isNoDateOpen} onOpenChange={setIsNoDateOpen}>
                <CollapsibleTrigger
                    ref={setNoDateRef}
                    className={cn(
                        "flex items-center justify-between w-full p-2 rounded-lg transition-all duration-200 border border-transparent group/trigger",
                        !isNoDateOver && "hover:bg-gray-100/50 hover:border-gray-200 hover:shadow-sm dark:hover:bg-gray-800/30 dark:hover:border-gray-700/50",
                        isNoDateOver && "bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30"
                    )}
                >
                    <div className="flex items-center gap-2">
                        {isNoDateOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <CalendarOff className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Ohne Datum</span>
                    </div>
                    <Badge variant="outline" className="h-5 px-1.5 text-xs">
                        {noDateTasks.length}
                    </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1">
                    {noDateTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground px-2 py-4 text-center">
                            Alle Aufgaben haben ein Datum
                        </p>
                    ) : (
                        noDateTasks.map((task) => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                onTaskClick={onTaskClick}
                                onTaskToggle={onTaskToggle}
                            />
                        ))
                    )}
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
