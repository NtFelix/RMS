"use client"

import { useState, useEffect, MutableRefObject } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
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
import { toast } from "@/components/ui/use-toast" // Import toast

export interface House {
  id: string
  name: string
  strasse?: string
  ort: string
  size?: string
  rent?: string
  pricePerSqm?: string
  status?: string
}


// Duplicate import removed

interface HouseTableProps {
  filter: string
  searchQuery: string
  reloadRef?: MutableRefObject<(() => void) | null>
  onEdit: (house: House) => void // Add onEdit prop
}

export function HouseTable({ filter, searchQuery, reloadRef, onEdit }: HouseTableProps) { // Destructure onEdit
  const [houses, setHouses] = useState<House[]>([])
  const [filteredData, setFilteredData] = useState<House[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false) // State for delete dialog
  const [houseToDelete, setHouseToDelete] = useState<House | null>(null) // State for house to delete
  const [isDeleting, setIsDeleting] = useState(false) // State for delete loading

  // fetchHouses will be called on mount and can be triggered via reloadRef
  const fetchHouses = async () => {
    const res = await fetch("/api/haeuser")
    if (res.ok) {
      const data = await res.json()
      setHouses(data)
    }
  }

  useEffect(() => {
    fetchHouses()
    if (reloadRef) {
      reloadRef.current = fetchHouses
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let result = houses

    // Filter by status if status exists
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
              <ContextMenu key={house.id}>
                <ContextMenuTrigger asChild>
                  <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit(house)}>
                    <TableCell className="font-medium">{house.name}</TableCell>
                    <TableCell>{house.ort}</TableCell>
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
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onSelect={() => onEdit(house)}>
                    Bearbeiten
                  </ContextMenuItem>
                  <ContextMenuItem
                    onSelect={() => {
                      setHouseToDelete(house)
                      setShowDeleteConfirm(true)
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    Löschen
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
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
