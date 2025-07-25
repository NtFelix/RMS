"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Nebenkosten } from "@/lib/data-fetching";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { BetriebskostenContextMenu } from "@/components/betriebskosten-context-menu";

export const columns: ColumnDef<Nebenkosten>[] = [
  {
    accessorKey: "jahr",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Jahr" />
    ),
  },
  {
    accessorKey: "Haeuser.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Haus" />
    ),
  },
  {
    accessorKey: "nebenkostenart",
    header: "Kostenarten",
    cell: ({ row }) => {
      const kostenarten = row.getValue("nebenkostenart") as string[];
      return (
        <div>
          {kostenarten.map((art, idx) => (
            <div key={idx}>{art}</div>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "betrag",
    header: "Beträge",
    cell: ({ row }) => {
      const betraege = row.getValue("betrag") as number[];
      const formatted = betraege.map((b) =>
        new Intl.NumberFormat("de-DE", {
          style: "currency",
          currency: "EUR",
        }).format(b)
      );
      return (
        <div>
          {formatted.map((b, idx) => (
            <div key={idx}>{b}</div>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "berechnungsart",
    header: "Berechnungsarten",
    cell: ({ row }) => {
      const berechnungsarten = row.getValue("berechnungsart") as string[];
      return (
        <div>
          {berechnungsarten.map((art, idx) => (
            <div key={idx}>{art}</div>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "wasserkosten",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Wasserkosten" />
    ),
    cell: ({ row }) => {
      const wasserkosten = parseFloat(row.getValue("wasserkosten"));
      const formatted = new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(wasserkosten);
      return <div>{formatted}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const betriebskosten = row.original;
      return <BetriebskostenContextMenu betriebskosten={betriebskosten} />;
    },
  },
];
