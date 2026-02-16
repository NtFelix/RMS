"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { FileDown, Wallet, Coins, Scale, Ruler, Home, Users, Gauge, ArrowRight, TrendingUp, TrendingDown, Building2, Euro, Droplets, Thermometer, Flame, Zap, Fuel } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import type { Nebenkosten } from "@/lib/types";
import { ZAEHLER_CONFIG, ZaehlerTyp } from "@/lib/zaehler-types"
import { OptimizedNebenkosten } from "@/types/optimized-betriebskosten"
import { isoToGermanDate } from "@/utils/date-calculations"
import { toast } from "@/hooks/use-toast"
import { usePostHog } from "posthog-js/react"
import { useEffect, useMemo } from "react"
import { getAbrechnungModalDataAction } from "@/app/betriebskosten-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"


import { calculateAbrechnungSummary } from "@/utils/abrechnung-calculations"
import type { AbrechnungModalData } from "@/types/optimized-betriebskosten"
import type { Mieter } from "@/lib/types"

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
  const [abrechnungData, setAbrechnungData] = useState<AbrechnungModalData | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)

  const posthog = usePostHog()

  useEffect(() => {
    if (isOpen && nebenkosten?.id) {
      setIsLoadingData(true)
      getAbrechnungModalDataAction(nebenkosten.id)
        .then(res => {
          if (res.success && res.data) {
            setAbrechnungData(res.data)
          } else {
            toast({
              title: "Fehler beim Laden der Abrechnungsdaten",
              description: res.message || "Die Zusammenfassungsdaten konnten nicht geladen werden.",
              variant: "destructive",
            });
          }
        })
        .finally(() => {
          setIsLoadingData(false)
        })
    }
  }, [isOpen, nebenkosten?.id])

  if (!nebenkosten) return null

  // Helper function to format currency
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-"
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
  }

  // Calculate total costs from all cost items
  const totalOperatingCosts = nebenkosten.betrag?.reduce((sum, betrag) => sum + (betrag || 0), 0) || 0

  // Calculate total meter costs
  const totalMeterCosts = nebenkosten.zaehlerkosten
    ? Object.values(nebenkosten.zaehlerkosten).reduce((sum, cost) => sum + (cost || 0), 0)
    : 0

  // Total costs including meters
  const totalCosts = totalOperatingCosts + totalMeterCosts

  const totalArea = nebenkosten.gesamtFlaeche || 1 // Default to 1 to avoid division by zero
  const costPerSqm = totalArea > 0 ? totalCosts / totalArea : 0
  const operatingCostPerSqm = totalArea > 0 ? totalOperatingCosts / totalArea : 0

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

  // Calculate days in period
  const periodDays = useMemo(() => {
    if (!nebenkosten.startdatum || !nebenkosten.enddatum) return 0
    const start = new Date(nebenkosten.startdatum)
    const end = new Date(nebenkosten.enddatum)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }, [nebenkosten.startdatum, nebenkosten.enddatum])

  // Calculate summary totals using the shared utility function
  const summaryTotals = useMemo(() => {
    if (!abrechnungData || !abrechnungData.tenants || abrechnungData.tenants.length === 0) {
      return null;
    }

    return calculateAbrechnungSummary(
      abrechnungData.tenants,
      nebenkosten,
      abrechnungData.meters,
      abrechnungData.readings
    );
  }, [abrechnungData, nebenkosten]);

  const totalBalance = totalCosts - (summaryTotals?.totalVorauszahlungen || 0);
  const isNachzahlung = totalBalance >= 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl md:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl">
            Übersicht der Betriebskosten
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{isoToGermanDate(nebenkosten.startdatum)} - {isoToGermanDate(nebenkosten.enddatum)}</span>
            {nebenkosten.haus_name && (
              <>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <span>{nebenkosten.haus_name}</span>
              </>
            )}
          </div>
          <DialogDescription className="sr-only">
            Detailansicht der Betriebskostenabrechnung für das Haus {nebenkosten.haus_name || 'N/A'} vom {isoToGermanDate(nebenkosten.startdatum)} bis {isoToGermanDate(nebenkosten.enddatum)}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">

          {/* LEFT COLUMN: Financial Summary */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="rounded-2xl shadow-md border-none sticky top-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Finanzielles Ergebnis</CardTitle>
                <Scale className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-6 space-y-8">

                {/* 1. The Big Balance Number */}
                <div className="text-center space-y-2">
                  <span className="text-sm text-muted-foreground">Gesamtsaldo</span>
                  {isLoadingData ? (
                    <Skeleton className="h-12 w-32 mx-auto rounded-lg" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className={`text-4xl font-bold tracking-tight ${isNachzahlung ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {formatCurrency(totalBalance)}
                      </div>
                      <div className={`flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-medium ${isNachzahlung ? "bg-red-100 text-red-700 dark:bg-red-900/30" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30"}`}>
                        {isNachzahlung ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                        {isNachzahlung ? "Nachzahlung" : "Guthaben"}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* 2. The Calculation (Soll vs Ist) */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Euro className="h-4 w-4" /> Gesamtkosten (inkl. Zähler)
                    </div>
                    <div className="font-semibold">{formatCurrency(totalCosts)}</div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wallet className="h-4 w-4" /> Vorauszahlungen (gesamt)
                    </div>
                    {isLoadingData ? <Skeleton className="h-6 w-24" /> :
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                        - {formatCurrency(summaryTotals?.totalVorauszahlungen)}
                      </div>
                    }
                  </div>
                </div>

                <Separator />

                {/* 3. Building Context */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Ruler className="h-4 w-4" /> Gesamtfläche</span>
                    <span className="font-medium">{nebenkosten.gesamtFlaeche || 0} m²</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Home className="h-4 w-4" /> Einheiten</span>
                    <span className="font-medium">{nebenkosten.anzahlWohnungen || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" /> Mieter</span>
                    <span className="font-medium">{abrechnungData?.tenants?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Gauge className="h-4 w-4" /> Positionen</span>
                    <span className="font-medium">{nebenkosten.nebenkostenart?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><ArrowRight className="h-4 w-4" /> Zeitraum</span>
                    <span className="font-medium">{periodDays} Tage</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Coins className="h-4 w-4" /> Ø Kosten / m²</span>
                    <span className="font-medium">{formatCurrency(costPerSqm)}</span>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={exportToPDF}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center gap-2 py-6 text-base"
                    variant="default"
                  >
                    <FileDown className="h-5 w-5" />
                    {isExporting ? "Wird erstellt..." : "Als PDF exportieren"}
                  </Button>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Detailed Breakdown */}
          <div className="lg:col-span-8 space-y-8">

            {/* 1. Operating Costs Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  Kostenaufstellung
                </h3>
              </div>

              <div className="rounded-2xl shadow-md border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px] text-center">Pos</TableHead>
                      <TableHead>Bezeichnung</TableHead>
                      <TableHead className="text-right">Gesamt (€)</TableHead>
                      <TableHead className="text-right">€ / m²</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nebenkosten.nebenkostenart?.map((art, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">{art || '-'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(nebenkosten.betrag?.[index] || null)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {nebenkosten.betrag?.[index] && totalArea > 0
                            ? <>{formatCurrency(nebenkosten.betrag[index]! / totalArea)}/m²</>
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total Row */}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell className="text-center font-medium text-muted-foreground"></TableCell>
                      <TableCell className="font-semibold">Summe Betriebskosten (exkl. Zähler)</TableCell>
                      <TableCell className="text-right text-base">
                        {formatCurrency(totalOperatingCosts)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">
                        {formatCurrency(operatingCostPerSqm)}/m²
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 2. Meter Costs Grid */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 pt-4 border-t">
                <Gauge className="h-5 w-5 text-muted-foreground" />
                Zählerabhängige Kosten
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(nebenkosten.zaehlerkosten && Object.keys(nebenkosten.zaehlerkosten).length > 0) ? (
                  Object.entries(nebenkosten.zaehlerkosten).map(([typ, kosten]) => {
                    const config = ZAEHLER_CONFIG[typ as ZaehlerTyp]
                    const label = config?.label || typ
                    const einheit = config?.einheit || 'm³'
                    const verbrauch = nebenkosten.zaehlerverbrauch?.[typ] || 0
                    const iconName = config?.icon || 'gauge'

                    const MeterIcon = {
                      droplet: Droplets,
                      thermometer: Thermometer,
                      flame: Flame,
                      gauge: Gauge,
                      zap: Zap,
                      fuel: Fuel
                    }[iconName] || Gauge

                    return (
                      <Card key={typ} className="shadow-md rounded-2xl border-none">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <MeterIcon className="h-4 w-4 text-muted-foreground" />
                            {label}
                          </CardTitle>
                          <div className="font-bold">{formatCurrency(kosten)}</div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Verbrauch</div>
                              <div className="font-medium">{verbrauch} {einheit}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground mb-1">Preis / {einheit}</div>
                              <div className="font-medium">{verbrauch > 0 ? formatCurrency(kosten / verbrauch) : '-'}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                ) : (
                  <div className="col-span-full py-8 text-center text-muted-foreground">
                    <p>Keine Zählerkosten erfasst.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2 pt-4">
          <Button onClick={onClose} variant="outline">
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
