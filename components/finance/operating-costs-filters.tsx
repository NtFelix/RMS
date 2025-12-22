"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { CustomCombobox } from "@/components/ui/custom-combobox"
import { Haus } from "@/lib/data-fetching"

const ALL_HOUSES_LABEL = 'Alle Häuser'
const ALL_HOUSES_VALUE = 'all'

interface OperatingCostsFiltersProps {
  onFilterChange: (filter: string) => void
  onSearchChange: (search: string) => void
  onHouseChange?: (houseId: string) => void
  haeuser?: Haus[]
  selectedHouseId?: string
  searchQuery?: string
}

export function OperatingCostsFilters({ 
  onFilterChange, 
  onSearchChange, 
  onHouseChange,
  haeuser = [],
  selectedHouseId = ALL_HOUSES_VALUE,
  searchQuery = ""
}: OperatingCostsFiltersProps) {
  const [activeFilter, setActiveFilter] = useState("all")
  
  const houseOptions = useMemo(() => [
    { value: ALL_HOUSES_VALUE, label: ALL_HOUSES_LABEL },
    ...haeuser.map((haus) => ({ value: haus.id, label: haus.name }))
  ], [haeuser])

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter)
    onFilterChange(filter)
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeFilter === "all" ? "default" : "ghost"}
          onClick={() => handleFilterClick("all")}
          className="h-9 rounded-full"
        >
          Alle Abrechnungen
        </Button>
        <Button
          variant={activeFilter === "current_year" ? "default" : "ghost"}
          onClick={() => handleFilterClick("current_year")}
          className="h-9 rounded-full"
        >
          Aktuelles Jahr
        </Button>
        <Button
          variant={activeFilter === "previous" ? "default" : "ghost"}
          onClick={() => handleFilterClick("previous")}
          className="h-9 rounded-full"
        >
          Vorherige Abrechnungen
        </Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row w-full sm:w-auto">
        <div className="relative w-full sm:w-[200px]">
          <CustomCombobox
            options={houseOptions}
            value={selectedHouseId}
            onChange={(value) => {
              onHouseChange?.(value ?? ALL_HOUSES_VALUE)
            }}
            placeholder="Haus auswählen"
            searchPlaceholder="Haus suchen..."
            emptyText="Kein Haus gefunden"
            width="w-full"
          />
        </div>
        <SearchInput
          placeholder="Abrechnungen suchen..."
          className="rounded-full"
          mode="table"
          wrapperClassName="w-full sm:w-[300px]"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange("")}
        />
      </div>
    </div>
  )
}
