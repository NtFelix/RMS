"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { TaskFilters } from "@/components/task-filters";
import { TaskBoard } from "@/components/task-board";
import type { Task as TaskBoardTask } from "@/components/task-board";
// TaskModal import is removed
// import { TaskModal } from "@/components/task-modal";
import { Toaster } from "@/components/ui/toaster"; // Keep Toaster if used for other notifications
import { useModalStore } from "@/hooks/use-modal-store"; // Added

interface TodosClientWrapperProps {
  tasks: TaskBoardTask[];
}

export default function TodosClientWrapper({ tasks }: TodosClientWrapperProps) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  // isModalOpen and setIsModalOpen are removed
  // const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Keep for now, assess later
  const [tasksState, setTasksState] = useState<TaskBoardTask[]>(tasks);

  // Nachladen der Aufgaben, wenn eine neue hinzugefügt wurde
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetch('/api/todos')
        .then(res => res.ok ? res.json() : [])
        .then(data => setTasksState(data))
        .catch(console.error);
    }
  }, [refreshTrigger]);

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aufgaben</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Aufgaben und Erinnerungen</p>
        </div>
        {/* Button now uses global modal store */}
        <Button className="sm:w-auto" onClick={() => useModalStore.getState().openAufgabeModal()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Aufgabe hinzufügen
        </Button>
      </div>

      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <CardTitle>Aufgabenliste</CardTitle>
          <CardDescription>Hier können Sie Ihre Aufgaben verwalten und priorisieren</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <TaskFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
          {/* TaskBoard bekommt tasks als Prop, filtert aber weiterhin clientseitig */}
          <TaskBoard filter={filter} searchQuery={searchQuery} refreshTrigger={refreshTrigger} initialTasks={tasksState} />
        </CardContent>
      </Card>

      {/* TaskModal component instance is removed */}
      {/* 
      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onTaskAdded={() => {
          setRefreshTrigger(prev => prev + 1)
        }} 
      /> 
      */}
      <Toaster />
    </div>
  );
}
