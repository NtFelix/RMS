"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { Tenant } from "@/types/Tenant"
import { TenantContextMenu } from "@/components/tenant-context-menu"

export const tenantsColumns: ColumnDef<Tenant>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
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
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "telefon",
    header: "Telefon",
  },
  {
    id: "actions",
    cell: ({ row }) => {
        return (
            <div onClick={(e) => e.stopPropagation()}>
                <TenantContextMenu tenant={row.original} onEdit={() => {}} onRefresh={() => {}}>
                    <button className="p-2">...</button>
                </TenantContextMenu>
            </div>
        );
    }
  },
]
