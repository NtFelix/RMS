"use client"

import { useState, useEffect, useCallback, useMemo, MutableRefObject } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"
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

type SortKey = keyof House | "status"
type SortDirection = "asc" | "desc"

interface HouseTableProps {
  filter: string
  searchQuery: string
  reloadRef?: MutableRefObject<(() => void) | null>
  onEdit: (house: House) => void
  initialHouses?: House[]
}

export function HouseTable({ filter, searchQuery, reloadRef, onEdit, initialHouses }: HouseTableProps) {
  const [houses, setHouses] = useState<House[]>(initialHouses ?? [])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [houseToDelete, setHouseToDelete] = useState<House | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

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
    if (reloadRef) {
      reloadRef.current = fetchHouses
    }
    if (!initialHouses || initialHouses.length === 0) {
      fetchHouses()
    }
    return () => {
      if (reloadRef) {
        reloadRef.current = null
      }
    }
  }, [fetchHouses, initialHouses, reloadRef])

  useEffect(() => {
    if (initialHouses && initialHouses.length > 0) {
      setHouses(initialHouses)
    }
  }, [initialHouses])

  const sortedAndFilteredData = useMemo(() => {
    let result = [...houses]

    if (filter === "full") {
      result = result.filter((house) => house.freeApartments !== undefined && house.freeApartments === 0)
    } else if (filter === "vacant") {
      result = result.filter((house) => house.freeApartments !== undefined && house.freeApartments > 0)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (house) =>
          house.name.toLowerCase().includes(query) ||
          (house.ort && house.ort.toLowerCase().includes(query)) ||
          (house.size && house.size.toString().toLowerCase().includes(query)) ||
          (house.rent && house.rent.toString().toLowerCase().includes(query)) ||
          (house.pricePerSqm && house.pricePerSqm.toString().toLowerCase().includes(query)),
      )
    }

    const sortValue = (house: House, key: SortKey) => {
      if (key === "status") {
        const total = house.totalApartments ?? 0
        const free = house.freeApartments ?? 0
        if (total === 0) return 2 // No apartments
        if (free > 0) return 1 // Vacant
        return 0 // Full
      }

      const value = house[key]
      if (typeof value === "string") {
        const num = parseFloat(value.replace(",", "."))
        return isNaN(num) ? value.toLowerCase() : num
      }
      return value
    }

    result.sort((a, b) => {
      const aValue = sortValue(a, sortKey)
      const bValue = sortValue(b, sortKey)

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [houses, filter, searchQuery, sortKey, sortDirection])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const renderSortArrow = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />
    return sortDirection === "asc" ? (
      <ArrowUpDown className="ml-2 h-4 w-4 text-blue-500" />
    ) : (
      <ArrowUpDown className="ml-2 h-4 w-4 text-blue-500" />
    )
  }

  const handleDeleteConfirm = async () => {
    if (!houseToDelete) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/haeuser/${houseToDelete.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        toast({
          title: "Haus gelöscht",
          description: `Das Haus "${houseToDelete.name}" wurde erfolgreich gelöscht.`,
          variant: "success",
        })
        await fetchHouses()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Löschen fehlgeschlagen")
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein Fehler ist beim Löschen aufgetreten",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setHouseToDelete(null)
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">
              <Button variant="ghost" onClick={() => handleSort("name")}>
                Häuser
                {renderSortArrow("name")}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort("ort")}>
                Ort
                {renderSortArrow("ort")}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort("size")}>
                Größe
                {renderSortArrow("size")}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort("rent")}>
                Miete
                {renderSortArrow("rent")}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort("pricePerSqm")}>
                Miete pro m²
                {renderSortArrow("pricePerSqm")}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort("status")}>
                Status
                {renderSortArrow("status")}
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAndFilteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                Keine Häuser gefunden.
              </TableCell>
            </TableRow>
          ) : (
            sortedAndFilteredData.map((house) => (
              <HouseContextMenu key={house.id} house={house} onEdit={() => onEdit(house)} onRefresh={fetchHouses}>
                <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit(house)}>
                  <TableCell className="font-medium">{house.name}</TableCell>
                  <TableCell>{house.ort}</TableCell>
                  <TableCell>{house.size ? `${house.size} m²` : "-"}</TableCell>
                  <TableCell>{house.rent ? `${house.rent} €` : "-"}</TableCell>
                  <TableCell>{house.pricePerSqm ? `${house.pricePerSqm} €/m²` : "-"}</TableCell>
                  <TableCell>
                    {(house.totalApartments ?? 0) === 0 ? (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50">
                        Keine Wohnungen
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={
                          (house.freeApartments ?? 0) > 0
                            ? "bg-blue-50 text-blue-700 hover:bg-blue-50"
                            : "bg-green-50 text-green-700 hover:bg-green-50"
                        }
                      >
                        {(house.totalApartments ?? 0) - (house.freeApartments ?? 0)}/{house.totalApartments ?? 0} belegt
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              </HouseContextMenu>
            ))
          )}
        </TableBody>
      </Table>
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
