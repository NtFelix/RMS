"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface TenantFiltersProps {
  activeFilter: "current" | "previous" | "all";
  onFilterChange: (filter: "current" | "previous" | "all") => void;
  onSearchChange: (search: string) => void
}

export function TenantFilters({ activeFilter, onFilterChange, onSearchChange }: TenantFiltersProps) {
  const handleFilterClick = (filter: "current" | "previous" | "all") => {
    onFilterChange(filter)
  }

  const filterOptions = useMemo(() => [
    { value: "current" as const, label: "Aktuelle Mieter" },
    { value: "previous" as const, label: "Vorherige Mieter" },
    { value: "all" as const, label: "Alle Mieter" },
  ], []);

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-gray-100 dark:bg-gray-800/50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(({ value, label }) => (
            <Button
              key={value}
              variant={activeFilter === value ? "default" : "ghost"}
              onClick={() => handleFilterClick(value)}
              className="h-9 rounded-full"
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Mieter suchen..."
            className="pl-10 rounded-full"
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
