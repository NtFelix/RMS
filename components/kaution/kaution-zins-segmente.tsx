"use client";

import { formatBetrag, formatDatum } from "@/components/kaution/kaution-format";
import { endeEinschliessendSicher } from "@/lib/kautionen-zinsen";
import type { KautionZinsSegment } from "@/types/Kaution";

/**
 * Sections of an interest calculation as a small table (period, days, rate, balance, interest). Display only: every
 * figure comes from the database (proposal or stored calculation basis). The period end is shown INCLUSIVE, like the
 * rest of the interest UI; the interest amount is shown as the exact text the database sent.
 */

interface KautionZinsSegmenteTabelleProps {
  segmente: KautionZinsSegment[];
}

export function KautionZinsSegmenteTabelle({ segmente }: KautionZinsSegmenteTabelleProps) {
  if (segmente.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <caption className="sr-only">Abschnitte der Zinsberechnung</caption>
        <thead>
          <tr className="text-left text-muted-foreground">
            <th scope="col" className="py-1 pr-2 font-medium">
              Zeitraum
            </th>
            <th scope="col" className="py-1 pr-2 text-right font-medium">
              Tage
            </th>
            <th scope="col" className="py-1 pr-2 text-right font-medium">
              Satz
            </th>
            <th scope="col" className="py-1 pr-2 text-right font-medium">
              Saldo
            </th>
            <th scope="col" className="py-1 text-right font-medium">
              Zins
            </th>
          </tr>
        </thead>
        <tbody>
          {segmente.map((segment) => (
            <tr key={`${segment.von}-${segment.bis}`} className="border-t">
              <td className="whitespace-nowrap py-1 pr-2">
                {formatDatum(segment.von)} – {formatDatum(endeEinschliessendSicher(segment.bis))}
              </td>
              <td className="py-1 pr-2 text-right tabular-nums">{segment.tage}</td>
              <td className="py-1 pr-2 text-right tabular-nums">{String(segment.zinssatz_prozent).replace(".", ",")} %</td>
              <td className="py-1 pr-2 text-right tabular-nums">{formatBetrag(segment.saldo)}</td>
              <td className="py-1 text-right tabular-nums">{segment.zins.replace(".", ",")} €</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
