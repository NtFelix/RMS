"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface TaskFiltersProps {
  activeFilter: "open" | "done" | "all";
  onFilterChange: (filter: "open" | "done" | "all") => void;
  onSearchChange: (search: string) => void;
}

export function TaskFilters({ activeFilter, onFilterChange, onSearchChange }: TaskFiltersProps) {
  const handleFilterClick = (filter: "open" | "done" | "all") => {
    onFilterChange(filter)
  }

  const filterOptions = [
    { value: "open" as const, label: "Offen" },
    { value: "done" as const, label: "Erledigt" },
    { value: "all" as const, label: "Alle" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(({ value, label }) => (
            <Button
              key={value}
              variant={activeFilter === value ? "default" : "outline"}
              onClick={() => handleFilterClick(value)}
              className="h-9"
            >
              {label}
            </Button>
          ))}
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
