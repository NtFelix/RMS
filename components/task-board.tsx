"use client"

import { useState, useEffect } from "react"
import { TaskCard } from "@/components/task-card"

// Beispieldaten für Aufgaben
const taskData = [
  {
    id: 1,
    name: "Test",
    description: "Das hier ist ein Test ob die Aufgaben überhaupt funktionieren.",
    status: "Erledigt",
    createdAt: "11.02.2025",
    updatedAt: "11.02.2025 16:14 Uhr",
  },
  {
    id: 2,
    name: "Hello",
    description: "Ich bin ein Mensch",
    status: "Erledigt",
    createdAt: "08.02.2025",
    updatedAt: "11.02.2025 16:14 Uhr",
  },
  {
    id: 3,
    name: "Reparatur",
    description: "Fenster im 2. Stock reparieren lassen",
    status: "Offen",
    createdAt: "15.02.2025",
    updatedAt: "15.02.2025 10:30 Uhr",
  },
  {
    id: 4,
    name: "Gartenpflege",
    description: "Gärtner für die Außenanlagen beauftragen",
    status: "Offen",
    createdAt: "18.02.2025",
    updatedAt: "18.02.2025 14:22 Uhr",
  },
]

interface TaskBoardProps {
  filter: string
  searchQuery: string
}

export function TaskBoard({ filter, searchQuery }: TaskBoardProps) {
  const [filteredTasks, setFilteredTasks] = useState(taskData)

  useEffect(() => {
    let result = taskData

    // Filter by status
    if (filter === "open") {
      result = result.filter((task) => task.status === "Offen")
    } else if (filter === "done") {
      result = result.filter((task) => task.status === "Erledigt")
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (task) => task.name.toLowerCase().includes(query) || task.description.toLowerCase().includes(query),
      )
    }

    setFilteredTasks(result)
  }, [filter, searchQuery])

  return (
    <div className="w-full">
      {filteredTasks.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
          <p className="text-center text-muted-foreground">Keine Aufgaben gefunden.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
