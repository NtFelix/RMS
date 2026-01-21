"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog" // Added DialogDescription and DialogFooter
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import type { Nebenkosten } from "@/lib/types"
import { ZAEHLER_CONFIG, ZaehlerTyp } from "@/lib/zaehler-types"
import { OptimizedNebenkosten } from "@/types/optimized-betriebskosten"
import { isoToGermanDate } from "@/utils/date-calculations"
import { SummaryCards } from "@/components/common/summary-cards"
import { toast } from "@/hooks/use-toast"

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

  // PDF export function
  const exportToPDF = async () => {
    setIsExporting(true)
    toast({
      title: "Export gestartet",
      description: "PDF wird erstellt...",
      variant: "default"
    })

    try {
      const { default: jsPDF } = await import('jspdf')
      const autoTableModule = await import('jspdf-autotable')

      // Initialize autoTable plugin
      if (autoTableModule && typeof autoTableModule.applyPlugin === 'function') {
        autoTableModule.applyPlugin(jsPDF)
      } else if (autoTableModule && typeof autoTableModule.default === 'function') {
        (jsPDF.API as any).autoTable = autoTableModule.default
      } else {
        console.error("Could not initialize jspdf-autotable plugin")
        toast({
          title: "Fehler",
          description: "PDF-Plugin konnte nicht initialisiert werden",
          variant: "destructive"
        })
        return
      }

      const doc = new jsPDF()
      let startY = 20

      // Title
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("Kostenaufstellung - Betriebskosten", 20, startY)
      startY += 10

      // Period and house info
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`Zeitraum: ${isoToGermanDate(nebenkosten.startdatum)} bis ${isoToGermanDate(nebenkosten.enddatum)}`, 20, startY)
      startY += 6
      if (nebenkosten.haus_name) {
        doc.text(`Haus: ${nebenkosten.haus_name}`, 20, startY)
        startY += 6
      }
      startY += 10

      // Summary information
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("Übersicht", 20, startY)
      startY += 8

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`Gesamtfläche: ${totalArea} m²`, 20, startY)
      startY += 6
      doc.text(`Anzahl Wohnungen: ${nebenkosten.anzahlWohnungen || 0}`, 20, startY)
      startY += 6
      doc.text(`Anzahl Mieter: ${nebenkosten.anzahlMieter || 0}`, 20, startY)
      startY += 6
      doc.text(`Gesamtkosten: ${formatCurrency(totalCosts)}`, 20, startY)
      startY += 6
      doc.text(`Kosten pro m²: ${formatCurrency(costPerSqm)}`, 20, startY)
      startY += 15

      // Cost breakdown table
      const tableData = nebenkosten.nebenkostenart?.map((art, index) => [
        (index + 1).toString(),
        art || '-',
        formatCurrency(nebenkosten.betrag?.[index] || null),
        nebenkosten.betrag?.[index] && totalArea > 0
          ? formatCurrency((nebenkosten.betrag[index] || 0) / totalArea)
          : '-'
      ]) || []

      // Add total row
      tableData.push([
        '',
        'Gesamtkosten',
        formatCurrency(totalCosts),
        formatCurrency(costPerSqm)
      ])

        ; (doc as any).autoTable({
          head: [['Pos.', 'Leistungsart', 'Gesamtkosten', 'Kosten pro m²']],
          body: tableData,
          startY: startY,
          theme: 'plain',
          headStyles: {
            fillColor: [255, 255, 255], // White background instead of gray
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            lineWidth: { bottom: 0.3 }, // Thicker bottom border for header
            lineColor: [0, 0, 0] // Black color for header bottom border
          },
          styles: {
            fontSize: 9,
            cellPadding: 3,
            lineWidth: 0 // Remove all cell borders
          },
          bodyStyles: {
            lineWidth: { bottom: 0.1 }, // Only add thin bottom border for rows
            lineColor: [0, 0, 0] // Black color for row separators
          },
          columnStyles: {
            0: { halign: 'left' },   // Left align position numbers
            1: { halign: 'left' },   // Left align service descriptions
            2: { halign: 'right' },  // Right align total costs
            3: { halign: 'right' },  // Right align costs per sqm
          },
          // Ensure table aligns with left and right content margins
          tableWidth: (doc as any).internal.pageSize.getWidth() - 40,
          margin: { left: 20, right: 20 },
          didParseCell: function (data: any) {
            // Make the total row bold
            if (data.row.index === tableData.length - 1) {
              data.cell.styles.fontStyle = 'bold'
              data.cell.styles.fillColor = [248, 248, 248]
            }
            // Ensure header columns are properly aligned
            if (data.section === 'head') {
              if (data.column.index === 2 || data.column.index === 3) {
                data.cell.styles.halign = 'right'
              } else {
                data.cell.styles.halign = 'left'
              }
            }
          }
        })

      // Meter costs section if zaehlerkosten available
      if (nebenkosten.zaehlerkosten && Object.keys(nebenkosten.zaehlerkosten).length > 0) {
        let meterY = (doc as any).lastAutoTable.finalY + 15

        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text("Zählerkosten", 20, meterY)
        meterY += 8

        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")

        Object.entries(nebenkosten.zaehlerkosten).forEach(([typ, kosten]) => {
          const config = ZAEHLER_CONFIG[typ as ZaehlerTyp]
          const label = config?.label || typ
          const einheit = config?.einheit || 'm³'
          const verbrauch = nebenkosten.zaehlerverbrauch?.[typ]

          doc.text(`${label}: ${formatCurrency(kosten)}`, 20, meterY)
          meterY += 5
          if (typeof verbrauch === 'number') {
            doc.text(`  Verbrauch: ${verbrauch} ${einheit}`, 20, meterY)
            meterY += 5
            if (verbrauch > 0) {
              doc.text(`  Kosten pro ${einheit}: ${formatCurrency(kosten / verbrauch)}`, 20, meterY)
              meterY += 5
            }
          }
          meterY += 2
        })
      }

      // Generate filename
      const startDate = isoToGermanDate(nebenkosten.startdatum)?.replace(/\./g, '-') || 'unbekannt'
      const endDate = isoToGermanDate(nebenkosten.enddatum)?.replace(/\./g, '-') || 'unbekannt'
      const houseName = nebenkosten.haus_name?.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_') || 'Haus'
      const filename = `Kostenaufstellung_${houseName}_${startDate}_bis_${endDate}.pdf`

      // Save the PDF
      doc.save(filename)
      toast({
        title: "Export erfolgreich",
        description: "PDF erfolgreich erstellt und heruntergeladen!",
        variant: "success"
      })

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
