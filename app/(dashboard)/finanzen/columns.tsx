"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Finance } from "../../../types/Finanzen";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { FinanceContextMenu } from "@/components/finance-context-menu";
import { useModalStore } from "@/hooks/use-modal-store";
import { useCallback } from "react";
import { toast } from "@/hooks/use-toast";

const FinanceActionsCell = ({ finance }: { finance: Finance }) => {
  const { openFinanceModal } = useModalStore();

  const refreshTable = useCallback(() => {
    // In a real-world scenario, you'd probably re-fetch the data.
    console.log("Refreshing table...");
  }, []);

  const handleEdit = useCallback(() => {
    openFinanceModal(finance, [], refreshTable);
  }, [finance, openFinanceModal, refreshTable]);

  const handleStatusToggle = useCallback(async () => {
    try {
      const response = await fetch(`/api/finanzen/${finance.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ist_einnahmen: !finance.ist_einnahmen }),
      });
      if (!response.ok) throw new Error("Status-Update fehlgeschlagen");
      toast({ title: "Status geändert" });
      refreshTable();
    } catch (error) {
      toast({ title: "Fehler", description: "Status konnte nicht geändert werden", variant: "destructive" });
    }
  }, [finance, refreshTable]);

  return (
    <FinanceContextMenu
      finance={finance}
      onEdit={handleEdit}
      onRefresh={refreshTable}
      onStatusToggle={handleStatusToggle}
    />
  );
};

export const columns: ColumnDef<Finance>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Bezeichnung" />
    ),
  },
  {
    accessorKey: "Wohnungen.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Wohnung" />
    ),
  },
  {
    accessorKey: "datum",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Datum" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("datum"));
      const formatted = new Intl.DateTimeFormat("de-DE").format(date);
      return <div>{formatted}</div>;
    },
  },
  {
    accessorKey: "betrag",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Betrag" />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("betrag"));
      const formatted = new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "ist_einnahmen",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Typ" />
    ),
    cell: ({ row }) => {
      const isIncome = row.getValue("ist_einnahmen");
      return (
        <Badge variant={isIncome ? "default" : "destructive"}>
          {isIncome ? "Einnahme" : "Ausgabe"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <FinanceActionsCell finance={row.original} />,
  },
];
