"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"

interface HouseFiltersProps {
  onFilterChange: (filter: string) => void
  onSearchChange: (search: string) => void
}

export function HouseFilters({ onFilterChange, onSearchChange }: HouseFiltersProps) {
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
            Alle
          </Button>
          <Button
            variant={activeFilter === "full" ? "default" : "outline"}
            onClick={() => handleFilterClick("full")}
            className="h-9"
          >
            Voll
          </Button>
          <Button
            variant={activeFilter === "vacant" ? "default" : "outline"}
            onClick={() => handleFilterClick("vacant")}
            className="h-9"
          >
            Platz
          </Button>
        </div>
        <SearchInput
          placeholder="Haus suchen..."
          onChange={(e) => onSearchChange(e.target.value)}
          wrapperClassName="w-full sm:w-auto sm:min-w-[300px]"
        />
      </div>
    </div>
  )
}
