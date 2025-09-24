"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface TaskFiltersProps {
  onSearchChange: (search: string) => void;
}

export function TaskFilters({ onSearchChange }: TaskFiltersProps) {
  return (
    <div className="flex justify-center">
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Aufgabe suchen..."
          className="pl-10"
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  )
}
