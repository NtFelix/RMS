"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Beispieldaten für die Häuser
const houseData = [
  {
    id: 1,
    name: "Wichertstraße XY",
    size: "2225 m²",
    rent: "13400 €",
    pricePerSqmAvg: "11.69 €/m²",
    status: "Voll",
  },
  {
    id: 2,
    name: "Friedrichstraße",
    size: "125 m²",
    rent: "1175 €",
    pricePerSqm: "9.40 €/m²",
    status: "12/14",
  },
]

interface HouseTableProps {
  filter: string
  searchQuery: string
}

export function HouseTable({ filter, searchQuery }: HouseTableProps) {
  const [filteredData, setFilteredData] = useState(houseData)

  useEffect(() => {
    let result = houseData

    // Filter by status
    if (filter === "full") {
      result = result.filter((house) => house.status === "vermietet")
    } else if (filter === "vacant") {
      result = result.filter((house) => house.status === "frei")
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (house) =>
          house.name.toLowerCase().includes(query) ||
          house.size.toLowerCase().includes(query) ||
          house.rent.toLowerCase().includes(query) ||
          (house.pricePerSqm && typeof house.pricePerSqm === "string" ? house.pricePerSqm.toLowerCase().includes(query) : false),
      )
    }

    setFilteredData(result)
  }, [filter, searchQuery])

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Häuser</TableHead>
            <TableHead>Größe</TableHead>
            <TableHead>Miete</TableHead>
            <TableHead>Miete pro m²</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                Keine Häuser gefunden.
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((house) => (
              <TableRow key={house.id}>
                <TableCell className="font-medium">{house.name}</TableCell>
                <TableCell>{house.size}</TableCell>
                <TableCell>{house.rent}</TableCell>
                <TableCell>{house.pricePerSqm}</TableCell>
                <TableCell>
                  {house.status === "vermietet" ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                      vermietet
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                      frei
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
