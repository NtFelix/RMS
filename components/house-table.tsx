"use client"

import { useState, useEffect, useCallback, useMemo, MutableRefObject } from "react"
import { HouseContextMenu } from "@/components/house-context-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface House {
  id: string
  name: string
  strasse?: string
  ort: string
  size?: string
  rent?: string
  pricePerSqm?: string
  status?: string
  totalApartments?: number
  freeApartments?: number
}

interface HouseTableProps {
  filter: string
  searchQuery: string
  reloadRef?: MutableRefObject<(() => void) | null>
  onEdit: (house: House) => void
  initialHouses?: House[]
}

export function HouseTable({ filter, searchQuery, reloadRef, onEdit, initialHouses }: HouseTableProps) {
  const [houses, setHouses] = useState<House[]>(initialHouses ?? [])
  const [filteredData, setFilteredData] = useState<House[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [houseToDelete, setHouseToDelete] = useState<House | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchHouses = useCallback(async () => {
    try {
      const res = await fetch("/api/haeuser")
      if (res.ok) {
        const data = await res.json()
        setHouses(data)
        return data
      }
      return []
    } catch (error) {
      console.error('Error fetching houses:', error)
      return []
    }
  }, [])

  useEffect(() => {
    if (reloadRef) reloadRef.current = fetchHouses
    if (!initialHouses || initialHouses.length === 0) fetchHouses()
    return () => { if (reloadRef) reloadRef.current = null }
  }, [fetchHouses, initialHouses, reloadRef])
  
  useEffect(() => {
    if (initialHouses && initialHouses.length > 0) setHouses(initialHouses)
  }, [initialHouses])

  useEffect(() => {
    let result = houses
    if (filter === "full") result = result.filter((h) => h.freeApartments === 0)
    else if (filter === "vacant") result = result.filter((h) => (h.freeApartments ?? 0) > 0)

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((h) =>
          h.name.toLowerCase().includes(query) ||
          (h.size && h.size.toLowerCase().includes(query)) ||
          (h.rent && h.rent.toLowerCase().includes(query)) ||
          (h.pricePerSqm && h.pricePerSqm.toLowerCase().includes(query)),
      )
    }
    setFilteredData(result)
  }, [houses, filter, searchQuery])

  const handleDeleteConfirm = async () => {
    if (!houseToDelete) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/haeuser/${houseToDelete.id}`, { method: 'DELETE' })
      if (response.ok) {
        toast({ title: 'Haus gelöscht', description: `Das Haus "${houseToDelete.name}" wurde erfolgreich gelöscht.`, variant: 'success' })
        await fetchHouses()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Löschen fehlgeschlagen')
      }
    } catch (error) {
      toast({ title: 'Fehler', description: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setHouseToDelete(null)
    }
  }

  const columns: ColumnDef<House>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Häuser <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <HouseContextMenu house={row.original} onEdit={() => onEdit(row.original)} onRefresh={fetchHouses}>
          <div className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit(row.original)}>
            {row.original.name}
          </div>
        </HouseContextMenu>
      ),
    },
    { accessorKey: "ort", header: "Ort" },
    {
      accessorKey: "size",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Größe <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (row.original.size ? `${row.original.size} m²` : "-"),
    },
    {
      accessorKey: "rent",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Miete <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (row.original.rent ? `${row.original.rent} €` : "-"),
    },
    {
      accessorKey: "pricePerSqm",
      header: "Miete pro m²",
      cell: ({ row }) => (row.original.pricePerSqm ? `${row.original.pricePerSqm} €/m²` : "-"),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const house = row.original
        return (house.totalApartments ?? 0) === 0 ? (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50">Keine Wohnungen</Badge>
        ) : (
          <Badge
            variant="outline"
            className={(house.freeApartments ?? 0) > 0 ? "bg-blue-50 text-blue-700 hover:bg-blue-50" : "bg-green-50 text-green-700 hover:bg-green-50"}
          >
            {(house.totalApartments ?? 0) - (house.freeApartments ?? 0)}/{house.totalApartments ?? 0} belegt
          </Badge>
        )
      },
    },
  ], [onEdit, fetchHouses]);

  return (
    <div>
      <DataTable columns={columns} data={filteredData} />
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie das Haus "{houseToDelete?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Löschen..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
