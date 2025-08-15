"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface TaskFiltersProps {
  onFilterChange: (filter: string) => void
  onSearchChange: (search: string) => void
}

export function TaskFilters({ onFilterChange, onSearchChange }: TaskFiltersProps) {
  const [activeFilter, setActiveFilter] = useState("open")

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter)
    onFilterChange(filter)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeFilter === "open" ? "default" : "outline"}
            onClick={() => handleFilterClick("open")}
            className="h-9"
          >
            Offen
          </Button>
          <Button
            variant={activeFilter === "done" ? "default" : "outline"}
            onClick={() => handleFilterClick("done")}
            className="h-9"
          >
            Erledigt
          </Button>
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            onClick={() => handleFilterClick("all")}
            className="h-9"
          >
            Alle
          </Button>
        </div>
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Aufgabe suchen..."
            className="pl-8"
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
