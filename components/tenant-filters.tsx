"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface TenantFiltersProps {
  onFilterChange: (filter: string) => void
  onSearchChange: (search: string) => void
}

export function TenantFilters({ onFilterChange, onSearchChange }: TenantFiltersProps) {
  const [activeFilter, setActiveFilter] = useState("all")

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter)
    onFilterChange(filter)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            onClick={() => handleFilterClick("all")}
            className="h-9"
          >
            Alle Mieter
          </Button>
          <Button
            variant={activeFilter === "current" ? "default" : "outline"}
            onClick={() => handleFilterClick("current")}
            className="h-9"
          >
            Aktuelle Mieter
          </Button>
          <Button
            variant={activeFilter === "previous" ? "default" : "outline"}
            onClick={() => handleFilterClick("previous")}
            className="h-9"
          >
            Vorherige Mieter
          </Button>
        </div>
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Mieter suchen..."
            className="pl-8"
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
