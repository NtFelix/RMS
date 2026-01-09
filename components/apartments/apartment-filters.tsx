"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

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
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Wohnung suchen..."
            className="pl-10"
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
