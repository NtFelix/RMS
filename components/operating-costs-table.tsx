"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// Button and Edit icon are no longer used directly in this component
// import { Button } from "@/components/ui/button"
// import { Edit } from "lucide-react"
import { 
  ContextMenu, 
  ContextMenuTrigger, 
  ContextMenuContent, 
  ContextMenuItem 
} from "@/components/ui/context-menu"
import { Nebenkosten } from "../lib/data-fetching"; // Corrected path

interface OperatingCostsTableProps {
  nebenkosten: Nebenkosten[]; 
  onEdit?: (item: Nebenkosten) => void; 
  onDeleteItem: (id: string) => void;
}

export function OperatingCostsTable({ nebenkosten, onEdit, onDeleteItem }: OperatingCostsTableProps) {
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Jahr</TableHead>
            <TableHead>Haus</TableHead>
            <TableHead>Kostenarten</TableHead>
            <TableHead>Beträge</TableHead>
            <TableHead>Berechnungsarten</TableHead>
            <TableHead>Wasserkosten</TableHead>
            {/* Removed Aktionen TableHead */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {nebenkosten.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center"> {/* Adjusted colSpan */}
                Keine Betriebskostenabrechnungen gefunden.
              </TableCell>
            </TableRow>
          ) : (
            nebenkosten.map((item) => (
              <ContextMenuTrigger key={item.id}>
                <TableRow 
                  onClick={() => onEdit?.(item)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{item.jahr || '-'}</TableCell>
                  <TableCell>{item.Haeuser?.name || 'N/A'}</TableCell>
                  <TableCell>
                    {item.nebenkostenart && item.nebenkostenart.length > 0
                      ? item.nebenkostenart.map((art: string, idx: number) => <div key={idx}>{art || '-'}</div>)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {item.betrag && item.betrag.length > 0
                      ? item.betrag.map((b: number | null, idx: number) => <div key={idx}>{typeof b === 'number' ? formatCurrency(b) : '-'}</div>)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {item.berechnungsart && item.berechnungsart.length > 0
                      ? item.berechnungsart.map((ba: string, idx: number) => <div key={idx}>{ba || '-'}</div>)
                      : '-'}
                  </TableCell>
                  <TableCell>{formatCurrency(item.wasserkosten)}</TableCell>
                  {/* Removed Aktionen TableCell */}
                </TableRow>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}>
                    Bearbeiten
                  </ContextMenuItem>
                  <ContextMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-500 dark:focus:text-red-500 dark:focus:bg-red-900/50"
                  >
                    Löschen
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenuTrigger>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
