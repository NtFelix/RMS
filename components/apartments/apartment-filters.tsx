"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"

interface ApartmentFiltersProps {
  onFilterChange: (filter: string) => void
  onSearchChange: (search: string) => void
}

export function ApartmentFilters({ onFilterChange, onSearchChange }: ApartmentFiltersProps) {
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
            variant={activeFilter === "rented" ? "default" : "outline"}
            onClick={() => handleFilterClick("rented")}
            className="h-9"
          >
            Vermietet
          </Button>
          <Button
            variant={activeFilter === "free" ? "default" : "outline"}
            onClick={() => handleFilterClick("free")}
            className="h-9"
          >
            Frei
          </Button>
        </div>
        <SearchInput
          placeholder="Wohnung suchen..."
          onChange={(e) => onSearchChange(e.target.value)}
          wrapperClassName="w-full sm:w-auto sm:min-w-[300px]"
        />
      </div>
    </div>
  )
}
