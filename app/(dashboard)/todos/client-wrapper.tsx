"use client";
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveButtonWithTooltip } from "@/components/ui/responsive-button";
import { SearchInput } from "@/components/ui/search-input";
import { PlusCircle } from "lucide-react";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskBoardTask } from "@/types/Task";
import { useModalStore } from "@/hooks/use-modal-store";

interface TodosClientWrapperProps {
  tasks: TaskBoardTask[];
}

export default function TodosClientWrapper({ tasks: initialTasks }: TodosClientWrapperProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState<TaskBoardTask[]>(initialTasks);
  const { openAufgabeModal } = useModalStore();

  const handleTaskUpdated = useCallback((updatedTask: TaskBoardTask) => {
    setTasks(currentTasks => {
      const exists = currentTasks.some(task => task.id === updatedTask.id);
      if (exists) {
        return currentTasks.map(task =>
          task.id === updatedTask.id ? updatedTask : task
        );
      }
      return [updatedTask, ...currentTasks];
    });
  }, []);

  const handleTaskDeleted = useCallback((taskId: string) => {
    setTasks(currentTasks =>
      currentTasks.filter(task => task.id !== taskId)
    );
  }, []);

  const handleAddTask = useCallback(() => {
    try {
      openAufgabeModal(undefined, handleTaskUpdated);
    } catch (error) {
      console.error('Error opening task modal:', error);
    }
  }, [openAufgabeModal, handleTaskUpdated]);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8 bg-white dark:bg-[#181818]">
      <div
        className="absolute inset-0 z-[-1] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
        }}
      />
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Aufgaben Board</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Verwalten Sie hier alle Ihre Aufgaben</p>
            </div>
            <div className="mt-0 sm:mt-1">
              <ResponsiveButtonWithTooltip onClick={handleAddTask} icon={<PlusCircle className="h-4 w-4" />} shortText="Hinzufügen">
                Aufgabe hinzufügen
              </ResponsiveButtonWithTooltip>
            </div>
          </div>
        </CardHeader>
        <div className="px-6">
          <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
        </div>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:gap-6 mt-4 sm:mt-6">
            <div className="flex justify-center">
              <SearchInput
                placeholder="Suchen..."
                className="rounded-full"
                wrapperClassName="w-full max-w-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
              />
            </div>
            <TaskBoard
              searchQuery={searchQuery}
              tasks={tasks}
              onTaskUpdated={handleTaskUpdated}
              onTaskDeleted={handleTaskDeleted}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}