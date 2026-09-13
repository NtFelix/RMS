"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"

interface TaskFiltersProps {
  onSearchChange: (search: string) => void;
}

export function TaskFilters({ onSearchChange }: TaskFiltersProps) {
  return (
    <div className="flex justify-center">
      <SearchInput
        placeholder="Aufgabe suchen..."
        onChange={(e) => onSearchChange(e.target.value)}
        wrapperClassName="w-full max-w-md"
      />
    </div>
  )
}
