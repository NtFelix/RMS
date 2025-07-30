"use client"

import { useMemo, useCallback } from "react"
import { TableRow, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TenantContextMenu } from "@/components/tenant-context-menu"
import { DataTable } from "@/components/data-table"
import type { Tenant } from "@/types/Tenant"
import type { Wohnung } from "@/types/Wohnung"

interface TenantTableProps {
  tenants: Tenant[]
  wohnungen: Wohnung[]
  filter: string
  searchQuery: string
  onEdit: (tenant: Tenant) => void
  onRefresh: () => void
}

export function TenantTable({ tenants, wohnungen, filter, searchQuery, onEdit, onRefresh }: TenantTableProps) {
  const enrichedTenants = useMemo(() => {
    return tenants.map(tenant => {
      const wohnung = wohnungen.find(w => w.id === tenant.wohnung_id)
      return {
        ...tenant,
        wohnungName: wohnung?.name ?? "-",
        wohnungGroesse: wohnung?.groesse ?? 0,
        wohnungMiete: wohnung?.miete ?? 0,
        status: tenant.auszug && new Date(tenant.auszug) < new Date() ? "inaktiv" : "aktiv",
      }
    })
  }, [tenants, wohnungen])

  const filteredData = useMemo(() => {
    let result = enrichedTenants
    if (filter === 'active') {
      result = result.filter(t => t.status === 'aktiv')
    } else if (filter === 'inactive') {
      result = result.filter(t => t.status === 'inaktiv')
    }
    return result
  }, [enrichedTenants, filter])

  const columns = useMemo(() => [
    { key: "name", header: "Mieter", className: "w-[250px]" },
    { key: "wohnungName", header: "Wohnung" },
    { key: "einzug", header: "Einzug" },
    { key: "auszug", header: "Auszug" },
    { key: "status", header: "Status" },
  ], [])

  const renderRow = useCallback((tenant: any) => (
    <TenantContextMenu
      key={tenant.id}
      tenant={tenant}
      onEdit={() => onEdit(tenant)}
      onRefresh={onRefresh}
    >
      <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit(tenant)}>
        <TableCell className="font-medium">{tenant.name}</TableCell>
        <TableCell>{tenant.wohnungName}</TableCell>
        <TableCell>{tenant.einzug ? new Date(tenant.einzug).toLocaleDateString() : "-"}</TableCell>
        <TableCell>{tenant.auszug ? new Date(tenant.auszug).toLocaleDateString() : "-"}</TableCell>
        <TableCell>
          {tenant.status === 'aktiv' ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
              Aktiv
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
              Inaktiv
            </Badge>
          )}
        </TableCell>
      </TableRow>
    </TenantContextMenu>
  ), [onEdit, onRefresh])

  return (
    <DataTable
      data={filteredData}
      columns={columns as any}
      searchQuery={searchQuery}
      filter={filter}
      renderRow={renderRow}
      onEdit={(item) => onEdit(item as Tenant)}
      onDelete={() => {}} // No delete functionality for tenants in this table
    />
  )
}
