"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, Plus, Edit, Trash2, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { TaskBoardTask as Task } from "@/types/Task";

interface TaskDayModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    date: Date;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onTaskToggle: (taskId: string, completed: boolean) => void;
    onTaskDelete: (taskId: string) => void;
    onAddTask: (date: Date) => void;
}

export function TaskDayModal({
    open,
    onOpenChange,
    date,
    tasks,
    onTaskClick,
    onTaskToggle,
    onTaskDelete,
    onAddTask,
}: TaskDayModalProps) {
    // Filter tasks for the selected date
    const tasksForDate = useMemo(() => {
        const dateKey = format(date, "yyyy-MM-dd");
        return tasks.filter((task) => {
            if (!task.faelligkeitsdatum) return false;
            const taskDate = format(new Date(task.faelligkeitsdatum), "yyyy-MM-dd");
            return taskDate === dateKey;
        });
    }, [tasks, date]);

    // Separate pending and completed
    const pendingTasks = tasksForDate.filter((t) => !t.ist_erledigt);
    const completedTasks = tasksForDate.filter((t) => t.ist_erledigt);

    const formattedDate = format(date, "EEEE, d. MMMM yyyy", { locale: de });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <span className="capitalize">{formattedDate}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">{tasksForDate.length} Aufgaben</Badge>
                        {pendingTasks.length > 0 && (
                            <Badge variant="outline" className="text-yellow-600">
                                {pendingTasks.length} offen
                            </Badge>
                        )}
                    </div>
                    <Button
                        size="sm"
                        onClick={() => {
                            onOpenChange(false);
                            onAddTask(date);
                        }}
                        className="gap-1"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Aufgabe</span>
                    </Button>
                </div>

                <ScrollArea className="max-h-[400px]">
                    {tasksForDate.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>Keine Aufgaben für diesen Tag</p>
                            <Button
                                variant="link"
                                onClick={() => {
                                    onOpenChange(false);
                                    onAddTask(date);
                                }}
                                className="mt-2"
                            >
                                Aufgabe hinzufügen
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Pending Tasks */}
                            {pendingTasks.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                        <Circle className="h-3 w-3" />
                                        Offen ({pendingTasks.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {pendingTasks.map((task) => (
                                            <TaskDayItem
                                                key={task.id}
                                                task={task}
                                                onTaskClick={onTaskClick}
                                                onTaskToggle={onTaskToggle}
                                                onTaskDelete={onTaskDelete}
                                                onClose={() => onOpenChange(false)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Completed Tasks */}
                            {completedTasks.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                                        Erledigt ({completedTasks.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {completedTasks.map((task) => (
                                            <TaskDayItem
                                                key={task.id}
                                                task={task}
                                                onTaskClick={onTaskClick}
                                                onTaskToggle={onTaskToggle}
                                                onTaskDelete={onTaskDelete}
                                                onClose={() => onOpenChange(false)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

interface TaskDayItemProps {
    task: Task;
    onTaskClick: (task: Task) => void;
    onTaskToggle: (taskId: string, completed: boolean) => void;
    onTaskDelete: (taskId: string) => void;
    onClose: () => void;
}

function TaskDayItem({
    task,
    onTaskClick,
    onTaskToggle,
    onTaskDelete,
    onClose,
}: TaskDayItemProps) {
    return (
        <div
            className={cn(
                "flex items-start gap-3 p-3 rounded-lg border bg-card transition-colors hover:bg-accent/30 group",
                task.ist_erledigt && "opacity-60"
            )}
        >
            <Checkbox
                checked={task.ist_erledigt}
                onCheckedChange={(checked) => onTaskToggle(task.id, checked as boolean)}
                className="mt-0.5 flex-shrink-0"
            />

            <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                    onClose();
                    onTaskClick(task);
                }}
            >
                <p
                    className={cn(
                        "text-sm font-medium",
                        task.ist_erledigt && "line-through text-muted-foreground"
                    )}
                >
                    {task.name}
                </p>
                {task.beschreibung && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {task.beschreibung}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                        onClose();
                        onTaskClick(task);
                    }}
                >
                    <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onTaskDelete(task.id)}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
