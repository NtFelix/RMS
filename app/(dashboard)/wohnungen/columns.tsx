"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Wohnung } from "@/types/Wohnung";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { ApartmentContextMenu } from "@/components/apartment-context-menu";
import { useModalStore } from "@/hooks/use-modal-store";
import { useCallback } from "react";

const ApartmentActionsCell = ({ apartment }: { apartment: Wohnung }) => {
  const { openWohnungModal } = useModalStore();

  const refreshTable = useCallback(() => {
    // In a real-world scenario, you'd probably re-fetch the data.
    console.log("Refreshing table...");
  }, []);

  const handleEdit = useCallback(() => {
    openWohnungModal(apartment, [], refreshTable);
  }, [apartment, openWohnungModal, refreshTable]);

  return (
    <ApartmentContextMenu
      apartment={apartment}
      onEdit={handleEdit}
      onRefresh={refreshTable}
    />
  );
};

export const columns: ColumnDef<Wohnung>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Wohnung" />
    ),
  },
  {
    accessorKey: "groesse",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Größe (m²)" />
    ),
    cell: ({ row }) => {
      const groesse = parseFloat(row.getValue("groesse"));
      const formatted = new Intl.NumberFormat("de-DE").format(groesse);
      return <div>{`${formatted} m²`}</div>;
    },
  },
  {
    accessorKey: "miete",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Miete (€)" />
    ),
    cell: ({ row }) => {
      const miete = parseFloat(row.getValue("miete"));
      const formatted = new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(miete);
      return <div>{formatted}</div>;
    },
  },
  {
    id: "pricePerSqm",
    header: "Miete pro m²",
    cell: ({ row }) => {
      const miete = parseFloat(row.original.miete.toString());
      const groesse = parseFloat(row.original.groesse.toString());
      const pricePerSqm = miete / groesse;
      const formatted = new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(pricePerSqm);
      return <div>{`${formatted}/m²`}</div>;
    },
  },
  {
    accessorKey: "Haeuser.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Haus" />
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status");
      return (
        <Badge
          variant={status === "vermietet" ? "default" : "secondary"}
          className={
            status === "vermietet"
              ? "bg-green-100 text-green-800"
              : "bg-blue-100 text-blue-800"
          }
        >
          {status as string}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ApartmentActionsCell apartment={row.original} />,
  },
];
