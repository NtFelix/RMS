'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calculator,
  Zap,
  Flame,
  FileText,
  CheckCircle2,
  Receipt,
  FileDown,
  PieChart,
  Droplet,
  TrendingUp,
  TrendingDown,
  FileUp,
  AlertTriangle,
  RefreshCw,
  Check,
  ArrowRight,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MacWindow } from '@/components/ui/mac-window';
import { MediaContent } from '@/components/ui/media-content';
import { CTAButton } from '@/components/ui/cta-button';
import { LazyMotion, m, domMax, useScroll, useTransform } from 'framer-motion';
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

const DISTRIBUTION_BARS = [45, 75, 50, 95, 65, 80].map((h, i) => ({ id: `bar-${i + 1}`, height: h }));

const DONUT_SEGMENTS = [
  { pct: 30, color: "#3b82f6", label: "Heizung & Warmwasser", delay: 0.45 },
  { pct: 18, color: "#10b981", label: "Hauswart & Reinigung", delay: 0.55 },
  { pct: 14, color: "#f59e0b", label: "Müll & Entsorgung", delay: 0.65 },
  { pct: 12, color: "#8b5cf6", label: "Grundsteuer", delay: 0.75 },
  { pct: 10, color: "#ec4899", label: "Versicherungen", delay: 0.85 },
  { pct: 16, color: "#06b6d4", label: "Strom & Sonstige", delay: 0.95 },
];

const COLUMNS = ['Objekt', 'Whg.', 'Mieter', 'Heizung', 'Wasser', 'Müll', 'Hauswart', 'Gesamt', 'Differenz'];

