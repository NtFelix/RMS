"use client"

import { useState, useEffect, MutableRefObject } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Apartment {
  id: string
  name: string
  groesse: number
  miete: number
  haus_id?: string
  Haeuser?: { name: string }
}

interface ApartmentTableProps {
  filter: string
  searchQuery: string
  reloadRef?: MutableRefObject<(() => void) | null>
  onEdit?: (apt: Apartment) => void
}

export function ApartmentTable({ filter, searchQuery, reloadRef, onEdit }: ApartmentTableProps) {
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [filteredData, setFilteredData] = useState<Apartment[]>([])

  const fetchApartments = async () => {
    const res = await fetch("/api/wohnungen")
    if (res.ok) {
      const data: Apartment[] = await res.json()
      setApartments(data)
    }
  }

  useEffect(() => {
    fetchApartments()
    if (reloadRef) reloadRef.current = fetchApartments
  }, [])

  useEffect(() => {
    let result = apartments
    // optional: filter by status/search (not implemented)
    setFilteredData(result)
  }, [apartments, filter, searchQuery])

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Wohnung</TableHead>
            <TableHead>Größe</TableHead>
            <TableHead>Miete</TableHead>
            <TableHead>Haus</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                Keine Wohnungen gefunden.
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((apt) => (
              <TableRow key={apt.id} onClick={() => onEdit?.(apt)} className="hover:bg-gray-50 cursor-pointer">
                <TableCell className="font-medium">{apt.name}</TableCell>
                <TableCell>{apt.groesse}</TableCell>
                <TableCell>{apt.miete}</TableCell>
                <TableCell>{apt.Haeuser?.name || '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
