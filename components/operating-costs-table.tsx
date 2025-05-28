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
                <TableCell>{item.nebenkostenart?.join(', ') || '-'}</TableCell>
                <TableCell>{item.betrag?.map((b: number) => b.toFixed(2)).join(', €') || '-'}</TableCell>
                <TableCell>{item.berechnungsart?.join(', ') || '-'}</TableCell>
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