function SpreadsheetHeroTable({
  selectedCell,
  setSelectedCell,
  hoveredRow,
  setHoveredRow,
}: {
  selectedCell: { row: number; col: number } | null;
  setSelectedCell: (cell: { row: number; col: number } | null) => void;
  hoveredRow: number | null;
  setHoveredRow: (row: number | null) => void;
}) {
  return (
    <div className="w-full max-w-5xl mx-auto rounded-xl border border-border/40 shadow-2xl bg-card overflow-hidden">
      {/* Chrome bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="ml-3 text-xs font-mono text-muted-foreground/80 truncate">
            betriebskosten_2024_FINAL_v3_kopie.xlsx
          </span>
        </div>
        <span className="text-[11px] font-mono font-medium text-destructive/80 bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20 hidden sm:inline-block">
          2 Formelfehler
        </span>
      </div>

      {/* Formula bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/15 bg-muted/5 text-xs font-mono text-muted-foreground">
        <span className="text-primary font-bold">fx</span>
        <span className="text-muted-foreground/40">|</span>
        <span className="text-foreground/70">
          {selectedCell !== null
            ? (EXCEL_DATA[selectedCell.row]?.fehler
              ? `FEHLER in Zeile ${selectedCell.row + 1}: ${EXCEL_DATA[selectedCell.row]?.fehler}`
              : `=SUMME(D${selectedCell.row + 2}:G${selectedCell.row + 2}) → ${EUR(EXCEL_DATA[selectedCell.row]?.gesamt ?? 0)} €`)
            : '=SUMME(D2:G16) — Klicke eine Zelle an'}
        </span>
      </div>

      {/* Table viewport */}
      <div className="overflow-x-auto max-h-[380px] overflow-y-auto scrollbar-thin">
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-muted/10 border-b border-border/20 text-muted-foreground sticky top-0 z-20">
              <th className="w-10 h-8 border-r border-border/20 text-center font-medium bg-muted/30">#</th>
              {COLUMNS.map((col, j) => (
                <th
                  key={col}
                  className={cn(
                    "px-4 h-8 border-r border-border/10 font-medium whitespace-nowrap transition-colors",
                    j >= 3 && "text-right",
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
                  key={`${row.objekt}-${row.whg}-${row.mieter}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={cn(
                    "transition-colors duration-100",
                    hoveredRow === i && "bg-muted/20",
                    isError && "bg-destructive/[0.03]",
                    isError && hoveredRow === i && "bg-destructive/[0.06]"
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
                  {/* Cells */}
                  {[
                    row.objekt,
                    row.whg,
                    row.mieter,
                    EUR(row.heizung) + ' €',
                    EUR(row.wasser) + ' €',
                    EUR(row.muell) + ' €',
                    row.hauswart > 0 ? EUR(row.hauswart) + ' €' : '-',
                    row.fehler ? row.fehler : EUR(row.gesamt) + ' €',
                    row.fehler ? '-' : (row.differenz > 0 ? `+${EUR(row.differenz)} €` : `${EUR(row.differenz)} €`),
                  ].map((cell, j) => {
                    const isSelected = selectedCell?.row === i && selectedCell?.col === j;
                    const isCellError = isError && j >= 7;
                    const isNumeric = j >= 3;

                    return (
                      <td
                        key={j}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedCell(isSelected ? null : { row: i, col: j })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedCell(isSelected ? null : { row: i, col: j });
                          }
                        }}
                        className={cn(
                          "h-9 border-r border-b border-border/10 whitespace-nowrap cursor-[cell] transition-colors relative select-none",
                          isSelected && "outline-2 outline-primary outline-offset-[-2px] bg-primary/[0.08] z-10",
                          isCellError && !isSelected && "bg-destructive/10 text-destructive font-bold",
                          selectedCell?.row === i && !isSelected && "bg-primary/[0.03]",
                          selectedCell?.col === j && !isSelected && "bg-primary/[0.03]"
                        )}
                      >
                        {isCellError ? (
                          <div className="flex items-center justify-between px-3 leading-9">
                            <span className="font-bold text-destructive">{cell}</span>
                            <span className="text-[10px] text-destructive/70 bg-destructive/15 px-1.5 py-0.5 rounded">Fehler</span>
                          </div>
                        ) : (
                          <span
                            className={cn(
                              "block px-4 leading-9 text-sm truncate",
                              isNumeric && "text-right font-mono tabular-nums text-foreground/80",
                              !isNumeric && "text-left text-foreground/70",
                              j >= 7 && "font-semibold text-foreground/90",
                              j === 8 && row.differenz > 0 && "text-emerald-600 dark:text-emerald-400",
                              j === 8 && row.differenz < 0 && "text-rose-600 dark:text-rose-400"
                            )}
                          >
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
    </div>
  );
}

function SpreadsheetHero() {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const headingOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const headingY = useTransform(scrollYProgress, [0, 0.55], [0, -50]);
  const sheetParallaxY = useTransform(scrollYProgress, [0, 1], [0, 110]);
  const gridParallaxY = useTransform(scrollYProgress, [0, 1], [0, 40]);

  return (
    <>
      {/* Background Decor — Spreadsheet Grid */}
      <m.div
        style={{ y: gridParallaxY }}
        className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-linear-to-b from-primary/10 via-primary/5 to-transparent opacity-50" />

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
          <div
            className="absolute top-0 left-0 w-full"
            style={{
              height: '28px',
              backgroundColor: '#808080',
              opacity: 0.25,
            }}
          />
        </div>

        <div className="absolute inset-0 bg-linear-to-r from-background from-[5%] via-transparent via-[15%] to-background to-[95%]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </m.div>

      {/* Spreadsheet Hero — Sag Chaos Ade */}
      <section ref={heroRef} className="min-h-screen bg-linear-to-b from-background to-muted/20">
        <m.div
          style={{ opacity: headingOpacity, y: headingY }}
          className="container mx-auto px-4 pt-48 pb-16"
        >
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Sag <span className="text-primary italic">Chaos Ade.</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mt-4 mb-10 max-w-2xl mx-auto">
              Spare Zeit und exportiere deine Abrechnungen einfach mit klarer Übersicht.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
            </div>
          </div>
        </m.div>

        {/* Spreadsheet Showcase (scroll-driven parallax) */}
        <m.div
          style={{ y: sheetParallaxY }}
          className="container mx-auto px-4 pb-28"
        >
          <SpreadsheetHeroTable
            selectedCell={selectedCell}
            setSelectedCell={setSelectedCell}
            hoveredRow={hoveredRow}
            setHoveredRow={setHoveredRow}
          />
        </m.div>
      </section>
    </>
  );
}

function TransitionQuoteSection() {
  return (
    <section className="py-24 bg-muted/5">
      <div className="container mx-auto px-4 sm:px-8 lg:px-16 xl:px-20">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-primary/60">Der Wechsel</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mt-3 mb-6">
            Tabellen weg. <span className="text-primary italic">Überblick her.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Statt Excel-Zeilen und manuellen Formeln unterstützt Mietevo Sie 
            bei Ihrer Betriebskostenabrechnung: übersichtlich und fehlerfrei.
          </p>
        </m.div>
      </div>
    </section>
  );
}

function DonutBreakdownSection() {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);

  return (
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
              Von Heizung bis Versicherung: Mietevo zeigt Ihnen die genaue Verteilung 
              Ihrer Betriebskosten. Erkennen Sie auf einen Blick, wo die größten Posten liegen 
              und wie sich die Kosten über Abrechnungsperioden hinweg entwickeln.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              {DONUT_SEGMENTS.map((seg, i) => (
                <div
                  key={seg.label}
                  className="flex items-center justify-between text-sm py-1.5 border-b border-border/10 cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(i)}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className={hoveredSegment === i ? "text-foreground font-semibold" : "text-muted-foreground"}>
                      {seg.label}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{seg.pct} %</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: SVG Donut */}
          <div className="flex justify-center items-center">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72">
              <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90">
                <circle cx="120" cy="120" r="90" className="stroke-gray-100 dark:stroke-zinc-800/60 fill-none" strokeWidth="14" />
                {(() => {
                  const r = 90;
                  const circ = 2 * Math.PI * r;
                  let cumulativeAngle = 0;
                  return DONUT_SEGMENTS.map((seg, i) => {
                    const segLen = (seg.pct / 100) * circ;
                    const angle = cumulativeAngle;
                    cumulativeAngle += (seg.pct / 100) * 360;
                    const isHovered = hoveredSegment === i;
                    const segDashLen = Math.max(0.1, segLen - 24);
                    return (
                      <g key={seg.label} transform={`rotate(${angle - 90}, 120, 120)`}>
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
                          transition={{ delay: seg.delay, duration: 0.8, ease: "easeOut" }}
                          onMouseEnter={() => setHoveredSegment(i)}
                          onMouseLeave={() => setHoveredSegment(null)}
                        />
                      </g>
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold font-mono">100%</span>
                <span className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Umlagefähig</span>
              </div>
            </div>
          </div>
        </m.div>
      </div>

      {/* Dashboard Heading & Screenshot */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto text-center mt-24 mb-12"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-primary/60">Immobilien-Dashboard</span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mt-3 mb-6">
          Mehrere Häuser. Mehrere Jahre. <span className="text-primary italic">Ein Dashboard.</span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Behalten Sie die Betriebskosten aller Liegenschaften im Blick – im Jahresvergleich, 
          ohne den Überblick zu verlieren.
        </p>
      </m.div>
      <m.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
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
  );
}

const METER_STEPS = [
  {
    title: "Kosten & Belege erfassen",
    icon: Receipt,
    description: "Erfassen Sie alle angefallenen Ausgaben für Ihre Liegenschaften und weisen Sie diese direkt den passenden Kostenarten zu.",
    mockup: (
      <div className="w-[280px] bg-background border border-border shadow-2xl rounded-2xl p-5 backdrop-blur-md hover:border-primary/30 transition-colors duration-300">
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
            { name: "Hauswart", amount: "250,00 €" },
          ].map((row) => (
            <div key={row.name} className="flex items-center justify-between p-2 rounded bg-muted/5 border border-border/40 text-xs">
              <span className="font-semibold text-foreground/80">{row.name}</span>
              <span className="font-mono font-bold text-foreground">{row.amount}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Zählerstände importieren",
    icon: FileUp,
    description: "Geben Sie die Zählerstände Ihrer Mieter für Heizung, Wasser oder Strom ein oder importieren Sie diese gesammelt für das gesamte Objekt.",
    mockup: (
      <div className="w-[280px] bg-background border border-border shadow-2xl rounded-2xl p-5 backdrop-blur-md hover:border-primary/30 transition-colors duration-300">
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
    ),
  },
  {
    title: "Plausibilitätscheck",
    icon: AlertTriangle,
    description: "Lassen Sie das System die Berechnungen automatisch prüfen. Eventuelle Eingabefehler oder extreme Abweichungen werden sofort signalisiert.",
    mockup: (
      <div className="w-[280px] bg-background border border-destructive/20 shadow-2xl rounded-2xl p-5 backdrop-blur-md hover:border-destructive/45 transition-colors duration-300">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <AlertTriangle size={15} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-destructive uppercase tracking-wider">Plausibilitäts-Warnung</div>
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
    ),
  },
  {
    title: "PDFs gesammelt exportieren",
    icon: FileDown,
    description: "Generieren Sie die fertigen Dokumente mit einem Klick. Exportieren Sie alle PDFs gesammelt in einer Zip-Datei oder wählen Sie einzelne Mieter aus.",
    mockup: (
      <div className="w-[280px] bg-background border border-border shadow-2xl rounded-2xl p-5 backdrop-blur-md hover:border-primary/30 transition-colors duration-300">
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
    ),
  },
];

function TimelineGuideSection() {
  return (
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
            {METER_STEPS.map((step, index) => {
              const isEven = index % 2 === 0;
              return (
                <m.div 
                  key={step.title}
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
                  {index > 0 && index < METER_STEPS.length - 1 && (
                    <m.div
                      initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
                      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                      className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-0.5 border-l-2 border-dashed border-primary/20 hidden lg:block"
                    />
                  )}
                  {index === METER_STEPS.length - 1 && (
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
                    initial={{ scale: 0.95, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
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
                      isEven ? "lg:order-1 lg:text-right" : "lg:order-3 lg:text-left"
                    )}
                  >
                    <div className={cn(
                      "flex items-center gap-3 mb-4",
                      isEven ? "lg:justify-end" : "lg:justify-start"
                    )}>
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <step.icon size={20} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-primary/60">Schritt {index + 1}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-3">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto lg:mx-0">
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
                    transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
                    className={cn(
                      "lg:col-span-5 flex items-center",
                      isEven ? "lg:order-3 justify-center lg:justify-start" : "lg:order-1 justify-center lg:justify-end"
                    )}
                  >
                    <div className="w-full max-w-[280px]">
                      {step.mockup}
                    </div>
                  </m.div>
                </m.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function BentoGridSection() {
  return (
    <section className="py-24 relative overflow-hidden bg-muted/10">
      <div className="container mx-auto px-4 sm:px-8 lg:px-16 xl:px-20">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="opacity-0 translate-y-5 text-center max-w-3xl mx-auto mb-20"
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
            className="opacity-0 translate-y-5 lg:col-span-4 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-shadow duration-500"
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
                    ].map((row) => (
                      <div
                        key={row.name}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-xl bg-background/60 border border-border/50 shadow-xs backdrop-blur-xs",
                          "group-hover:translate-x-2 transition-transform duration-500"
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
            className="opacity-0 translate-y-5 lg:col-span-2 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-shadow duration-500"
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
                    ].map((meter) => (
                      <div key={meter.label} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/40 group-hover:translate-y-[-2px] transition-transform">
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
            className="opacity-0 translate-y-5 lg:col-span-2 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-shadow duration-500"
          >
            <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
            <div className="relative h-full flex flex-col">
              {/* Mock Area — top */}
              <div className="relative h-[240px] mt-6 mx-6 overflow-hidden bg-black/5 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5">
                <div className="w-full h-full transform transition-transform duration-700 group-hover:scale-[1.02]">
                  <div className="w-full h-full flex items-end justify-between gap-1 p-5 pb-4 select-none">
                    {DISTRIBUTION_BARS.map((bar, i) => (
                      <m.div
                        key={bar.id}
                        style={{ height: `${bar.height}%`, transformOrigin: 'bottom' }}
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
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
                  <span className="text-xs font-bold uppercase tracking-widest text-primary/60">Verteilschlüssel</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-1">Smarte Umlage</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Variable Schlüssel nach Fläche, Personen oder Verbrauch.</p>
              </div>
            </div>
          </m.div>

          {/* Feature 4: Automatischer Leerstand (lg:col-span-2) */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="opacity-0 translate-y-5 lg:col-span-2 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-shadow duration-500"
          >
            <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
            <div className="relative h-full flex flex-col">
              {/* Mock Area */}
              <div className="relative h-[240px] mt-6 mx-6 overflow-hidden bg-black/5 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5 flex items-center justify-center p-4">
                <div className="space-y-2 select-none text-[11px] text-foreground/80 w-full px-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/20">
                    <span className="text-muted-foreground">Whg 03 (Leerstand)</span>
                    <span className="font-mono font-bold text-primary">Kosten Vermieter</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/20">
                    <span className="text-muted-foreground">Zeitraum</span>
                    <span className="font-mono text-muted-foreground">01.03 - 31.05</span>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 text-primary text-[10px] flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="shrink-0" />
                    <span>Automatisch taggenau abgezogen</span>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-8 md:p-10 flex flex-col gap-2 relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <RefreshCw size={20} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-primary/60">AUTOMATION</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-1">Automatischer Leerstand</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Leerstandszeiten werden präzise berechnet und dem Eigentümer zugewiesen.
                </p>
              </div>
            </div>
          </m.div>

          {/* Feature 5: Professionelle Dokumente — mock top, content bottom */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="opacity-0 translate-y-5 lg:col-span-2 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-shadow duration-500"
          >
            <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
            <div className="relative h-full flex flex-col">
              {/* Mock Area — top */}
              <div className="relative h-[240px] mt-6 mx-6 overflow-hidden bg-black/5 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5 flex items-center justify-center p-6">
                <div className="w-full max-w-[200px] aspect-[1/1.3] bg-background rounded-xl border border-border shadow-lg p-3 flex flex-col justify-between group-hover:scale-105 transition-transform duration-500 select-none">
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <FileText size={16} />
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 w-3/4 bg-foreground/20 rounded-xs" />
                      <div className="h-2 w-1/2 bg-foreground/10 rounded-xs" />
                    </div>
                  </div>
                  <div className="space-y-1 border-t border-border/40 pt-2">
                    <div className="flex justify-between items-center text-[8px] text-muted-foreground">
                      <span>Ergebnis</span>
                      <span className="font-mono text-emerald-500 font-bold">Guthaben</span>
                    </div>
                    <div className="h-1.5 w-full bg-foreground/10 rounded-xs" />
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
  );
}

export default function UtilityCostPage() {
  const router = useRouter();

  return (
    <LazyMotion features={domMax}>
      <div className="min-h-screen bg-background text-foreground">
        <SpreadsheetHero />
        <TransitionQuoteSection />
        <DonutBreakdownSection />
        <TimelineGuideSection />
        <BentoGridSection />
        <BottomCTA
          onGetStarted={() => router.push('/?getStarted=true')}
          title="Bereit für transparente"
          subtitle="Betriebskostenabrechnungen?"
          description="Digitale Verwaltung muss nicht kompliziert sein. Starten Sie jetzt und erstellen Sie Ihre erste Abrechnung in wenigen Minuten."
          badgeText="Jetzt loslegen"
          primaryButtonText="Kostenlos starten"
          theme="houses"
        />
      </div>
    </LazyMotion>
  );
}
