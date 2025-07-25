"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Tenant } from "@/types/Tenant";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { TenantContextMenu } from "@/components/tenant-context-menu";
import { useModalStore } from "@/hooks/use-modal-store";
import { useCallback } from "react";

const TenantActionsCell = ({ tenant }: { tenant: Tenant }) => {
  const { openTenantModal } = useModalStore();

  const refreshTable = useCallback(() => {
    // In a real-world scenario, you'd probably re-fetch the data.
    console.log("Refreshing table...");
  }, []);

  const handleEdit = useCallback(() => {
    openTenantModal(tenant, []);
  }, [tenant, openTenantModal]);

  return (
    <TenantContextMenu
      tenant={tenant}
      onEdit={handleEdit}
      onRefresh={refreshTable}
    />
  );
};

import { Badge } from "@/components/ui/badge";
import { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter";

export const statuses = [
  {
    value: "active",
    label: "Aktiv",
  },
  {
    value: "inactive",
    label: "Inaktiv",
  },
];

import { Checkbox } from "@/components/ui/checkbox";

export const columns: ColumnDef<Tenant>[] = [
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="E-Mail" />
    ),
  },
  {
    accessorKey: "telefonnummer",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Telefon" />
    ),
  },
  {
    accessorKey: "wohnung.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Wohnung" />
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = statuses.find(
        (status) => status.value === row.getValue("status")
      );

      if (!status) {
        return null;
      }

      return (
        <Badge variant={status.value === "active" ? "default" : "secondary"}>
          {status.label}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <TenantActionsCell tenant={row.original} />,
  },
];
