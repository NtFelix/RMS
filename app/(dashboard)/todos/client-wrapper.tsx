"use client";
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { PlusCircle } from "lucide-react";
import { TaskFilters } from "@/components/task-filters";
import { TaskBoard } from "@/components/task-board";
import type { Task as TaskBoardTask } from "@/components/task-board";
import { Toaster } from "@/components/ui/toaster";
import { useModalStore } from "@/hooks/use-modal-store";

interface TodosClientWrapperProps {
  tasks: TaskBoardTask[];
}

export default function TodosClientWrapper({ tasks: initialTasks }: TodosClientWrapperProps) {
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState<TaskBoardTask[]>(initialTasks);

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

  const handleAddTask = () => {
    useModalStore.getState().openAufgabeModal(undefined, handleTaskUpdated);
  };

  return (
    <div className="flex flex-col gap-8 p-8">
      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <CardTitle>Aufgabenliste</CardTitle>
            <ButtonWithTooltip className="sm:w-auto" onClick={handleAddTask}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Aufgabe hinzufügen
            </ButtonWithTooltip>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <TaskFilters 
              activeFilter={filter}
              onFilterChange={setFilter}
              onSearchChange={setSearchQuery}
            />
            <TaskBoard 
              filter={filter} 
              searchQuery={searchQuery} 
              tasks={tasks}
              onTaskUpdated={handleTaskUpdated}
              onTaskDeleted={handleTaskDeleted}
            />
          </div>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}
