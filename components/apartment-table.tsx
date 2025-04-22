"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Beispieldaten für die Wohnungen
const apartmentData = [
  {
    id: 1,
    name: "LSF 2. OG",
    size: "41.5 m²",
    rent: "485 €",
    pricePerSqm: "11.69 €/m²",
    status: "rented",
  },
  {
    id: 2,
    name: "VH 3.0G rechts",
    size: "125 m²",
    rent: "1175 €",
    pricePerSqm: "9.40 €/m²",
    status: "rented",
  },
  {
    id: 3,
    name: "VH - frei und erfunden",
    size: "120 m²",
    rent: "1450 €",
    pricePerSqm: "12.08 €/m²",
    status: "rented",
  },
  {
    id: 4,
    name: "VH DG 2.5.0",
    size: "55 m²",
    rent: "500 €",
    pricePerSqm: "9.09 €/m²",
    status: "free",
  },
  {
    id: 5,
    name: "erfunden",
    size: "65 m²",
    rent: "775 €",
    pricePerSqm: "11.92 €/m²",
    status: "rented",
  },
  {
    id: 6,
    name: "fantasie-groß",
    size: "150 m²",
    rent: "1750 €",
    pricePerSqm: "11.67 €/m²",
    status: "free",
  },
  {
    id: 7,
    name: "fantasie",
    size: "45 m²",
    rent: "480 €",
    pricePerSqm: "10.67 €/m²",
    status: "free",
  },
  {
    id: 8,
    name: "Teil-Nebenkosten-Test",
    size: "100 m²",
    rent: "1250 €",
    pricePerSqm: "12.50 €/m²",
    status: "rented",
  },
  {
    id: 9,
    name: "RSF 5.0 löschen",
    size: "100 m²",
    rent: "4000 €",
    pricePerSqm: "40.00 €/m²",
    status: "free",
  },
]

interface ApartmentTableProps {
  filter: string
  searchQuery: string
}

export function ApartmentTable({ filter, searchQuery }: ApartmentTableProps) {
  const [filteredData, setFilteredData] = useState(apartmentData)

  useEffect(() => {
    let result = apartmentData

    // Filter by status
    if (filter === "rented") {
      result = result.filter((apartment) => apartment.status === "rented")
    } else if (filter === "free") {
      result = result.filter((apartment) => apartment.status === "free")
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (apartment) =>
          apartment.name.toLowerCase().includes(query) ||
          apartment.size.toLowerCase().includes(query) ||
          apartment.rent.toLowerCase().includes(query) ||
          apartment.pricePerSqm.toLowerCase().includes(query),
      )
    }

    setFilteredData(result)
  }, [filter, searchQuery])

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Wohnung</TableHead>
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
                Keine Wohnungen gefunden.
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((apartment) => (
              <TableRow key={apartment.id}>
                <TableCell className="font-medium">{apartment.name}</TableCell>
                <TableCell>{apartment.size}</TableCell>
                <TableCell>{apartment.rent}</TableCell>
                <TableCell>{apartment.pricePerSqm}</TableCell>
                <TableCell>
                  {apartment.status === "rented" ? (
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
