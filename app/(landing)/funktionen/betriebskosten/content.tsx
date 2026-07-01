'use client';

import { useState } from 'react';
import { Calculator, Droplets, Zap, Flame, FileText, CheckCircle2, Receipt, FileDown, Coins, PieChart, BarChart3, Filter, Droplet, ArrowUpRight, TrendingUp, TrendingDown, ChevronDown, ChevronUp, FileUp, AlertTriangle, Key, RefreshCw, Layers, Calendar, Check, ArrowRight, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MacWindow } from '@/components/ui/mac-window';
import { MediaContent } from '@/components/ui/media-content';
import { CTAButton } from '@/components/ui/cta-button';
import { LazyMotion, m, domAnimation, AnimatePresence } from 'framer-motion';
import { EXAMPLE_BILL_PDF_URL } from '@/lib/constants';
import BottomCTA from '@/components/ui/bottom-cta';
import { cn } from '@/lib/utils';



interface ExcelRow {
  objekt: string;
  whg: string;
  mieter: string;
  heizung: number;
  wasser: number;
  muell: number;
  hauswart: number;
  gesamt: number;
  differenz: number;
  fehler?: string;
}

const EXCEL_DATA: ExcelRow[] = [
  { objekt: 'Musterstr. 12', whg: '1', mieter: 'Familie Müller', heizung: 1200, wasser: 340, muell: 210, hauswart: 450, gesamt: 2200, differenz: 160 },
  { objekt: 'Musterstr. 12', whg: '2', mieter: 'Anna Schmidt', heizung: 950, wasser: 260, muell: 160, hauswart: 345, gesamt: 1715, differenz: -85 },
  { objekt: 'Musterstr. 12', whg: '3', mieter: 'Peter Weber', heizung: 1400, wasser: 380, muell: 180, hauswart: 400, gesamt: 2360, differenz: 440 },
  { objekt: 'Parkallee 8', whg: '4', mieter: 'Lisa Braun', heizung: 1350, wasser: 380, muell: 230, hauswart: 480, gesamt: 2440, differenz: 40 },
  { objekt: 'Parkallee 8', whg: '5', mieter: 'Markus Klein', heizung: 780, wasser: 210, muell: 140, hauswart: 290, gesamt: 1420, differenz: -140 },
  { objekt: 'Parkallee 8', whg: '6', mieter: 'Julia Fischer', heizung: 1050, wasser: 290, muell: 180, hauswart: 370, gesamt: 1890, differenz: 90 },
  { objekt: 'Blumenweg 5', whg: '7', mieter: 'Thomas Wagner', heizung: 1500, wasser: 420, muell: 260, hauswart: 530, gesamt: 2710, differenz: 190 },
  { objekt: 'Blumenweg 5', whg: '8', mieter: 'Sandra Hoffmann', heizung: 820, wasser: 220, muell: 150, hauswart: 310, gesamt: 1500, differenz: -180 },
  { objekt: 'Musterstr. 12', whg: '1', mieter: 'Müller (2023)', heizung: 1150, wasser: 320, muell: 200, hauswart: 430, gesamt: 2100, differenz: 60 },
  { objekt: 'Musterstr. 12', whg: '2', mieter: 'Schmidt (2023)', heizung: 900, wasser: 240, muell: 150, hauswart: 330, gesamt: 1620, differenz: -180 },
  { objekt: 'Parkallee 8', whg: '4', mieter: 'Braun (2023)', heizung: 1280, wasser: 360, muell: 220, hauswart: 460, gesamt: 2320, differenz: -80 },
  { objekt: 'Parkallee 8', whg: '6', mieter: 'Fischer (2023)', heizung: 990, wasser: 270, muell: 170, hauswart: 350, gesamt: 1780, differenz: -20 },
  { objekt: 'Blumenweg 5', whg: '7', mieter: 'Wagner (2023)', heizung: 1420, wasser: 400, muell: 250, hauswart: 510, gesamt: 2580, differenz: 60 },
  { objekt: 'Eichenweg 3', whg: '9', mieter: 'Markus Schulz', heizung: 1100, wasser: 310, muell: 190, hauswart: 410, gesamt: 0, differenz: 0, fehler: '#REF!' },
  { objekt: 'Eichenweg 3', whg: '10', mieter: 'Beate Becker', heizung: 1450, wasser: 390, muell: 240, hauswart: 0, gesamt: 0, differenz: 0, fehler: '#DIV/0!' },
];

