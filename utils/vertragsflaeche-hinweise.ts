/**
 * Notes on contract areas (GH-17, flat share with single contracts) for the tenant dialog and the Abrechnung. Pure functions,
 * no database access: the callers load the data. The notes only explain the split, they never change it.
 */
import type { WgTagesArt, WgVerteilungJeWohnung } from "./wg-cost-calculations";

/** A tenancy of an apartment with its contract period (ISO dates) and contract area (m², `null` if none). */
export interface VertragMitFlaeche {
  id: string;
  flaeche: number | null;
  beginn: string;
  ende: string | null;
}

/** A note on the contract areas of a tenancy, see `flaechenHinweise`. */
export type FlaechenHinweis =
  /** Tenancies running at the same time add up to more than the apartment at some point (the Abrechnung reduces the shares). */
  | { art: "summe_zu_gross"; summe: number; wohnungsgroesse: number }
  /** Only this tenancy has an area and it is smaller than the apartment: on days it is alone, the rest is vacancy. */
  | { art: "leerstand"; flaeche: number; wohnungsgroesse: number }
  /** Some overlapping tenancies have an area, `ohneFlaeche` have none: equal split on those days, or remaining area if switched on. */
  | { art: "flaeche_fehlt"; ohneFlaeche: number; restflaecheVerteilen: boolean }
  /** Areas are entered, but the apartment has no size: equal split. */
  | { art: "wohnungsgroesse_fehlt" };

const OFFEN = "9999-12-31";
const rund = (wert: number) => Math.round(wert * 100) / 100;
const m2 = (wert: number) => `${wert.toLocaleString("de-DE", { maximumFractionDigits: 2 })} m²`;

/** Whether two tenancies run at the same time on at least one day. */
function ueberschneiden(a: VertragMitFlaeche, b: VertragMitFlaeche): boolean {
  return a.beginn <= (b.ende ?? OFFEN) && b.beginn <= (a.ende ?? OFFEN);
}

/**
 * Notes for one tenancy (`eigeneId`) of an apartment. Only tenancies that run at the same time as this one count (a tenancy that
 * starts after it ends, or ended before it started, is never in the same day). Nothing to say when no tenancy involved has an area.
 */
export function flaechenHinweise(
  eigeneId: string,
  vertraege: readonly VertragMitFlaeche[],
  wohnungsgroesse: number | null,
  restflaecheVerteilen: boolean
): FlaechenHinweis[] {
  const eigen = vertraege.find(v => v.id === eigeneId);
  if (!eigen) return [];
  const andere = vertraege.filter(v => v.id !== eigen.id && ueberschneiden(v, eigen));
  const gruppe = [eigen, ...andere];
  if (gruppe.every(v => v.flaeche === null)) return [];
  if (!wohnungsgroesse || !(wohnungsgroesse > 0)) return [{ art: "wohnungsgroesse_fehlt" }];

  const hinweise: FlaechenHinweis[] = [];

  // Largest sum of areas on one day within this tenancy: the sum only rises at the start of a tenancy, so the start days suffice
  const eigenEnde = eigen.ende ?? OFFEN;
  let groessteSumme = 0;
  for (const tag of gruppe.map(v => (v.beginn > eigen.beginn ? v.beginn : eigen.beginn))) {
    if (tag > eigenEnde) continue;
    const summe = gruppe
      .filter(v => v.beginn <= tag && (v.ende ?? OFFEN) >= tag)
      .reduce((acc, v) => acc + (v.flaeche ?? 0), 0);
    groessteSumme = Math.max(groessteSumme, rund(summe));
  }
  if (groessteSumme > wohnungsgroesse) hinweise.push({ art: "summe_zu_gross", summe: groessteSumme, wohnungsgroesse });

  if (eigen.flaeche !== null && eigen.flaeche < wohnungsgroesse && andere.every(v => v.flaeche === null)) {
    hinweise.push({ art: "leerstand", flaeche: eigen.flaeche, wohnungsgroesse });
  }

  const ohneFlaeche = gruppe.filter(v => v.flaeche === null).length;
  if (ohneFlaeche > 0) hinweise.push({ art: "flaeche_fehlt", ohneFlaeche, restflaecheVerteilen });

  return hinweise;
}

