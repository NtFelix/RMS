"use client"

import { useState, useEffect, MutableRefObject } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem
} from "@/components/ui/context-menu"
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
import { toast } from "@/components/ui/use-toast"

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [aptToDelete, setAptToDelete] = useState<Apartment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
            <TableHead>Größe (m²)</TableHead>
            <TableHead>Miete (€)</TableHead>
            <TableHead>Miete pro m²</TableHead>
            <TableHead>Haus</TableHead>
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
            filteredData.map((apt) => (
              <ContextMenu key={apt.id}>
                <ContextMenuTrigger asChild>
                  <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit?.(apt)}>
                    <TableCell className="font-medium">{apt.name}</TableCell>
                    <TableCell>{apt.groesse} m²</TableCell>
                    <TableCell>{apt.miete} €</TableCell>
                    <TableCell>{(apt.miete / apt.groesse).toFixed(2)} €/m²</TableCell>
                    <TableCell>{apt.Haeuser?.name || '-'}</TableCell>
                  </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onSelect={() => onEdit?.(apt)}>Bearbeiten</ContextMenuItem>
                  <ContextMenuItem className="text-red-600" onSelect={() => { setAptToDelete(apt); setShowDeleteConfirm(true); }}>Löschen</ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))
          )}
        </TableBody>
      </Table>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>Die Wohnung "{aptToDelete?.name}" wird gelöscht.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!aptToDelete) return;
              setIsDeleting(true);
              const res = await fetch(`/api/wohnungen?id=${aptToDelete.id}`, { method: 'DELETE' });
              setIsDeleting(false);
              setShowDeleteConfirm(false);
              if (res.ok) { toast({ title: 'Gelöscht', description: 'Wohnung entfernt.' }); fetchApartments(); } else { toast({ title: 'Fehler', description: 'Löschen fehlgeschlagen.', variant: 'destructive' }); }
            }} className="bg-red-600 hover:bg-red-700">{isDeleting ? 'Lösche...' : 'Löschen'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
