"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog" // Added DialogDescription and DialogFooter
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import type { Nebenkosten } from "@/lib/types";
import { ZAEHLER_CONFIG, ZaehlerTyp } from "@/lib/zaehler-types"
import { OptimizedNebenkosten } from "@/types/optimized-betriebskosten"
import { isoToGermanDate } from "@/utils/date-calculations"
import { SummaryCards } from "@/components/common/summary-cards"
import { toast } from "@/hooks/use-toast"
import { usePostHog } from "posthog-js/react"

export function OperatingCostsOverviewModal({
  isOpen,
  onClose,
  nebenkosten,
}: {
  isOpen: boolean
  onClose: () => void
  nebenkosten: OptimizedNebenkosten
}) {
  const [isExporting, setIsExporting] = useState(false)
  const posthog = usePostHog()
  if (!nebenkosten) return null

  // Helper function to format currency
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-"
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
  }

  // Calculate total costs from all cost items
  const totalCosts = nebenkosten.betrag?.reduce((sum, betrag) => sum + (betrag || 0), 0) || 0
  const totalArea = nebenkosten.gesamtFlaeche || 1 // Default to 1 to avoid division by zero
  const costPerSqm = totalArea > 0 ? totalCosts / totalArea : 0

  // PDF export function with worker offloading
  const exportToPDF = async () => {
    setIsExporting(true)
    toast({
      title: "Export gestartet",
      description: "PDF wird erstellt...",
      variant: "default"
    })

    try {
      const { generateHouseOverviewPDF } = await import('@/lib/worker-client')

      const startDate = isoToGermanDate(nebenkosten.startdatum)?.replace(/\./g, '-') || 'unbekannt'
      const endDate = isoToGermanDate(nebenkosten.enddatum)?.replace(/\./g, '-') || 'unbekannt'
      const houseName = nebenkosten.haus_name?.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_') || 'Haus'
      const filename = `Kostenaufstellung_${houseName}_${startDate}_bis_${endDate}.pdf`

      const clientStartTime = Date.now();
      const response = await generateHouseOverviewPDF({
        nebenkosten,
        totalArea,
        totalCosts,
        costPerSqm,
        filename
      })
      const clientEndTime = Date.now();

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Export erfolgreich",
        description: "PDF erfolgreich erstellt und heruntergeladen!",
        variant: "success"
      })

      // Extract metrics from headers
      const pageCount = parseInt(response.headers.get('X-PDF-Page-Count') || '0', 10);

      posthog?.capture('pdf_exported', {
        document_type: 'overview',
        export_method: 'single',
        period: `${nebenkosten.startdatum}_${nebenkosten.enddatum}`,
        house_name: nebenkosten.haus_name,
        page_count: pageCount,
        processing_time_ms: clientEndTime - clientStartTime
      });

    } catch (error) {
      console.error("PDF export error:", error)
      toast({
        title: "Fehler",
        description: "Fehler beim Erstellen der PDF-Datei",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Übersicht der Betriebskosten für {isoToGermanDate(nebenkosten.startdatum)} bis {isoToGermanDate(nebenkosten.enddatum)}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detailansicht der Betriebskostenabrechnung für das Haus {nebenkosten.haus_name || 'N/A'} vom {isoToGermanDate(nebenkosten.startdatum)} bis {isoToGermanDate(nebenkosten.enddatum)}.
          </DialogDescription>
          {nebenkosten.haus_name && (
            <p className="text-sm text-muted-foreground">
              Haus: {nebenkosten.haus_name}
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
          <div className="rounded-2xl border overflow-hidden">
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

          {/* Meter costs section */}
          <div className="rounded-2xl border p-4">
            <h3 className="font-semibold mb-4">Zählerkosten</h3>
            {(nebenkosten.zaehlerkosten && Object.keys(nebenkosten.zaehlerkosten).length > 0) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(nebenkosten.zaehlerkosten).map(([typ, kosten]) => {
                  const config = ZAEHLER_CONFIG[typ as ZaehlerTyp]
                  const label = config?.label || typ
                  const einheit = config?.einheit || 'm³'
                  const verbrauch = nebenkosten.zaehlerverbrauch?.[typ]
                  return (
                    <div key={typ} className="space-y-1">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">Kosten: {formatCurrency(kosten)}</p>
                      {typeof verbrauch === 'number' && (
                        <>
                          <p className="text-sm text-muted-foreground">Verbrauch: {verbrauch} {einheit}</p>
                          {verbrauch > 0 && (
                            <p className="text-sm text-muted-foreground">pro {einheit}: {formatCurrency(kosten / verbrauch)}</p>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground italic">Keine Zählerdaten erfasst.</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2 pt-4">
          <Button
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" />
            {isExporting ? "PDF wird erstellt..." : "Kostenaufstellung exportieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