/** German text of a note for the tenant dialog. */
export function flaechenHinweisText(hinweis: FlaechenHinweis): string {
  switch (hinweis.art) {
    case "summe_zu_gross":
      return `Gleichzeitig laufende Mietverhältnisse dieser Wohnung haben zusammen bis zu ${m2(hinweis.summe)}, die Wohnung hat ${m2(hinweis.wohnungsgroesse)}. In der Abrechnung werden die Anteile gekürzt, sodass höchstens 100 % verteilt werden.`;
    case "leerstand":
      return `Nur dieses Mietverhältnis hat eine Vertragsfläche (${m2(hinweis.flaeche)} von ${m2(hinweis.wohnungsgroesse)}). An Tagen, an denen es allein in der Wohnung ist, trägt es nur diesen Anteil der Wohnungskosten; den Rest trägt der Vermieter als Leerstand.`;
    case "flaeche_fehlt": {
      const anzahl = hinweis.ohneFlaeche === 1 ? "Ein gleichzeitig laufendes Mietverhältnis dieser Wohnung hat" : `${hinweis.ohneFlaeche} gleichzeitig laufende Mietverhältnisse dieser Wohnung haben`;
      return hinweis.restflaecheVerteilen
        ? `${anzahl} keine Vertragsfläche. Die Restfläche der Wohnung wird gleich auf die Mietverhältnisse ohne Fläche verteilt (Restflächen-Option der Wohnung).`
        : `${anzahl} keine Vertragsfläche. An Tagen, an denen ein Mietverhältnis ohne Fläche anwesend ist, werden die Wohnungskosten gleich je Mitbewohner verteilt; die Vertragsflächen wirken dann nicht.`;
    }
    case "wohnungsgroesse_fehlt":
      return "Die Wohnung hat keine Größe. Ohne Größe werden die Wohnungskosten gleich je Mitbewohner verteilt; die Vertragsflächen wirken nicht.";
  }
}

const ABRECHNUNG_TEXTE: Partial<Record<WgTagesArt, (tage: string) => string>> = {
  gleich_flaeche_fehlt: tage => `An ${tage} wurde gleich je Mitbewohner verteilt, weil nicht alle anwesenden Mietverhältnisse eine Vertragsfläche haben.`,
  gleich_wohnungsgroesse_fehlt: tage => `An ${tage} wurde gleich je Mitbewohner verteilt, weil die Wohnung keine Größe hat.`,
  restflaeche: tage => `An ${tage} wurde die Restfläche gleich auf die Mietverhältnisse ohne Vertragsfläche verteilt (Restflächen-Option der Wohnung; Zulässigkeit rechtlich zu klären).`,
  gleich_restflaeche_aufgebraucht: tage => `An ${tage} blieb keine Restfläche für die Mietverhältnisse ohne Vertragsfläche übrig (die Vertragsflächen füllen die Wohnung); diese Tage wurden gleich je Mitbewohner verteilt.`,
  flaeche_leerstand: tage => `An ${tage} deckten die Vertragsflächen der anwesenden Mietverhältnisse die Wohnung nicht ganz; der Rest ist Leerstand und wird nicht umgelegt.`,
};

/**
 * Notes for the Abrechnung of one apartment: why contract areas had no effect on some days or where the remaining area went.
 * Empty when the split was the plain one (equally without areas, or fully by area).
 */
export function wgVerteilungHinweise(tage: WgVerteilungJeWohnung | undefined, rechentage: boolean): string[] {
  if (!tage) return [];
  const einheit = (anzahl: number) => (rechentage ? `${anzahl} ${anzahl === 1 ? "Rechentag" : "Rechentagen"}` : `${anzahl} ${anzahl === 1 ? "Tag" : "Tagen"}`);
  return (Object.keys(ABRECHNUNG_TEXTE) as WgTagesArt[])
    .filter(art => (tage[art] ?? 0) > 0)
    .map(art => ABRECHNUNG_TEXTE[art]!(einheit(tage[art]!)));
}
