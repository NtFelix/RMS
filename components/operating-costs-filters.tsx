"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
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
}

export function OperatingCostsFilters({ 
  onFilterChange, 
  onSearchChange, 
  onHouseChange,
  haeuser = [],
  selectedHouseId = ALL_HOUSES_VALUE 
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
            variant={activeFilter === "pending" ? "default" : "outline"}
            onClick={() => handleFilterClick("pending")}
            className="h-9"
          >
            Noch nicht erledigt
          </Button>
          <Button
            variant={activeFilter === "previous" ? "default" : "outline"}
            onClick={() => handleFilterClick("previous")}
            className="h-9"
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
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Betriebskostenabrechnungen suchen..."
              className="pl-8"
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
