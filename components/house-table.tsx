"use client"

import { useState, useEffect, useCallback, MutableRefObject } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
import { toast } from "@/hooks/use-toast" // Import toast

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
  onEdit: (house: House) => void // Add onEdit prop
  // optional initial houses loaded server-side
  initialHouses?: House[]
}

export function HouseTable({ filter, searchQuery, reloadRef, onEdit, initialHouses }: HouseTableProps) { // Destructure onEdit
  // initialize with server-provided data if available
  const [houses, setHouses] = useState<House[]>(initialHouses ?? [])
  const [filteredData, setFilteredData] = useState<House[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false) // State for delete dialog
  const [houseToDelete, setHouseToDelete] = useState<House | null>(null) // State for house to delete
  const [isDeleting, setIsDeleting] = useState(false) // State for delete loading

  // fetchHouses will be called on mount and can be triggered via reloadRef
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
    // Set up the reloadRef
    if (reloadRef) {
      reloadRef.current = fetchHouses
    }
    
    // Only fetch if no initial data was provided
    if (!initialHouses || initialHouses.length === 0) {
      fetchHouses()
    }
    
    // Clean up the ref on unmount
    return () => {
      if (reloadRef) {
        reloadRef.current = null
      }
    }
  }, [fetchHouses, initialHouses, reloadRef])
  
  // Update local state when initialHouses changes (server-side rendering)
  useEffect(() => {
    if (initialHouses && initialHouses.length > 0) {
      setHouses(initialHouses)
    }
  }, [initialHouses])

  useEffect(() => {
    let result = houses

    // Filter by status if status exists
    if (filter === "full") {
      result = result.filter((house) =>
        house.freeApartments !== undefined && house.freeApartments === 0
      )
    } else if (filter === "vacant") {
      result = result.filter((house) =>
        house.freeApartments !== undefined && house.freeApartments > 0
      )
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (house) =>
          house.name.toLowerCase().includes(query) ||
          (house.size && house.size.toLowerCase().includes(query)) ||
          (house.rent && house.rent.toLowerCase().includes(query)) ||
          (house.pricePerSqm && house.pricePerSqm.toLowerCase().includes(query)),
      )
    }

    setFilteredData(result)
  }, [houses, filter, searchQuery])

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
        // Refresh the list after successful deletion
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
    try {
      const res = await fetch(`/api/haeuser?id=${houseToDelete.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast({ title: "Haus gelöscht", description: `Das Haus "${houseToDelete.name}" wurde erfolgreich gelöscht.` })
        fetchHouses() // Refresh the table data
      } else {
        const errorData = await res.json()
        toast({ title: "Fehler", description: errorData.error || "Das Haus konnte nicht gelöscht werden.", variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Fehler", description: "Netzwerkfehler beim Löschen.", variant: "destructive" })
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
            <TableHead className="w-[250px]">Häuser</TableHead>
            <TableHead>Ort</TableHead>
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
            ))
          )}
        </TableBody>
      </Table>
      {/* Delete Confirmation Dialog */}
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
