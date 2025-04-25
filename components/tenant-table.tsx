"use client"

import { useState, useEffect, MutableRefObject, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TenantContextMenu } from "@/components/tenant-context-menu"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface Tenant {
  id: string
  wohnung_id?: string
  name: string
  einzug?: string
  auszug?: string
  email?: string
  telefonnummer?: string
  notiz?: string
  nebenkosten?: number[]
}

interface TenantTableProps {
  filter: string
  searchQuery: string
  reloadRef?: MutableRefObject<(() => void) | null>
  onEdit?: (t: Tenant) => void
  wohnungen?: { id: string; name: string }[]
}

export function TenantTable({ filter, searchQuery, reloadRef, onEdit, wohnungen }: TenantTableProps) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [filteredData, setFilteredData] = useState<Tenant[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchTenants = async () => {
    const res = await fetch("/api/mieter")
    if (res.ok) {
      const data: Tenant[] = await res.json()
      setTenants(data)
    }
  }

  useEffect(() => {
    fetchTenants()
    if (reloadRef) reloadRef.current = fetchTenants
  }, [])

  useEffect(() => {
    let result = tenants
    if (filter === "current") result = result.filter(t => !t.auszug)
    else if (filter === "previous") result = result.filter(t => !!t.auszug)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.telefonnummer && t.telefonnummer.toLowerCase().includes(q)) ||
        (t.wohnung_id && t.wohnung_id.toLowerCase().includes(q))
      )
    }
    setFilteredData(result)
  }, [tenants, filter, searchQuery])

  // Map wohnung_id to wohnung name
  const wohnungsMap = useMemo(() => {
    const map: Record<string, string> = {}
    wohnungen?.forEach(w => { map[w.id] = w.name })
    return map
  }, [wohnungen])

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Name</TableHead>
            <TableHead>E-Mail</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>Wohnung</TableHead>
            <TableHead>Nebenkosten</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                Keine Mieter gefunden.
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((tenant) => (
              <TenantContextMenu
                key={tenant.id}
                tenant={tenant}
                onEdit={() => onEdit?.(tenant)}
                onRefresh={fetchTenants}
              >
                <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit?.(tenant)}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>{tenant.email}</TableCell>
                  <TableCell>{tenant.telefonnummer}</TableCell>
                  <TableCell>{tenant.wohnung_id ? wohnungsMap[tenant.wohnung_id] || '-' : '-'}</TableCell>
                  <TableCell>{tenant.nebenkosten?.map(n => `${n} €`).join(', ') || '-'}</TableCell>
                </TableRow>
              </TenantContextMenu>
            ))
          )}
        </TableBody>
      </Table>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>Der Mieter "{tenantToDelete?.name}" wird gelöscht.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!tenantToDelete) return
              setIsDeleting(true)
              const res = await fetch(`/api/mieter?id=${tenantToDelete.id}`, { method: "DELETE" })
              setIsDeleting(false)
              setShowDeleteConfirm(false)
              if (res.ok) { toast({ title: "Gelöscht", description: "Mieter entfernt." }); fetchTenants() }
              else { toast({ title: "Fehler", description: "Löschen fehlgeschlagen.", variant: "destructive" }) }
            }} className="bg-red-600 hover:bg-red-700">{isDeleting ? "Lösche..." : "Löschen"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
