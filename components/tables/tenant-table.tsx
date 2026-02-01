"use client"

import React, { useState, useMemo, useCallback } from "react"
import { CheckedState } from "@radix-ui/react-checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TenantContextMenu } from "@/components/tenants/tenant-context-menu"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ChevronsUpDown, ArrowUp, ArrowDown, User, Mail, Phone, Home, FileText, Pencil, Trash2, Euro, MoreVertical, X, Download } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ActionMenu } from "@/components/ui/action-menu"

import { useModalStore } from "@/hooks/use-modal-store"
import { deleteTenantAction } from "@/app/mieter-actions"
import { toast } from "@/hooks/use-toast"

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
  selectedTenants?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
}



export function TenantTable({ tenants, wohnungen, filter, searchQuery, onEdit, onDelete, selectedTenants: externalSelectedTenants, onSelectionChange }: TenantTableProps) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortKey, setSortKey] = useState<TenantSortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [internalSelectedTenants, setInternalSelectedTenants] = useState<Set<string>>(new Set())
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const contextMenuRefs = React.useRef<Map<string, HTMLElement>>(new Map())

  // Use external selection state if provided, otherwise use internal
  const selectedTenants = externalSelectedTenants ?? internalSelectedTenants
  const setSelectedTenants = onSelectionChange ?? setInternalSelectedTenants

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

  const handleOpenKaution = useCallback((tenant: Tenant) => {
    // Clean tenant object for modal
    const cleanTenant = {
      id: tenant.id,
      name: tenant.name,
      wohnung_id: tenant.wohnung_id
    };

    let kautionData = undefined;
    if (tenant.kaution) {
      const amount = typeof tenant.kaution.amount === 'string'
        ? parseFloat(tenant.kaution.amount)
        : tenant.kaution.amount;

      if (!isNaN(amount)) {
        kautionData = {
          amount,
          paymentDate: tenant.kaution.paymentDate || '',
          status: tenant.kaution.status || 'Ausstehend',
          createdAt: tenant.kaution.createdAt,
          updatedAt: tenant.kaution.updatedAt
        };
      }
    }
    useModalStore.getState().openKautionModal(cleanTenant, kautionData);
  }, [])

  const visibleTenantIds = useMemo(() => sortedAndFilteredData.map((tenant) => tenant.id), [sortedAndFilteredData])

  const allSelected = visibleTenantIds.length > 0 && visibleTenantIds.every((id) => selectedTenants.has(id))
  const partiallySelected = visibleTenantIds.some((id) => selectedTenants.has(id)) && !allSelected

  const handleSelectAll = (checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedTenants)
    if (isChecked) {
      visibleTenantIds.forEach((id) => next.add(id))
    } else {
      visibleTenantIds.forEach((id) => next.delete(id))
    }
    setSelectedTenants(next)
  }

  const handleSelectTenant = (tenantId: string, checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedTenants)
    if (isChecked) {
      next.add(tenantId)
    } else {
      next.delete(tenantId)
    }
    setSelectedTenants(next)
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



  const handleBulkDelete = async () => {
    setIsBulkDeleting(true)
    const selectedIds = Array.from(selectedTenants)
    let successCount = 0
    let errorCount = 0

    for (const tenantId of selectedIds) {
      try {
        const result = await deleteTenantAction(tenantId)
        if (result.success) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        errorCount++
      }
    }

    setIsBulkDeleting(false)
    setShowBulkDeleteConfirm(false)
    setSelectedTenants(new Set())

    if (successCount > 0) {
      toast({
        title: "Erfolg",
        description: `${successCount} Mieter erfolgreich gelöscht${errorCount > 0 ? `, ${errorCount} fehlgeschlagen` : ''}.`,
        variant: "success",
      })
      router.refresh()
    } else {
      toast({
        title: "Fehler",
        description: "Keine Mieter konnten gelöscht werden.",
        variant: "destructive",
      })
    }
  }

  // Helper function to properly escape CSV values
  const escapeCsvValue = (value: string | null | undefined): string => {
    if (!value) return ''
    const stringValue = String(value)
    // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  const handleBulkExport = () => {
    const selectedTenantsData = tenants.filter(t => selectedTenants.has(t.id))

    // Create CSV header
    const headers = ['Name', 'Email', 'Telefon', 'Wohnung', 'Einzug', 'Auszug']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')

    // Create CSV rows with proper escaping
    const csvRows = selectedTenantsData.map(t => {
      const row = [
        t.name,
        t.email || '',
        t.telefonnummer || '',
        t.wohnung_id ? wohnungsMap[t.wohnung_id] || '' : '',
        t.einzug || '',
        t.auszug || ''
      ]
      return row.map(value => escapeCsvValue(value)).join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `mieter_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "Export erfolgreich",
      description: `${selectedTenants.size} Mieter exportiert.`,
      variant: "success",
    })
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
      {/* Bulk Action Bar - only show if using internal state */}
      {!externalSelectedTenants && selectedTenants.size > 0 && (
        <div className="mb-4 p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={true}
                onCheckedChange={() => setSelectedTenants(new Set())}
                className="data-[state=checked]:bg-primary"
              />
              <span className="font-medium text-sm">
                {selectedTenants.size} {selectedTenants.size === 1 ? 'Mieter' : 'Mieter'} ausgewählt
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTenants(new Set())}
              className="h-8 px-2 hover:bg-primary/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkExport}
              className="h-8 gap-2"
            >
              <Download className="h-4 w-4" />
              Exportieren
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="h-8 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="h-4 w-4" />
              Löschen
            </Button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto -mx-4 sm:mx-0 min-h-[600px]">
        <div className="inline-block min-w-full align-middle">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] hover:bg-gray-50 dark:hover:bg-[#22272e] transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998] [&:hover_th]:[&:first-child]:rounded-tl-lg [&:hover_th]:[&:last-child]:rounded-tr-lg">
                <TableHead className="w-12 pl-0 pr-0 -ml-2">
                  <div className="flex items-center justify-start w-6 h-6 rounded-md transition-transform duration-100">
                    <Checkbox
                      aria-label="Alle Mieter auswählen"
                      checked={allSelected ? true : partiallySelected ? "indeterminate" : false}
                      onCheckedChange={handleSelectAll}
                      className="transition-transform duration-100 hover:scale-105"
                    />
                  </div>
                </TableHead>
                <TableHeaderCell sortKey="name" className="w-[250px] dark:text-[#f3f4f6]" icon={User}>Name</TableHeaderCell>
                <TableHeaderCell sortKey="email" className="dark:text-[#f3f4f6]" icon={Mail}>E-Mail</TableHeaderCell>
                <TableHeaderCell sortKey="telefonnummer" className="dark:text-[#f3f4f6]" icon={Phone}>Telefon</TableHeaderCell>
                <TableHeaderCell sortKey="wohnung" className="dark:text-[#f3f4f6]" icon={Home}>Wohnung</TableHeaderCell>
                <TableHeaderCell sortKey="nebenkosten" className="dark:text-[#f3f4f6]" icon={FileText}>Nebenkosten</TableHeaderCell>
                <TableHeaderCell sortKey="" className="w-[80px] dark:text-[#f3f4f6] pr-2" icon={Pencil} sortable={false}>Aktionen</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-[400px] text-center">
                    Keine Mieter gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                sortedAndFilteredData.map((tenant, index) => {
                  const isLastRow = index === sortedAndFilteredData.length - 1
                  const isSelected = selectedTenants.has(tenant.id)

                  return (
                    <TenantContextMenu
                      key={tenant.id}
                      tenant={tenant}
                      onEdit={() => onEdit?.(tenant)}
                      onRefresh={() => router.refresh()}
                    >
                      <TableRow
                        ref={(el) => {
                          if (el) {
                            contextMenuRefs.current.set(tenant.id, el)
                          } else {
                            contextMenuRefs.current.delete(tenant.id)
                          }
                        }}
                        className={`relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] ${isSelected
                          ? `bg-primary/10 dark:bg-primary/20 ${isLastRow ? 'rounded-b-lg' : ''}`
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        onClick={() => onEdit?.(tenant)}
                      >
                        <TableCell
                          className={`py-4 ${isSelected && isLastRow ? 'rounded-bl-lg' : ''}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Checkbox
                            aria-label={`Mieter ${tenant.name} auswählen`}
                            checked={selectedTenants.has(tenant.id)}
                            onCheckedChange={(checked) => handleSelectTenant(tenant.id, checked)}
                          />
                        </TableCell>
                        <TableCell className={`font-medium py-4 dark:text-[#f3f4f6] flex items-center gap-3`}>
                          <Avatar className="h-9 w-9 flex-shrink-0 bg-primary text-primary-foreground">
                            <AvatarImage src="" alt={tenant.name} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(tenant.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{tenant.name}</span>
                        </TableCell>
                        <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{tenant.email}</TableCell>
                        <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{tenant.telefonnummer}</TableCell>
                        <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{tenant.wohnung_id ? wohnungsMap[tenant.wohnung_id] || '-' : '-'}</TableCell>
                        <TableCell className={`py-4`}>
                          {tenant.nebenkosten && tenant.nebenkosten.length > 0
                            ? tenant.nebenkosten
                              .slice(0, 3)
                              .map((n: NebenkostenEntry) => `${n.amount} €`)
                              .join(', ') + (tenant.nebenkosten.length > 3 ? '...' : '')
                            : '-'}
                        </TableCell>
                        <TableCell
                          className={`py-2 pr-2 text-right w-[130px] ${isSelected && isLastRow ? 'rounded-br-lg' : ''}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <ActionMenu
                            actions={[
                              {
                                id: `edit-${tenant.id}`,
                                icon: Pencil,
                                label: "Bearbeiten",
                                onClick: () => onEdit?.(tenant),
                                variant: 'primary',
                              },
                              {
                                id: `kaution-${tenant.id}`,
                                icon: Euro,
                                label: "Kaution",
                                onClick: () => handleOpenKaution(tenant),
                                variant: 'default',
                              },
                              {
                                id: `more-${tenant.id}`,
                                icon: MoreVertical,
                                label: "Mehr Optionen",
                                onClick: (e) => {
                                  if (!e) return;
                                  const rowElement = contextMenuRefs.current.get(tenant.id)
                                  if (rowElement) {
                                    const contextMenuEvent = new MouseEvent('contextmenu', {
                                      bubbles: true,
                                      cancelable: true,
                                      view: window,
                                      clientX: e.clientX,
                                      clientY: e.clientY,
                                    })
                                    rowElement.dispatchEvent(contextMenuEvent)
                                  }
                                },
                                variant: 'default',
                              }
                            ]}
                            shape="pill"
                            visibility="always"
                            className="inline-flex"
                          />
                        </TableCell>
                      </TableRow>
                    </TenantContextMenu>
                  )
                })
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

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mehrere Mieter löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich {selectedTenants.size} Mieter löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? "Lösche..." : `${selectedTenants.size} Mieter löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
