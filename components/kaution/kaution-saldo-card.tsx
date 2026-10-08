import { Info, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { KAUTION_BEWEGUNGSARTEN_VERFUEGBAR } from "@/lib/kautionen-constants";
import { formatBetrag, formatDatum } from "@/components/kaution/kaution-format";
import type { KautionDetails } from "@/types/Kaution";

/**
 * Overview card of a deposit: balance ("Kontostand (Einbehalt)") and the totals, plus the non-blocking
 * hints (3x rent, legacy data). Everything shown here comes from the database (`get_kaution_details`),
 * nothing is calculated in the browser.
 */

interface KautionSaldoCardProps {
  details: KautionDetails;
}

interface Kennzahl {
  label: string;
  wert: number;
}

export function KautionSaldoCard({ details }: KautionSaldoCardProps) {
  const { kaution, konto, warnungen, einbehalt } = details;

  const kennzahlen: Kennzahl[] = [
    { label: "Soll-Betrag", wert: kaution.soll_betrag },
    { label: "Insgesamt eingezahlt", wert: konto.summe_einzahlungen },
  ];
  // Interest credits: phase 3. Shown as soon as they can be booked or exist.
  if (KAUTION_BEWEGUNGSARTEN_VERFUEGBAR.includes("zinsgutschrift") || konto.summe_zinsgutschriften > 0) {
    kennzahlen.push({ label: "Zinsgutschriften", wert: konto.summe_zinsgutschriften });
  }
  kennzahlen.push(
    { label: "Insgesamt ausgezahlt", wert: konto.summe_auszahlungen },
    { label: "Insgesamt abgezogen", wert: konto.summe_abzuege }
  );

  // Hints are never blocking (§ 551 BGB is a guide value, LEGAL-3): they only point at the agreement.
  const hinweise: string[] = [];
  if (warnungen.soll_ueber_dreifache_miete && warnungen.dreifache_miete !== null) {
    hinweise.push(
      `Hinweis: Der Betrag liegt über dem Dreifachen der Miete bei Vertragsschluss (${formatBetrag(warnungen.dreifache_miete)}). Bitte prüfen Sie die Vereinbarung.`
    );
  }
  if (warnungen.einzahlungen_ueber_dreifache_miete) {
    hinweise.push("Hinweis: Die Einzahlungen (ohne Zinsgutschriften) übersteigen das Dreifache der Miete bei Vertragsschluss.");
  }

  const istAltbestand = kaution.quelle === "migration_altbestand";
  // Withheld amount (phase 4): only while there is still a balance.
  const zeigeEinbehalt = Boolean(einbehalt) && konto.kontostand > 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Kontostand (Einbehalt)</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight" data-testid="kaution-kontostand">
              {formatBetrag(konto.kontostand)}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {kennzahlen.map((kennzahl) => (
              <div key={kennzahl.label}>
                <dt className="text-muted-foreground">{kennzahl.label}</dt>
                <dd className="font-medium tabular-nums">{formatBetrag(kennzahl.wert)}</dd>
              </div>
            ))}
          </dl>
        </div>

        {zeigeEinbehalt && einbehalt ? (
          <p className="text-sm">
            Seit {formatDatum(einbehalt.seit)} einbehalten ({einbehalt.liegedauer_tage} Tage): {einbehalt.grund}
          </p>
        ) : null}

        {hinweise.length > 0 ? (
          <Alert
            role="note"
            className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600"
          >
            <TriangleAlert aria-hidden="true" className="h-4 w-4" />
            <AlertDescription className="space-y-1">
              {hinweise.map((hinweis) => (
                <p key={hinweis}>{hinweis}</p>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}

        {istAltbestand ? (
          <Alert role="note" className="border-blue-500/40 bg-blue-500/5 text-blue-900 dark:text-blue-200 [&>svg]:text-blue-600">
            <Info aria-hidden="true" className="h-4 w-4" />
            <AlertDescription>
              Aus dem Altbestand übernommen. Fehlende Angaben wurden durch Ersatzwerte ersetzt.
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
