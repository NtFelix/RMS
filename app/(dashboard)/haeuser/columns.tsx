"use client";

import { ColumnDef } from "@tanstack/react-table";
import { House } from "@/types";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
// import { HouseContextMenu } from "@/components/house-context-menu";
import { Badge } from "@/components/ui/badge";
import { HouseContextMenu } from "@/components/house-context-menu";
import { useModalStore } from "@/hooks/use-modal-store";
import { useCallback } from "react";

const HouseActionsCell = ({ house }: { house: House }) => {
  const { openHouseModal } = useModalStore();

  const refreshTable = useCallback(() => {
    // In a real-world scenario, you'd probably re-fetch the data.
    console.log("Refreshing table...");
  }, []);

  const handleEdit = useCallback(() => {
    openHouseModal(house, refreshTable);
  }, [house, openHouseModal, refreshTable]);

  return (
    <HouseContextMenu
      house={house}
      onEdit={handleEdit}
      onRefresh={refreshTable}
    />
  );
};

export const columns: ColumnDef<House>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Häuser" />
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "ort",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ort" />
    ),
  },
  {
    accessorKey: "size",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Größe" />
    ),
    cell: ({ row }) => {
      const size = parseFloat(row.getValue("size"));
      const formatted = new Intl.NumberFormat("de-DE", {
        style: "unit",
        unit: "square-meter",
      }).format(size);
      return <div>{formatted}</div>;
    },
  },
  {
    accessorKey: "rent",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Miete" />
    ),
    cell: ({ row }) => {
      const rent = parseFloat(row.getValue("rent"));
      const formatted = new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(rent);
      return <div>{formatted}</div>;
    },
  },
  {
    accessorKey: "pricePerSqm",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Miete pro m²" />
    ),
    cell: ({ row }) => {
      const pricePerSqm = parseFloat(row.getValue("pricePerSqm"));
      const formatted = new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(pricePerSqm);
      return <div>{`${formatted}/m²`}</div>;
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const house = row.original;
      const totalApartments = house.totalApartments ?? 0;
      const freeApartments = house.freeApartments ?? 0;

      if (totalApartments === 0) {
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50">
            Keine Wohnungen
          </Badge>
        );
      }

      const occupied = totalApartments - freeApartments;
      const isFullyOccupied = freeApartments === 0;

      return (
        <Badge
          variant="outline"
          className={
            isFullyOccupied
              ? "bg-green-50 text-green-700 hover:bg-green-50"
              : "bg-blue-50 text-blue-700 hover:bg-blue-50"
          }
        >
          {`${occupied}/${totalApartments} belegt`}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <HouseActionsCell house={row.original} />,
  },
];
