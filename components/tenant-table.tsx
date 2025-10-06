"use client"

import { useState, useMemo } from "react"
import { CheckedState } from "@radix-ui/react-checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TenantContextMenu } from "@/components/tenant-context-menu"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ChevronsUpDown, ArrowUp, ArrowDown, User, Mail, Phone, Home, FileText, Pencil, Trash2, Settings } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { Tenant, NebenkostenEntry } from "@/types/Tenant";

// Define sortable fields for tenant table
type TenantSortKey = "name" | "email" | "telefonnummer" | "wohnung" | "nebenkosten" | ""
type SortDirection = "asc" | "desc"

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
  const [sortKey, setSortKey] = useState<TenantSortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set())

  // Function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Map wohnung_id to wohnung name
  const wohnungsMap = useMemo(() => {
    const map: Record<string, string> = {}
    wohnungen?.forEach(w => { map[w.id] = w.name })
    return map
  }, [wohnungen])

  // Sorting, filtering and search logic
  const sortedAndFilteredData = useMemo(() => {
    let result = [...tenants]

    // Apply filters
    if (filter === "current") result = result.filter(t => !t.auszug)
    else if (filter === "previous") result = result.filter(t => !!t.auszug)

    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.telefonnummer && t.telefonnummer.toLowerCase().includes(q)) ||
        (t.wohnung_id && t.wohnung_id.toLowerCase().includes(q))
      )
    }

    // Apply sorting
    if (sortKey) {
      result.sort((a, b) => {
        let valA, valB

        if (sortKey === 'wohnung') {
          valA = a.wohnung_id ? wohnungsMap[a.wohnung_id] || '' : ''
          valB = b.wohnung_id ? wohnungsMap[b.wohnung_id] || '' : ''
        } else if (sortKey === 'nebenkosten') {
          // Calculate total utility costs for sorting
          const totalA = a.nebenkosten?.reduce((sum, n) => sum + parseFloat(n.amount || '0'), 0) || 0
          const totalB = b.nebenkosten?.reduce((sum, n) => sum + parseFloat(n.amount || '0'), 0) || 0
          valA = totalA
          valB = totalB
        } else {
          valA = a[sortKey]
          valB = b[sortKey]
        }

        if (valA === undefined || valA === null) valA = ''
        if (valB === undefined || valB === null) valB = ''

        // Convert to number if it's a numeric value for proper sorting
        const numA = parseFloat(String(valA));
        const numB = parseFloat(String(valB));

        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA < numB) return sortDirection === "asc" ? -1 : 1;
          if (numA > numB) return sortDirection === "asc" ? 1 : -1;
          return 0;
        } else {
          const strA = String(valA);
          const strB = String(valB);
          return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
        }
      })
    }

    return result
  }, [tenants, filter, searchQuery, sortKey, sortDirection, wohnungsMap])

  const visibleTenantIds = useMemo(() => sortedAndFilteredData.map((tenant) => tenant.id), [sortedAndFilteredData])

  const allSelected = visibleTenantIds.length > 0 && visibleTenantIds.every((id) => selectedTenants.has(id))
  const partiallySelected = visibleTenantIds.some((id) => selectedTenants.has(id)) && !allSelected

  const handleSelectAll = (checked: CheckedState) => {
    const isChecked = checked === true
    setSelectedTenants((prev) => {
      const next = new Set(prev)
      if (isChecked) {
        visibleTenantIds.forEach((id) => next.add(id))
      } else {
        visibleTenantIds.forEach((id) => next.delete(id))
      }
      return next
    })
  }

  const handleSelectTenant = (tenantId: string, checked: CheckedState) => {
    const isChecked = checked === true
    setSelectedTenants((prev) => {
      const next = new Set(prev)
      if (isChecked) {
        next.add(tenantId)
      } else {
        next.delete(tenantId)
      }
      return next
    })
  }

  const handleSort = (key: TenantSortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const renderSortIcon = (key: TenantSortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 dark:text-[#f3f4f6]" />
    ) : (
      <ArrowDown className="h-4 w-4 dark:text-[#f3f4f6]" />
    )
  }

  const TableHeaderCell = ({ sortKey, children, className = '', icon: Icon, sortable = true }: { sortKey: TenantSortKey, children: React.ReactNode, className?: string, icon: React.ElementType, sortable?: boolean }) => (
    <TableHead className={`${className} dark:text-[#f3f4f6] group/header`}>
      <div
        onClick={() => sortable && handleSort(sortKey)}
        className={`flex items-center gap-2 p-2 -ml-2 dark:text-[#f3f4f6] ${sortable ? 'cursor-pointer' : ''}`}
      >
        <Icon className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
        {children}
        {sortable && renderSortIcon(sortKey)}
      </div>
    </TableHead>
  )

  return (
    <div className="rounded-lg">
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <Table className="min-w-full">
            <TableHeader>
          <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] hover:bg-gray-50 dark:hover:bg-[#22272e] transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998] [&:hover_th]:[&:first-child]:rounded-tl-lg [&:hover_th]:[&:last-child]:rounded-tr-lg">
            <TableHead className="w-12">
              <div className="flex items-center justify-center w-6 h-6 rounded-md transition-transform duration-100">
                <Checkbox
                  aria-label="Alle Mieter auswählen"
                  checked={allSelected ? true : partiallySelected ? "indeterminate" : false}
                  onCheckedChange={handleSelectAll}
                  className="transition-transform duration-100 scale-90 hover:scale-100"
                />
              </div>
            </TableHead>
            <TableHeaderCell sortKey="name" className="w-[250px] dark:text-[#f3f4f6]" icon={User}>Name</TableHeaderCell>
            <TableHeaderCell sortKey="email" className="dark:text-[#f3f4f6]" icon={Mail}>E-Mail</TableHeaderCell>
            <TableHeaderCell sortKey="telefonnummer" className="dark:text-[#f3f4f6]" icon={Phone}>Telefon</TableHeaderCell>
            <TableHeaderCell sortKey="wohnung" className="dark:text-[#f3f4f6]" icon={Home}>Wohnung</TableHeaderCell>
            <TableHeaderCell sortKey="nebenkosten" className="dark:text-[#f3f4f6]" icon={FileText}>Nebenkosten</TableHeaderCell>
            <TableHeaderCell sortKey="" className="w-[140px] dark:text-[#f3f4f6]" icon={Pencil} sortable={false}>Aktionen</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAndFilteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                Keine Mieter gefunden.
              </TableCell>
            </TableRow>
          ) : (
            sortedAndFilteredData.map((tenant) => (
              <TenantContextMenu
                key={tenant.id}
                tenant={tenant}
                onEdit={() => onEdit?.(tenant)}
                onRefresh={() => router.refresh()}
              >
                <TableRow 
                  className={`relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] ${
                    selectedTenants.has(tenant.id) 
                      ? 'bg-primary/10 dark:bg-primary/20' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                  onClick={() => onEdit?.(tenant)}
                >
                  <TableCell className="py-4" onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      aria-label={`Mieter ${tenant.name} auswählen`}
                      checked={selectedTenants.has(tenant.id)}
                      onCheckedChange={(checked) => handleSelectTenant(tenant.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium py-4 dark:text-[#f3f4f6] flex items-center gap-3">
                    <Avatar className="h-9 w-9 flex-shrink-0 bg-primary text-primary-foreground">
                      <AvatarImage src="" alt={tenant.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(tenant.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{tenant.name}</span>
                  </TableCell>
                  <TableCell className="py-4 dark:text-[#f3f4f6]">{tenant.email}</TableCell>
                  <TableCell className="py-4 dark:text-[#f3f4f6]">{tenant.telefonnummer}</TableCell>
                  <TableCell className="py-4 dark:text-[#f3f4f6]">{tenant.wohnung_id ? wohnungsMap[tenant.wohnung_id] || '-' : '-'}</TableCell>
                  <TableCell className="py-4">
                    {tenant.nebenkosten && tenant.nebenkosten.length > 0
                      ? tenant.nebenkosten
                          .slice(0, 3)
                          .map((n: NebenkostenEntry) => `${n.amount} €`)
                          .join(', ') + (tenant.nebenkosten.length > 3 ? '...' : '')
                      : '-'}
                  </TableCell>
                  <TableCell className="py-4 text-right" onClick={(event) => event.stopPropagation()}>
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
                      <span className="text-muted-foreground">•••</span>
                    </span>
                  </TableCell>
                </TableRow>
              </TenantContextMenu>
            ))
          )}
            </TableBody>
          </Table>
        </div>
      </div>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Mieter wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
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
