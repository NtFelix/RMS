"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Nebenkosten } from "@/lib/data-fetching"
import { SummaryCards } from "./summary-cards"

export function OperatingCostsOverviewModal({
  isOpen,
  onClose,
  nebenkosten,
}: {
  isOpen: boolean
  onClose: () => void
  nebenkosten: Nebenkosten
}) {
  if (!nebenkosten) return null

  // Helper function to format currency
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-"
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
  }

  // Calculate total costs from all cost items
  const totalCosts = nebenkosten.betrag?.reduce((sum, betrag) => sum + (betrag || 0), 0) || 0
  
  // Get total area from the data (in square meters)
  const totalArea = nebenkosten.gesamtFlaeche || 1 // Default to 1 to avoid division by zero
  
  // Calculate cost per square meter (rounded to 2 decimal places)
  const costPerSqm = totalArea > 0 ? totalCosts / totalArea : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Übersicht der Betriebskosten für {nebenkosten.jahr}</DialogTitle>
          {nebenkosten.Haeuser?.name && (
            <p className="text-sm text-muted-foreground">
              Haus: {nebenkosten.Haeuser.name}
            </p>
          )}
        </DialogHeader>
        
        {/* Summary Cards */}
        <div className="mb-6">
          <SummaryCards 
            totalArea={nebenkosten.gesamtFlaeche || 0}
            apartmentCount={nebenkosten.anzahlWohnungen || 0}
            tenantCount={nebenkosten.anzahlMieter || 0}
            totalCosts={totalCosts}
          />
        </div>
        
        <div className="space-y-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pos.</TableHead>
                  <TableHead>Leistungsart</TableHead>
                  <TableHead className="text-right">Gesamtkosten in €</TableHead>
                  <TableHead className="text-right">Kosten Pro qm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nebenkosten.nebenkostenart?.map((art, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{art || '-'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(nebenkosten.betrag?.[index] || null)}
                    </TableCell>
                    <TableCell className="text-right">
                      {nebenkosten.betrag?.[index] && totalArea > 0 
                        ? formatCurrency((nebenkosten.betrag[index] || 0) / totalArea) 
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold bg-muted/50">
                  <TableCell colSpan={2}>Gesamtkosten</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalCosts)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(costPerSqm)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Water costs section - always show but handle missing data */}
          <div className="rounded-md border p-4">
            <h3 className="font-semibold mb-4">Wasserkosten</h3>
            {nebenkosten.wasserkosten ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Gesamtverbrauch</p>
                  <p className="font-medium">{nebenkosten.wasserverbrauch ? `${nebenkosten.wasserverbrauch} m³` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gesamtkosten</p>
                  <p className="font-medium">{formatCurrency(nebenkosten.wasserkosten)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kosten pro m³</p>
                  <p className="font-medium">
                    {nebenkosten.wasserverbrauch && nebenkosten.wasserverbrauch > 0
                      ? formatCurrency(nebenkosten.wasserkosten / nebenkosten.wasserverbrauch)
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kosten pro m²</p>
                  <p className="font-medium">
                    {totalArea > 0
                      ? formatCurrency(nebenkosten.wasserkosten / totalArea)
                      : '-'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground italic">Keine Wasserkosten gespeichert</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
