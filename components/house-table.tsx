"use client"

import { useState, useEffect, useCallback, useMemo, MutableRefObject } from "react"
import { TableRow, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { HouseContextMenu } from "@/components/house-context-menu"
import { DataTable } from "@/components/data-table" // Import the new DataTable component
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

  const handleDeleteConfirm = async () => {
    if (!houseToDelete) return
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/haeuser/${houseToDelete.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        toast({
          title: 'Haus gelöscht',
          description: `Das Haus "${houseToDelete.name}" wurde erfolgreich gelöscht.`,
          variant: 'success',
        })
        await fetchHouses()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Löschen fehlgeschlagen')
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Ein Fehler ist beim Löschen aufgetreten',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setHouseToDelete(null)
    }
  }

  const columns = useMemo(() => [
    { key: "name", header: "Häuser", className: "w-[250px]" },
    { key: "ort", header: "Ort" },
    { key: "size", header: "Größe" },
    { key: "rent", header: "Miete" },
    { key: "pricePerSqm", header: "Miete pro m²" },
    { key: "status", header: "Status" },
  ], [])

  const filteredHouses = useMemo(() => {
    let result = [...houses]
    if (filter === "full") {
      result = result.filter((house) => house.freeApartments === 0)
    } else if (filter === "vacant") {
      result = result.filter((house) => (house.freeApartments ?? 0) > 0)
    }
    return result
  }, [houses, filter])

  const renderRow = useCallback((house: House) => (
    <HouseContextMenu
      key={house.id}
      house={house}
      onEdit={() => onEdit(house)}
      onRefresh={fetchHouses}
    >
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
  ), [onEdit, fetchHouses])

  return (
    <>
      <DataTable
        data={filteredHouses}
        columns={columns as any}
        filter={filter}
        searchQuery={searchQuery}
        reloadRef={reloadRef}
        onEdit={onEdit}
        onDelete={(house) => {
          setHouseToDelete(house)
          setShowDeleteConfirm(true)
        }}
        renderRow={renderRow}
      />
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
    </>
  )
}
