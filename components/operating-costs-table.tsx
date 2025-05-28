"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"

// Assuming Nebenkosten type will be defined elsewhere, using any for now
// import { Nebenkosten } from "@/lib/data-fetching"; 

interface OperatingCostsTableProps {
  nebenkosten: any[]; // Replace any with Nebenkosten[]
  onEdit?: (item: any) => void; // Replace any with Nebenkosten
}

export function OperatingCostsTable({ nebenkosten, onEdit }: OperatingCostsTableProps) {
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
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {nebenkosten.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                Keine Betriebskostenabrechnungen gefunden.
              </TableCell>
            </TableRow>
          ) : (
            nebenkosten.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.jahr || '-'}</TableCell>
                <TableCell>{item.Haeuser?.name || 'N/A'}</TableCell>
                <TableCell>
                  {item.nebenkostenart?.length > 0
                    ? item.nebenkostenart.map((art: string, idx: number) => <div key={idx}>{art || '-'}</div>)
                    : '-'}
                </TableCell>
                <TableCell>
                  {item.betrag?.length > 0
                    ? item.betrag.map((b: number | null, idx: number) => <div key={idx}>{typeof b === 'number' ? formatCurrency(b) : '-'}</div>)
                    : '-'}
                </TableCell>
                <TableCell>
                  {item.berechnungsart?.length > 0
                    ? item.berechnungsart.map((ba: string, idx: number) => <div key={idx}>{ba || '-'}</div>)
                    : '-'}
                </TableCell>
                <TableCell>{formatCurrency(item.wasserkosten)}</TableCell>
                <TableCell className="text-right">
                  {onEdit && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Bearbeiten
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
