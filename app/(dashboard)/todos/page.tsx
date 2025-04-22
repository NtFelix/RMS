"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { TaskFilters } from "@/components/task-filters"
import { TaskBoard } from "@/components/task-board"

export default function TodosPage() {
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aufgaben</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Aufgaben und Erinnerungen</p>
        </div>
        <Button className="sm:w-auto">
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
          <TaskBoard filter={filter} searchQuery={searchQuery} />
        </CardContent>
      </Card>
    </div>
  )
}
