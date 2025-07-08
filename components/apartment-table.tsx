"use client"

import { useState, useEffect, MutableRefObject } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ApartmentContextMenu } from "@/components/apartment-context-menu"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"

export interface Apartment {
  id: string
  name: string
  groesse: number
  miete: number
  haus_id?: string
  Haeuser?: { name: string } | null; // Allow null here
  status: 'frei' | 'vermietet'
  tenant?: {
    id: string
    name: string
    einzug?: string
    auszug?: string
  } | null
}

interface ApartmentTableProps {
  filter: string
  searchQuery: string
  reloadRef?: MutableRefObject<(() => void) | null> // This could potentially be removed if onTableRefresh is sufficient
  onEdit?: (apt: Apartment) => void
  onTableRefresh?: () => Promise<void> // New prop for requesting data refresh from parent
  // optional initial apartments loaded server-side
  initialApartments?: Apartment[]
}

export function ApartmentTable({ filter, searchQuery, reloadRef, onEdit, onTableRefresh, initialApartments }: ApartmentTableProps) {
  // initialApartments prop will be the direct source of truth for apartments data
  const [filteredData, setFilteredData] = useState<Apartment[]>([])

  // Removed internal fetchApartments. Refresh is handled by onTableRefresh prop.

  useEffect(() => {
    let result = initialApartments ?? [] // Use initialApartments directly
    
    // Filter by status
    if (filter === 'free') {
      result = result.filter(apt => apt.status === 'frei')
    } else if (filter === 'rented') {
      result = result.filter(apt => apt.status === 'vermietet')
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (apt) =>
          apt.name.toLowerCase().includes(query) ||
          apt.groesse.toString().includes(query) ||
          apt.miete.toString().includes(query) ||
          (apt.Haeuser?.name && apt.Haeuser.name.toLowerCase().includes(query))
      )
    }
    
    setFilteredData(result)
  }, [initialApartments, filter, searchQuery]) // Depend on initialApartments

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Wohnung</TableHead>
            <TableHead>Größe (m²)</TableHead>
            <TableHead>Miete (€)</TableHead>
            <TableHead>Miete pro m²</TableHead>
            <TableHead>Haus</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center"> {/* Adjusted colSpan */}
                Keine Wohnungen gefunden.
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((apt) => (
              <ApartmentContextMenu
                key={apt.id}
                apartment={apt}
                onEdit={() => onEdit?.(apt)}
                onRefresh={async () => { // Changed to call onTableRefresh
                  if (onTableRefresh) {
                    await onTableRefresh();
                  }
                }}
              >
                <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit?.(apt)}>
                  <TableCell className="font-medium">{apt.name}</TableCell>
                  <TableCell>{apt.groesse} m²</TableCell>
                  <TableCell>{apt.miete} €</TableCell>
                  <TableCell>{(apt.miete / apt.groesse).toFixed(2)} €/m²</TableCell>
                  <TableCell>{apt.Haeuser?.name || '-'}</TableCell>
                  <TableCell>
                    {apt.status === 'vermietet' ? (
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
              </ApartmentContextMenu>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
