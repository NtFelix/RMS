"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { Checkbox } from "@/components/ui/checkbox"
import { Tenant, NebenkostenEntry, KautionData } from "@/types/Tenant"

export interface TenantWithWohnung extends Tenant {
  wohnungName?: string
  isCurrentTenant?: boolean
  searchableText?: string
}

export const tenantsColumns: ColumnDef<TenantWithWohnung>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Alle auswählen"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Zeile auswählen"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="E-Mail" />
    ),
    cell: ({ row }) => {
      const email = row.getValue("email") as string
      return (
        <div className="max-w-[200px] truncate">
          {email || "-"}
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "telefonnummer",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Telefon" />
    ),
    cell: ({ row }) => {
      const telefon = row.getValue("telefonnummer") as string
      return (
        <div className="max-w-[150px] truncate">
          {telefon || "-"}
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "wohnungName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Wohnung" />
    ),
    cell: ({ row }) => {
      const wohnungName = row.getValue("wohnungName") as string
      return (
        <div className="font-medium">
          {wohnungName || "-"}
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "leaseDates",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Mietverhältnis" />
    ),
    cell: ({ row }) => {
      const tenant = row.original
      const einzug = tenant.einzug
      const auszug = tenant.auszug
      
      return (
        <div className="space-y-1">
          {einzug && (
            <div className="text-sm">
              <span className="text-muted-foreground">Einzug: </span>
              <span className="font-medium">
                {new Date(einzug).toLocaleDateString('de-DE')}
              </span>
            </div>
          )}
          {auszug && (
            <div className="text-sm">
              <span className="text-muted-foreground">Auszug: </span>
              <span className="font-medium">
                {new Date(auszug).toLocaleDateString('de-DE')}
              </span>
            </div>
          )}
          {!einzug && !auszug && (
            <div className="text-sm text-muted-foreground">-</div>
          )}
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const tenantA = rowA.original
      const tenantB = rowB.original
      
      // Sort by move-in date, with null values last
      const einzugA = tenantA.einzug ? new Date(tenantA.einzug).getTime() : 0
      const einzugB = tenantB.einzug ? new Date(tenantB.einzug).getTime() : 0
      
      if (einzugA === 0 && einzugB === 0) return 0
      if (einzugA === 0) return 1
      if (einzugB === 0) return -1
      
      return einzugA - einzugB
    },
  },
  {
    id: "nebenkosten",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nebenkosten" />
    ),
    cell: ({ row }) => {
      const tenant = row.original
      const nebenkosten = tenant.nebenkosten as NebenkostenEntry[] | undefined
      
      if (!nebenkosten || nebenkosten.length === 0) {
        return <div className="text-muted-foreground">-</div>
      }
      
      // Show first 2 entries with "..." if more exist
      const displayEntries = nebenkosten.slice(0, 2)
      const hasMore = nebenkosten.length > 2
      
      return (
        <div className="space-y-1">
          {displayEntries.map((entry, index) => (
            <div key={entry.id || index} className="text-sm">
              <span className="font-medium">{entry.amount} €</span>
              {entry.date && (
                <span className="text-muted-foreground ml-1">
                  ({new Date(entry.date).toLocaleDateString('de-DE', { 
                    month: 'short', 
                    year: 'numeric' 
                  })})
                </span>
              )}
            </div>
          ))}
          {hasMore && (
            <div className="text-xs text-muted-foreground">
              +{nebenkosten.length - 2} weitere
            </div>
          )}
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const nebenkostenA = rowA.original.nebenkosten as NebenkostenEntry[] | undefined
      const nebenkostenB = rowB.original.nebenkosten as NebenkostenEntry[] | undefined
      
      // Sort by total amount of Nebenkosten
      const totalA = nebenkostenA?.reduce((sum, entry) => {
        const amount = parseFloat(entry.amount) || 0
        return sum + amount
      }, 0) || 0
      
      const totalB = nebenkostenB?.reduce((sum, entry) => {
        const amount = parseFloat(entry.amount) || 0
        return sum + amount
      }, 0) || 0
      
      return totalA - totalB
    },
  },
  {
    id: "kaution",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Kaution" />
    ),
    cell: ({ row }) => {
      const tenant = row.original
      const kaution = tenant.kaution as KautionData | undefined
      
      if (!kaution) {
        return <div className="text-muted-foreground">-</div>
      }
      
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'Erhalten':
            return "bg-green-50 text-green-700 hover:bg-green-50"
          case 'Ausstehend':
            return "bg-yellow-50 text-yellow-700 hover:bg-yellow-50"
          case 'Zurückgezahlt':
            return "bg-blue-50 text-blue-700 hover:bg-blue-50"
          default:
            return "bg-gray-50 text-gray-700 hover:bg-gray-50"
        }
      }
      
      return (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {kaution.amount.toLocaleString('de-DE', {
              style: 'currency',
              currency: 'EUR'
            })}
          </div>
          <Badge
            variant="outline"
            className={getStatusColor(kaution.status)}
          >
            {kaution.status}
          </Badge>
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const kautionA = rowA.original.kaution as KautionData | undefined
      const kautionB = rowB.original.kaution as KautionData | undefined
      
      const amountA = kautionA?.amount || 0
      const amountB = kautionB?.amount || 0
      
      return amountA - amountB
    },
  },
  {
    id: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const tenant = row.original
      const isCurrentTenant = tenant.isCurrentTenant ?? (!tenant.auszug || new Date(tenant.auszug) > new Date())
      
      return (
        <Badge
          variant="outline"
          className={
            isCurrentTenant
              ? "bg-green-50 text-green-700 hover:bg-green-50"
              : "bg-gray-50 text-gray-700 hover:bg-gray-50"
          }
        >
          {isCurrentTenant ? "Aktuell" : "Ehemalig"}
        </Badge>
      )
    },
    enableSorting: true,
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const tenantA = rowA.original
      const tenantB = rowB.original
      
      const isCurrentA = tenantA.isCurrentTenant ?? (!tenantA.auszug || new Date(tenantA.auszug) > new Date())
      const isCurrentB = tenantB.isCurrentTenant ?? (!tenantB.auszug || new Date(tenantB.auszug) > new Date())
      
      // Current tenants first
      if (isCurrentA && !isCurrentB) return -1
      if (!isCurrentA && isCurrentB) return 1
      return 0
    },
    filterFn: (row, id, value) => {
      const tenant = row.original
      const isCurrentTenant = tenant.isCurrentTenant ?? (!tenant.auszug || new Date(tenant.auszug) > new Date())
      
      if (value === "current") {
        return isCurrentTenant
      } else if (value === "previous") {
        return !isCurrentTenant
      }
      
      return true
    },
  },
]