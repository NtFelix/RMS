"use client"

import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TenantContextMenu } from "@/components/tenant-context-menu"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

import { Tenant, NebenkostenEntry } from "@/types/Tenant";

interface TenantTableProps {
  tenants: Tenant[];
  wohnungen: { id: string; name: string }[];
  filter: string;
  searchQuery: string;
  onEdit?: (t: Tenant) => void;
  onDelete?: (id: string) => void;
}



export function TenantTable({ tenants, wohnungen, filter, searchQuery, onEdit, onDelete }: TenantTableProps) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filterung und Suche clientseitig
  const filteredData = useMemo(() => {
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
    return result
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
                onRefresh={() => router.refresh()}
              >
                <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit?.(tenant)}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>{tenant.email}</TableCell>
                  <TableCell>{tenant.telefonnummer}</TableCell>
                  <TableCell>{tenant.wohnung_id ? wohnungsMap[tenant.wohnung_id] || '-' : '-'}</TableCell>
                  <TableCell>
                    {tenant.nebenkosten && tenant.nebenkosten.length > 0
                      ? tenant.nebenkosten
                          .slice(0, 3)
                          .map(n => `${n.amount} €`)
                          .join(', ') + (tenant.nebenkosten.length > 3 ? '...' : '')
                      : '-'}
                  </TableCell>
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
              if (onDelete) await onDelete(tenantToDelete.id)
              setIsDeleting(false)
              setShowDeleteConfirm(false)
            }} className="bg-red-600 hover:bg-red-700">{isDeleting ? "Lösche..." : "Löschen"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
