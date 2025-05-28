"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Home } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Haus } from "@/lib/data-fetching"

interface OperatingCostsFiltersProps {
  onFilterChange: (filter: string) => void
  onSearchChange: (search: string) => void
  onHouseChange?: (houseId: string) => void
  haeuser?: Haus[]
}

export function OperatingCostsFilters({ 
  onFilterChange, 
  onSearchChange, 
  onHouseChange,
  haeuser = [] 
}: OperatingCostsFiltersProps) {
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
            <Select onValueChange={onHouseChange}>
              <SelectTrigger className="w-full">
                <Home className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Haus auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Häuser</SelectItem>
                {haeuser.map((haus) => (
                  <SelectItem key={haus.id} value={haus.id}>
                    {haus.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
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