const EUR = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function UtilityCostPage() {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [spreadsheetHoveredRow, setSpreadsheetHoveredRow] = useState<number | null>(null);

  const donutSegments = [
    { pct: 30, color: "#3b82f6", label: "Heizung & Warmwasser", delay: 0.45 },
    { pct: 18, color: "#10b981", label: "Hauswart & Reinigung", delay: 0.55 },
    { pct: 14, color: "#f59e0b", label: "Müll & Entsorgung", delay: 0.65 },
    { pct: 12, color: "#8b5cf6", label: "Grundsteuer", delay: 0.75 },
    { pct: 10, color: "#ec4899", label: "Versicherungen", delay: 0.85 },
    { pct: 16, color: "#06b6d4", label: "Strom & Sonstige", delay: 0.95 },
  ];

  const meterSteps = [
    {
      title: "Kosten & Belege erfassen",
      icon: Receipt,
      description: "Erfassen Sie alle angefallenen Ausgaben für Ihre Liegenschaften und weisen Sie diese direkt den passenden Kostenarten zu.",
      mockup: (
        <div className="w-[280px] bg-background border border-border shadow-2xl rounded-2xl p-5 backdrop-blur-md hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Receipt size={15} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-foreground/90">Kosten erfassen</div>
              <div className="text-[9px] text-muted-foreground">Rechnungsbelege</div>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              { name: "Grundsteuer B", amount: "1.250,50 €" },
              { name: "Müllabfuhr", amount: "340,20 €" },
              { name: "Hauswart", amount: "250,00 €" }
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/5 border border-border/40 text-xs">
                <span className="font-semibold text-foreground/80">{row.name}</span>
                <span className="font-mono font-bold text-foreground">{row.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Zählerstände importieren",
      icon: FileUp,
      description: "Geben Sie die Zählerstände Ihrer Mieter für Heizung, Wasser oder Strom ein oder importieren Sie diese gesammelt für das gesamte Objekt.",
      mockup: (
        <div className="w-[280px] bg-background border border-border shadow-2xl rounded-2xl p-5 backdrop-blur-md hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileUp size={15} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-foreground/90">Zähler importieren</div>
              <div className="text-[9px] text-muted-foreground">Datei Upload</div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/5">
              <div className="text-[9px] font-bold text-muted-foreground uppercase">Wasserzähler Küche</div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs font-semibold text-foreground">Kaltwasser</span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-foreground/5 rounded border border-border/40">345,20 m³</span>
              </div>
            </div>
            <button type="button" className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/10 hover:bg-primary/90 transition-colors">
              Speichern
            </button>
          </div>
        </div>
      )
    },
    {
      title: "Plausibilitätscheck",
      icon: AlertTriangle,
      description: "Lassen Sie das System die Berechnungen automatisch prüfen. Eventuelle Eingabefehler oder extreme Abweichungen werden sofort signalisiert.",
      mockup: (
        <div className="w-[280px] bg-background border border-destructive/20 shadow-2xl rounded-2xl p-5 backdrop-blur-md hover:border-destructive/45 transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <AlertTriangle size={15} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-destructive uppercase tracking-wider">Plausi-Warnung</div>
              <div className="text-[9px] text-muted-foreground">Eingabefehler?</div>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/10 text-xs">
              <span className="font-bold text-foreground">Hoher Verbrauch (+45%)</span>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                Der eingegebene Zählerstand weicht erheblich vom Vorjahreswert ab (238,10 m³).
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="flex-1 py-1.5 rounded-lg bg-foreground/5 border border-border text-foreground font-bold text-[10px] hover:bg-foreground/10">Abbrechen</button>
              <button type="button" className="flex-1 py-1.5 rounded-lg bg-destructive text-destructive-foreground font-bold text-[10px] hover:bg-destructive/90 shadow-xs">Ignorieren</button>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "PDFs gesammelt exportieren",
      icon: FileDown,
      description: "Generieren Sie die fertigen Dokumente mit einem Klick. Exportieren Sie alle PDFs gesammelt in einer Zip-Datei oder wählen Sie einzelne Mieter aus.",
      mockup: (
        <div className="w-[280px] bg-background border border-border shadow-2xl rounded-2xl p-5 backdrop-blur-md hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileDown size={15} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-foreground/90">Batch PDF Export</div>
              <div className="text-[9px] text-muted-foreground">Dokumente herunterladen</div>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="space-y-1.5 text-[10px] text-foreground/80">
              <div className="flex items-center justify-between p-1.5 rounded bg-muted/20 border border-border/20">
                <span className="flex items-center gap-1.5 font-medium"><Check size={10} className="text-emerald-500 stroke-[3]" /> Alle Mieter</span>
                <span className="text-muted-foreground font-mono">6 PDFs</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-background border border-border/10">
                <span className="flex items-center gap-1.5 font-medium"><Check size={10} className="text-primary stroke-[3]" /> Whg. 01 - Müller</span>
                <span className="text-muted-foreground">Bereit</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-background border border-border/10">
                <span className="flex items-center gap-1.5 font-medium"><Check size={10} className="text-primary stroke-[3]" /> Whg. 02 - Schmidt</span>
                <span className="text-muted-foreground">Bereit</span>
              </div>
            </div>
            <button type="button" className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/10 hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5">
              <FileDown size={13} /> Export starten
            </button>
          </div>
        </div>
      )
    }
  ];



  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-background text-foreground">
      {/* Background Decor — Spreadsheet Grid */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-linear-to-b from-primary/10 via-primary/5 to-transparent opacity-50" />
        
        {/* Spreadsheet grid */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 dark:opacity-15">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(to right, #808080 1px, transparent 1px),
                linear-gradient(to bottom, #808080 1px, transparent 1px)
              `,
              backgroundSize: `96px 28px`,
            }}
          />
          {/* Header row accent */}
          <div 
            className="absolute top-0 left-0 w-full"
            style={{
              height: '28px',
              backgroundColor: '#808080',
              opacity: 0.25,
            }}
          />
        </div>

        {/* Fade edges so it doesn't overwhelm the content */}
        <div className="absolute inset-0 bg-linear-to-r from-background from-[5%] via-transparent via-[15%] to-background to-[95%]" />
        
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Spreadsheet Hero — Sag Chaos Ade */}
      <section className="min-h-screen bg-linear-to-b from-background to-muted/20">

        {/* Hero — centered heading + CTAs */}
        <div className="container mx-auto px-4 pt-48 pb-16">
          <div className="max-w-4xl mx-auto text-center">
            <m.h1
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight"
            >
              Sag <span className="text-primary italic">Chaos Ade.</span>
            </m.h1>
            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-lg sm:text-xl text-muted-foreground mt-4 mb-10 max-w-2xl mx-auto"
            >
              Spare Zeit und exportiere deine Abrechnungen einfach mit klarer Übersicht.
            </m.p>
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <CTAButton
                variant="primary"
                text="14 Tage kostenlos testen"
                href="/?getStarted=true"
                icon={ArrowRight}
                iconPosition="right"
              />
              <CTAButton
                variant="secondary"
                text="Preise ansehen"
                href="/#pricing"
                icon={DollarSign}
                iconPosition="left"
              />
            </m.div>
          </div>
        </div>

        {/* Spreadsheet Showcase */}
        <div className="container mx-auto px-4 sm:px-8 lg:px-16 xl:px-20 pb-32">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden"
          >
            {/* Formula bar */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/30 bg-muted/20 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground/60 min-w-[60px] px-2 py-0.5 rounded-md bg-background border border-border/30 text-center font-mono">
                {selectedCell ? `${'ABCDEFGHI'[selectedCell.col]}${selectedCell.row + 1}` : 'H9'}
              </span>
              <span className="text-xs italic text-muted-foreground/30 font-serif">fx</span>
              <div className="flex-1 h-7 rounded-md border border-border/20 bg-background px-3 flex items-center text-xs text-muted-foreground/60 font-mono truncate">
                {selectedCell
                  ? (() => {
                      const r = EXCEL_DATA[selectedCell.row];
                      return [r.objekt, r.whg, r.mieter, EUR(r.heizung), EUR(r.wasser), EUR(r.muell), EUR(r.hauswart), EUR(r.gesamt), EUR(r.differenz)][selectedCell.col];
                    })()
                  : '=SUMME(E2:E16)-SUMME(F2:F16)'
                }
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky top-0 left-0 z-20 w-10 h-9 bg-muted/20 border-r border-b border-border/20 text-[9px] font-bold text-muted-foreground/40 text-center select-none" />
                    {['Objekt', 'Whg', 'Mieter', 'Heizung', 'Wasser', 'Müll', 'Hauswart', 'Gesamt', 'Differenz'].map((col, j) => (
                      <th
                        key={col}
                        className={cn(
                          "sticky top-0 z-10 h-9 px-4 text-xs font-semibold text-muted-foreground/60 border-r border-b border-border/20 bg-muted/20 cursor-[cell] select-none whitespace-nowrap transition-colors text-left",
                          selectedCell?.col === j && "bg-primary/[0.06] text-primary"
                        )}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EXCEL_DATA.map((row, i) => {
                    const isError = !!row.fehler;
                    return (
                      <m.tr
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.05 * i, duration: 0.3 }}
                        onMouseEnter={() => setSpreadsheetHoveredRow(i)}
                        onMouseLeave={() => setSpreadsheetHoveredRow(null)}
                        className={cn(
                          "transition-colors duration-100",
                          spreadsheetHoveredRow === i && "bg-muted/20",
                          isError && "bg-destructive/[0.03]",
                          isError && spreadsheetHoveredRow === i && "bg-destructive/[0.06]"
                        )}
                      >
                        {/* Row number */}
                        <td
                          className={cn(
                            "sticky left-0 z-10 w-10 h-9 border-r border-b border-border/10 text-xs font-semibold text-muted-foreground/30 text-center bg-muted/[0.02] cursor-[cell] select-none transition-colors",
                            selectedCell?.row === i && "bg-primary/[0.06] text-primary"
                          )}
                        >
                          {i + 1}
                        </td>

                        {/* Data cells */}
                        {[
                          row.objekt, row.whg, row.mieter,
                          EUR(row.heizung), EUR(row.wasser), EUR(row.muell), EUR(row.hauswart),
                          EUR(row.gesamt), EUR(row.differenz)
                        ].map((cell, j) => {
                          const isSelected = selectedCell?.row === i && selectedCell?.col === j;
                          const isNumeric = j >= 3;
                          const isErr = j === 7 && !!row.fehler;

                          return (
                            <td
                              key={j}
                              onClick={() => !isErr && setSelectedCell({ row: i, col: j })}
                        className={cn(
                            "h-9 border-r border-b border-border/10 cursor-[cell] select-none transition-all duration-100 relative",
                            isSelected
                                  ? "ring-2 ring-inset ring-primary bg-primary/[0.06] z-20"
                                  : "hover:bg-muted/10",
                                isErr && "bg-destructive/[0.06]",
                              )}
                            >
                              {isErr ? (
                                <div className="flex items-center justify-center h-full px-3">
                                  <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md">{row.fehler}</span>
                                </div>
                              ) : (
                                <span className={cn(
                                  "block px-4 leading-9 text-sm truncate",
                                  isNumeric && "text-right font-mono tabular-nums text-foreground/80",
                                  !isNumeric && "text-left text-foreground/70",
                                  j >= 7 && "font-semibold text-foreground/90",
                                  j === 8 && row.differenz > 0 && "text-emerald-600 dark:text-emerald-400",
                                  j === 8 && row.differenz < 0 && "text-rose-600 dark:text-rose-400",
                                )}>
                                  {cell}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </m.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/20 bg-muted/10 text-xs text-muted-foreground/60 shrink-0">
              <span className="font-medium">{EXCEL_DATA.length} Einträge</span>
              <span className="font-mono tabular-nums font-semibold">
                ∑ {EXCEL_DATA.reduce((s, r) => s + (r.fehler ? 0 : r.gesamt), 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
          </m.div>
        </div>
      </section>

      {/* Kostenverteilung — Donut Chart */}
      <div className="container mx-auto px-4 sm:px-8 lg:px-16 xl:px-20 pb-32">
        <div className="max-w-5xl mx-auto">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
          >
            {/* Left: Text */}
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary/60">Transparenz</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3 mb-4">
                Jede Kostenart <span className="text-primary italic">im Blick.</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Von Heizung bis Versicherung — Mietevo zeigt Ihnen die genaue Verteilung 
                Ihrer Betriebskosten. Erkennen Sie auf einen Blick, wo die größten Posten liegen.
              </p>
            </div>

            {/* Right: Donut Chart */}
            <div className="flex items-center justify-center">
              <div className="relative flex items-center justify-center w-full max-w-[320px] aspect-square">
                <m.svg
                  viewBox="0 0 240 240"
                  className="w-full h-full select-none"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  initial={{ rotate: -180, scale: 0.85, opacity: 0 }}
                  whileInView={{ rotate: 0, scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <circle cx="120" cy="120" r="90" className="stroke-gray-100 dark:stroke-zinc-800/60 fill-none" strokeWidth="14" />
                  {(() => {
                    const r = 90;
                    const circ = 2 * Math.PI * r;
                    let cumulativeAngle = 0;
                    return donutSegments.map((seg, i) => {
                      const segLen = (seg.pct / 100) * circ;
                      const angle = cumulativeAngle;
                      cumulativeAngle += (seg.pct / 100) * 360;
                      const isHovered = hoveredSegment === i;
                      const segDashLen = Math.max(0.1, segLen - 24);
                      return (
                        <g key={i} transform={`rotate(${angle - 90}, 120, 120)`}>
                          <m.circle
                            cx="120" cy="120" r={r}
                            className="fill-none stroke-transparent cursor-pointer"
                            strokeLinecap="round" strokeWidth="28"
                            strokeDasharray={`${segDashLen} ${circ}`}
                            initial={{ strokeDashoffset: segDashLen }}
                            whileInView={{ strokeDashoffset: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: seg.delay, duration: 0.8, ease: "easeOut" }}
                            onMouseEnter={() => setHoveredSegment(i)}
                            onMouseLeave={() => setHoveredSegment(null)}
                          />
                          <m.circle
                            cx="120" cy="120" r={r}
                            className="fill-none cursor-pointer"
                            stroke={seg.color} strokeLinecap="round"
                            strokeWidth={isHovered ? 22 : 16}
                            strokeDasharray={`${segDashLen} ${circ}`}
                            initial={{ strokeDashoffset: segDashLen }}
                            whileInView={{ strokeDashoffset: 0 }}
                            viewport={{ once: true }}
                            transition={{
                              strokeDashoffset: { delay: seg.delay, duration: 0.8, ease: "easeOut" },
                              strokeWidth: { type: "spring", stiffness: 300, damping: 20 }
                            }}
                            style={{
                              cursor: "pointer",
                              transition: "stroke-width 0.3s cubic-bezier(0.16, 1, 0.3, 1), filter 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                              filter: isHovered ? `drop-shadow(0px 0px 8px ${seg.color}50)` : 'none'
                            }}
                            onMouseEnter={() => setHoveredSegment(i)}
                            onMouseLeave={() => setHoveredSegment(null)}
                          />
                        </g>
                      );
                    });
                  })()}
                </m.svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center p-4">
                  <AnimatePresence mode="wait">
                    <m.div
                      key={hoveredSegment !== null ? `hovered-${hoveredSegment}` : 'default'}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col items-center justify-center max-w-[140px]"
                    >
                      {hoveredSegment !== null ? (
                        <>
                          <span className="text-3xl font-black tracking-tight transition-colors duration-300" style={{ color: donutSegments[hoveredSegment].color }}>
                            {donutSegments[hoveredSegment].pct}%
                          </span>
                          <span className="text-[11px] font-bold text-muted-foreground mt-1 line-clamp-2 leading-tight">
                            {donutSegments[hoveredSegment].label}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl font-black tracking-tight text-foreground">84.250 €</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Gesamtkosten</span>
                          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-0.5 rounded-full mt-2 flex items-center gap-1">↓ -12% vs. Vj.</span>
                        </>
                      )}
                    </m.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </m.div>
        </div>
      </div>

      {/* Main Showcase */}
      <div className="container mx-auto px-4 sm:px-8 lg:px-16 xl:px-20 pb-32">
        <m.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-7xl mx-auto"
        >
          <MacWindow className="shadow-2xl border-border/50 bg-background/50 backdrop-blur-xl">
            <MediaContent
              src="https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/betriebskosten-page.avif"
              alt="Betriebskostenübersicht"
              type="image"
              className="dark:hidden"
            />
            <MediaContent
              src="https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/betriebskosten-page-darkmode.avif"
              alt="Betriebskostenübersicht Dark"
              type="image"
              className="hidden dark:block"
            />
          </MacWindow>
        </m.div>
      </div>

      {/* Timeline Section */}
      <section className="py-24 relative overflow-hidden bg-background">
        <div className="container mx-auto px-4 sm:px-8 lg:px-16 xl:px-20 max-w-7xl relative z-10">
          <div className="py-20 first:pt-0 relative">
            <div className="text-center w-full max-w-3xl mx-auto mb-24">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">In 4 Schritten <span className="text-primary italic">zur Abrechnung.</span></h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Der einfache Leitfaden zur Erstellung Ihrer Betriebskostenabrechnung – Schritt für Schritt.
              </p>
            </div>

            <div className="relative">
              {meterSteps.map((step, index) => {
                const isEven = index % 2 === 0;
                return (
                  <m.div 
                    key={index}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: index * 0.15, duration: 0.3 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center relative py-10 lg:py-16"
                  >
                    {/* Segment of the timeline line */}
                    {index === 0 && (
                      <m.div
                        initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
                        whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                        className="absolute left-1/2 top-1/2 bottom-0 -translate-x-1/2 w-0.5 border-l-2 border-dashed border-primary/20 hidden lg:block"
                      />
                    )}
                    {index > 0 && index < meterSteps.length - 1 && (
                      <m.div
                        initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
                        whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                        className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-0.5 border-l-2 border-dashed border-primary/20 hidden lg:block"
                      />
                    )}
                    {index === meterSteps.length - 1 && (
                      <m.div
                        initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
                        whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                        className="absolute left-1/2 top-0 bottom-1/2 -translate-x-1/2 w-0.5 border-l-2 border-dashed border-primary/20 hidden lg:block"
                      />
                    )}

                    {/* Timeline Node in the center (visible only on lg screens) */}
                    <m.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background border-4 border-primary flex items-center justify-center hidden lg:flex z-10 shadow-xs"
                    >
                      <span className="text-[10px] font-bold text-primary font-mono">{index + 1}</span>
                    </m.div>

                    {/* Left side column: Text for even indices, mockup for odd indices */}
                    <m.div
                      initial={{ opacity: 0, x: isEven ? -20 : 20, y: 10 }}
                      whileInView={{ opacity: 1, x: 0, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
                      className={cn(
                        "lg:col-span-5 flex flex-col justify-center",
                        isEven ? "order-1 lg:order-1 text-left" : "order-1 lg:order-3 text-left lg:text-left"
                      )}
                      >
                      <h3 className="text-2xl font-extrabold text-foreground tracking-tight mb-4 flex items-center gap-3">
                        <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <step.icon size={16} className="stroke-[2.5]" />
                        </span>
                        {step.title}
                      </h3>
                      
                      <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                        {step.description}
                      </p>

                     </m.div>
 
                      {/* Spacer for center timeline alignment */}
                      <div className={cn("lg:col-span-2 hidden lg:block", isEven ? "lg:order-2" : "lg:order-2")} />
 
                     {/* Right side column: Mockup for even indices, text for odd indices */}
                     <m.div
                       initial={{ opacity: 0, x: isEven ? 20 : -20, y: 10 }}
                       whileInView={{ opacity: 1, x: 0, y: 0 }}
                       viewport={{ once: true }}
                       transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
                       className={cn(
                         "lg:col-span-5 flex justify-center items-center",
                         isEven ? "order-3 lg:order-3" : "order-2 lg:order-1"
                       )}
                     >
                       <div className="relative bg-black/5 dark:bg-black/25 rounded-3xl border border-border/40 overflow-hidden shadow-inner p-8 hover:border-primary/20 transition-all duration-300 w-fit">
                         <div className="absolute inset-0 bg-linear-to-tr from-primary/5 via-transparent to-transparent opacity-40 pointer-events-none" />
                         <div className="relative z-10 transform scale-95 sm:scale-100 transition-transform duration-500">
                           {step.mockup}
                         </div>
                       </div>
                     </m.div>
                  </m.div>
                );
              })}
            </div>
          </div>

                  </div>
      </section>

      {/* Feature Section - Bento Grid Style */}
      <section className="py-24 relative overflow-hidden bg-muted/10">
        <div className="container mx-auto px-4 sm:px-8 lg:px-16 xl:px-20">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Alle Funktionen <span className="text-primary italic">im Gesamtüberblick.</span></h2>
            <p className="text-lg text-muted-foreground">Ein nahtloser Workflow, der Zeit spart und Fehler eliminiert.</p>
          </m.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 max-w-7xl mx-auto">
            {/* Feature 1: Structured Cost Capture (Large) — mock top, content bottom */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-4 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
              <div className="relative h-full flex flex-col">
                {/* Mock Area — top */}
                <div className="relative h-[240px] mt-6 mx-6 overflow-hidden bg-black/5 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5">
                  <div className="w-full h-full transform transition-transform duration-700 group-hover:scale-[1.02]">
                    <div className="w-full h-full p-5 flex flex-col gap-2.5 select-none">
                      {[
                        { name: "Grundsteuer B", amount: "1.250,50 €", icon: Receipt },
                        { name: "Müllabfuhr", amount: "340,20 €", icon: Droplet },
                        { name: "Gebäudeversicherung", amount: "890,00 €", icon: FileText },
                        { name: "Hauswart", amount: "250,00 €", icon: CheckCircle2 },
                      ].map((row, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-3 p-2.5 rounded-xl bg-background/60 border border-border/50 shadow-xs backdrop-blur-xs",
                            "group-hover:translate-x-2 transition-transform duration-500",
                            i === 0 && "delay-0",
                            i === 1 && "delay-[75ms]",
                            i === 2 && "delay-[150ms]",
                            i === 3 && "delay-[225ms]"
                          )}
                        >
                          <div className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                            <row.icon size={13} className="text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-foreground/80 truncate">{row.name}</div>
                          </div>
                          <div className="text-xs font-mono font-bold text-foreground/70 shrink-0">{row.amount}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content Area — bottom */}
                <div className="p-8 md:p-10 flex flex-col gap-2 relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Receipt size={20} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary/60">Kostenerfassung</span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">Strukturierte Kostenerfassung</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Erfassen Sie alle Ausgaben zentral. Weisen Sie Kostenarten und Umlageschlüssel direkt bei der Eingabe zu.</p>
                </div>
              </div>
            </m.div>

            {/* Feature 2: Meter Management — mock top, content bottom */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
              <div className="relative h-full flex flex-col">
                {/* Mock Area — top */}
                <div className="relative h-[240px] mt-6 mx-6 overflow-hidden bg-black/5 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5">
                  <div className="w-full h-full transform transition-transform duration-700 group-hover:scale-[1.02]">
                    <div className="w-full h-full p-5 flex flex-col gap-3 justify-center select-none">
                      {[
                        { label: "Wasser Küche", unit: "345,20 m³", active: true, trend: "+2,4%", up: true, Icon: Droplet, color: "text-blue-500", bg: "bg-blue-500/10" },
                        { label: "Strom Allgemein", unit: "4.521 kWh", active: true, trend: "-5,1%", up: false, Icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500/10" },
                        { label: "Heizung Haupt", unit: "892 kWh", active: false, trend: "0%", up: false, Icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
                      ].map((meter, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/40 group-hover:translate-y-[-2px] transition-transform" style={{ transitionDelay: `${i * 75}ms` }}>
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", meter.bg, meter.color)}>
                            <meter.Icon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-foreground/80 truncate">{meter.label}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">{meter.unit}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {meter.trend !== "0%" && (
                              meter.up ? (
                                <TrendingUp size={12} className="text-rose-500" />
                              ) : (
                                <TrendingDown size={12} className="text-emerald-500" />
                              )
                            )}
                            <span className={cn("text-[9px] font-bold", meter.up ? "text-rose-500" : "text-emerald-500")}>{meter.trend}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content Area — bottom */}
                <div className="p-8 md:p-10 flex flex-col gap-2 relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Calculator size={20} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary/60">Zähler & Verbräuche</span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">Zählerverwaltung</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Lückenlose Protokollierung aller Verbräuche mit Plausibilitäts-Check.</p>
                </div>
              </div>
            </m.div>

            {/* Feature 3: Smarte Umlage — mock top, content bottom */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
              <div className="relative h-full flex flex-col">
                {/* Mock Area — top */}
                <div className="relative h-[240px] mt-6 mx-6 overflow-hidden bg-black/5 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5">
                  <div className="w-full h-full transform transition-transform duration-700 group-hover:scale-[1.02]">
                    <div className="w-full h-full flex items-end justify-between gap-1 p-5 pb-4 select-none">
                      {[45, 75, 50, 95, 65, 80].map((h, i) => (
                        <m.div
                          key={i}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                          className="flex-1 rounded-t-md bg-foreground/10 hover:bg-primary/40 transition-colors duration-300"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content Area — bottom */}
                <div className="p-8 md:p-10 flex flex-col gap-2 relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <PieChart size={20} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary/60">Verteilerschlüssel</span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">Smarte Umlage</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Variable Schlüssel nach Fläche, Personen oder Verbrauch.</p>
                </div>
              </div>
            </m.div>

            {/* Feature 5: Automatischer Leerstand (lg:col-span-2) */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-2 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-all duration-500"
              >
                <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
                <div className="relative h-full flex flex-col">
                  {/* Mock Area */}
                  <div className="relative h-[240px] mt-6 mx-6 overflow-hidden bg-black/5 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5 flex items-center justify-center p-4">
                    <div className="w-full bg-background/50 border border-border/40 rounded-xl p-4 space-y-2 select-none text-xs">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase font-bold tracking-wide">
                        <span>Leerstand</span>
                        <span className="text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">45 Tage</span>
                      </div>
                      <div className="w-full h-2 bg-foreground/5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 w-[12%]" />
                      </div>
                      <div className="flex justify-between text-[11px] text-foreground/80 font-mono">
                        <span>Anteil:</span>
                        <span className="font-bold">12.33% / 154,20 €</span>
                      </div>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-8 md:p-10 flex flex-col gap-2 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <RefreshCw size={20} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-primary/60">ZEITRÄUME</span>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-1">Automatischer Leerstand</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Leerstände tagesgenau erfassen und Kosten automatisch für den korrekten Zeitraum zuweisen.
                    </p>
                  </div>
                </div>
              </m.div>

            {/* Feature 4: Professionelle Dokumente — mock top, content bottom */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
              <div className="relative h-full flex flex-col">
                {/* Mock Area — top */}
                <div className="relative h-[240px] mt-6 mx-6 overflow-hidden bg-black/5 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5">
                  <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
                  <div className="w-full h-full transform transition-transform duration-700 group-hover:scale-[1.02]">
                    <div className="absolute inset-0 flex items-center justify-center select-none">
                      <div className="w-44 h-56 bg-background rounded-xl border border-border/60 shadow-sm absolute rotate-6 opacity-30 translate-x-8" />
                      <div className="w-44 h-56 bg-background rounded-xl border border-border/60 shadow-xl absolute -rotate-2 flex flex-col p-5 z-10">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5 self-start">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="w-20 h-2 bg-foreground/20 rounded-full mb-4" />
                        <div className="w-full h-1 bg-foreground/5 rounded-full mb-2" />
                        <div className="w-full h-1 bg-foreground/5 rounded-full mb-2" />
                        <div className="w-2/3 h-1 bg-foreground/5 rounded-full mb-6" />
                        <div className="mt-auto w-full flex justify-between items-end">
                          <div className="w-14 h-3 bg-muted/50 rounded-full" />
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <FileDown size={12} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Area — bottom */}
                <div className="p-8 md:p-10 flex flex-col gap-2 relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <FileText size={20} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary/60">PDF Export</span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">Professionelle Dokumente</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Generieren Sie formgerechte Abrechnungen mit nur einem Klick. Klar strukturiert und verständlich.</p>
                  <Button asChild variant="outline" className="mt-4 w-full flex items-center justify-center gap-2 font-semibold">
                    <a href={EXAMPLE_BILL_PDF_URL} target="_blank" rel="noopener noreferrer">
                      Muster herunterladen <FileDown size={14} />
                    </a>
                  </Button>
                </div>
              </div>
            </m.div>


          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <BottomCTA
        onGetStarted={() => window.location.href = '/?getStarted=true'}
        title="Bereit für transparente"
        subtitle="Betriebskostenabrechnungen?"
        description="Digitale Verwaltung muss nicht kompliziert sein. Starten Sie jetzt und erstellen Sie Ihre erste Abrechnung in wenigen Minuten."
        badgeText="Jetzt loslegen"
        primaryButtonText="Kostenlos starten"
        secondaryButtonText="Demo anfordern"
        theme="houses"
      />
    </div>
    </LazyMotion>
  );
}
