"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"

// Beispieldaten für Betriebskosten
const operatingCostsData = [
  { id: 1, year: "2025", totalArea: "1375 m²" },
  { id: 2, year: "2024", totalArea: "2225 m²" },
  { id: 3, year: "2023", totalArea: "Nicht angegeben" },
]

interface OperatingCostsTableProps {
  filter: string
  searchQuery: string
}

export function OperatingCostsTable({ filter, searchQuery }: OperatingCostsTableProps) {
  const [filteredData, setFilteredData] = useState(() => {
    if (filter === "pending") {
      return operatingCostsData.filter((item) => item.year === "2025")
    }
    return operatingCostsData
  })

  // Filter based on search query and status
  useEffect(() => {
    let result = operatingCostsData

    if (filter === "pending") {
      result = result.filter((item) => item.year === "2025")
    } else if (filter === "previous") {
      result = result.filter((item) => item.year !== "2025")
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (item) => item.year.toLowerCase().includes(query) || item.totalArea.toLowerCase().includes(query),
      )
    }

    setFilteredData(result)
  }, [filter, searchQuery])

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Jahr</TableHead>
            <TableHead>Gesamtfläche</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                Keine Betriebskostenabrechnungen gefunden.
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.year}</TableCell>
                <TableCell>{item.totalArea}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Bearbeiten
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
