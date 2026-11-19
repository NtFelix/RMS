/**
 * Abrechnung per tenancy (GH-17, phase 6).
 *
 * A tenancy ("Mietverhältnis") can have several tenant rows (a couple, a flat share with one contract). Whoever is
 * assigned to the same tenancy is settled together: the rows of the tenancy are merged into ONE tenant before the
 * calculation, so the Abrechnung (all distributions, prepayments, meter costs) runs once per tenancy. There is no
 * separate switch. Today every person has an own tenancy, so this is the same as one settlement per tenant row.
 *
 * `mietverhaeltnis_id` of the rows must be the tenancy that applied in the billing period, not the current one
 * (the loader in `lib/abrechnung-mietverhaeltnis-laden.ts` sets it from the assignment history). A later merge
 * therefore never changes the settlement of an earlier year.
 *
 * The merge is a plain data step in front of the unchanged calculation. Rules of the merged tenant (technical,
 * not legal; who the addressee of a shared settlement is, and whether it is allowed, is a legal question):
 *
 *  - `id`: the ID of the first row (earliest move-in, then smallest ID). Invoices (`Rechnung.mieter_id`) of the
 *    other rows are re-assigned to it. Invoices of the merged tenant with the same cost item (same settlement,
 *    same name) are added up into one, because the calculation takes only one invoice per tenant and cost item.
 *  - `name`: the names of the rows, joined with ", ".
 *  - `einzug`: the earliest move-in of the rows that have one. `auszug`: empty while any row with a move-in
 *    date is still living there, otherwise the latest move-out. Gaps between the rows are not detected, the
 *    tenancy counts as one continuous stay (a change of person inside one contract has no gap).
 *  - `nebenkosten` (Soll prepayments): the step functions of the rows are added up, each row only while it
 *    lives in the tenancy (so a person who left no longer counts). A change inside a month is not prorated.
 *  - "pro Mieter" distributions count the tenancy once (one merged tenant, not its persons).
 *
 * Rows without apartment, rows of different apartments and rows without a tenancy stay untouched. Security
 * relevant (money): not production ready until the maintainer has reviewed it.
 */
import type { Mieter, Rechnung } from "@/lib/types";

export interface ZusammenfassungErgebnis {
  tenants: Mieter[];
  rechnungen: Rechnung[];
  /** Merged tenant ID mapped to the IDs of the rows it replaced (including its own), only for merged tenancies. */
  zusammengefasst: Map<string, string[]>;
}

const roundCents = (value: number): number => Math.round(value * 100) / 100;

/** Rows in a stable order: earliest move-in first (no move-in last), then by ID. */
function sortiere(rows: Mieter[]): Mieter[] {
  return [...rows].sort((a, b) => {
    if (a.einzug && b.einzug && a.einzug !== b.einzug) return a.einzug.localeCompare(b.einzug);
    if (!a.einzug !== !b.einzug) return a.einzug ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

/** Day after an ISO date (`YYYY-MM-DD`), as ISO date. */
function tagDanach(iso: string): string {
  const datum = new Date(`${iso}T00:00:00Z`);
  datum.setUTCDate(datum.getUTCDate() + 1);
  return datum.toISOString().slice(0, 10);
}

/**
 * Sum of the prepayment schedules of several rows, newest entry first. A row only counts while it lives in the
 * tenancy (move-in to move-out): after a change of person the schedule of the person who left ends. Changes
 * happen on the dates of the entries, the move-ins and the day after the move-outs. As in the calculation the
 * amount of a month is the one valid at the end of the billed part of that month, a change inside a month is
 * therefore not prorated. `null` if no row has a schedule.
 */
function summiereVorauszahlungen(rows: Mieter[], id: string): Mieter["nebenkosten"] {
  const plaene = rows.map(row => ({
    einzug: row.einzug ? row.einzug.slice(0, 10) : null,
    auszug: row.auszug ? row.auszug.slice(0, 10) : null,
    eintraege: (Array.isArray(row.nebenkosten) ? row.nebenkosten : [])
      .filter(eintrag => eintrag.date)
      .map(eintrag => ({ date: eintrag.date.slice(0, 10), amount: Number(eintrag.amount) || 0 }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }));
  if (plaene.every(plan => plan.eintraege.length === 0)) return null;

  const daten = new Set<string>();
  for (const plan of plaene) {
    if (!plan.einzug) continue;
    for (const eintrag of plan.eintraege) daten.add(eintrag.date);
    daten.add(plan.einzug);
    if (plan.auszug) daten.add(tagDanach(plan.auszug));
  }
  const betragAm = (date: string): number => {
    let summe = 0;
    for (const plan of plaene) {
      if (!plan.einzug || date < plan.einzug || (plan.auszug && date > plan.auszug)) continue;
      const gueltig = plan.eintraege.filter(eintrag => eintrag.date <= date).pop();
      if (gueltig) summe += gueltig.amount;
    }
    return roundCents(summe);
  };
  const schritte = Array.from(daten).sort().map(date => ({ date, amount: betragAm(date) }));
  // Leading zeros (before any prepayment applies) carry no information
  const erster = schritte.findIndex(schritt => schritt.amount !== 0);
  if (erster < 0) return null;
  return schritte
    .slice(erster)
    .map(schritt => ({ id: `${id}-nk-${schritt.date}`, date: schritt.date, amount: String(schritt.amount) }))
    .reverse();
}

/** Merges the rows of one tenancy into one tenant (see the file header for the rules). */
function fasseZusammen(rows: Mieter[]): Mieter {
  const sortiert = sortiere(rows);
  const erste = sortiert[0];
  const mitEinzug = sortiert.filter(row => row.einzug);
  const einzug = mitEinzug.length > 0 ? mitEinzug[0].einzug : null;
  const nochDa = mitEinzug.some(row => !row.auszug);
  const auszuege = mitEinzug.map(row => row.auszug).filter((datum): datum is string => Boolean(datum)).sort();
  const auszug = mitEinzug.length === 0 || nochDa ? null : (auszuege[auszuege.length - 1] ?? null);
  return {
    ...erste,
    name: sortiert.map(row => row.name).join(", "),
    einzug,
    auszug,
    nebenkosten: summiereVorauszahlungen(sortiert, erste.id),
  };
}

/**
 * Re-assigns the invoices of merged rows to the merged tenant. Several invoices of the merged tenant for the same
 * cost item (same `nebenkosten_id` and `name`) become ONE invoice with the summed amount, so nothing is dropped.
 */
function haengeRechnungenUm(rechnungen: Rechnung[], ersetzung: ReadonlyMap<string, string>): Rechnung[] {
  const ergebnis: Rechnung[] = [];
  const summiert = new Map<string, number>(); // key -> index in `ergebnis`
  for (const rechnung of rechnungen) {
    const neueId = rechnung.mieter_id ? ersetzung.get(rechnung.mieter_id) : undefined;
    if (!neueId) {
      ergebnis.push(rechnung);
      continue;
    }
    const schluessel = `${neueId}|${rechnung.nebenkosten_id}|${rechnung.name}`;
    const vorhanden = summiert.get(schluessel);
    if (vorhanden === undefined) {
      summiert.set(schluessel, ergebnis.length);
      ergebnis.push({ ...rechnung, mieter_id: neueId });
    } else {
      const bisher = ergebnis[vorhanden];
      ergebnis[vorhanden] = { ...bisher, betrag: roundCents((Number(bisher.betrag) || 0) + (Number(rechnung.betrag) || 0)) };
    }
  }
  return ergebnis;
}

/**
 * Merges the rows of every tenancy with at least two rows in the same apartment; everything else is returned
 * unchanged (same objects, same order position of the first row).
 */
export function fasseGemeinsameMietverhaeltnisseZusammen(tenants: Mieter[], rechnungen: Rechnung[] = []): ZusammenfassungErgebnis {
  const gruppen = new Map<string, Mieter[]>();
  for (const tenant of tenants) {
    const mvId = tenant.mietverhaeltnis_id;
    if (!mvId || !tenant.wohnung_id) continue;
    const schluessel = `${mvId}|${tenant.wohnung_id}`;
    gruppen.set(schluessel, [...(gruppen.get(schluessel) ?? []), tenant]);
  }
  const zuMergen = new Map<string, Mieter[]>(Array.from(gruppen).filter(([, rows]) => rows.length >= 2));
  if (zuMergen.size === 0) return { tenants, rechnungen, zusammengefasst: new Map() };

  const zusammengefasst = new Map<string, string[]>();
  const ersetzung = new Map<string, string>(); // row ID -> merged tenant ID
  const ergebnis: Mieter[] = [];
  const fertig = new Set<string>();
  for (const tenant of tenants) {
    const schluessel = `${tenant.mietverhaeltnis_id}|${tenant.wohnung_id}`;
    const rows = zuMergen.get(schluessel);
    if (!rows) {
      ergebnis.push(tenant);
      continue;
    }
    if (fertig.has(schluessel)) continue;
    fertig.add(schluessel);
    const merged = fasseZusammen(rows);
    zusammengefasst.set(merged.id, rows.map(row => row.id));
    for (const row of rows) ersetzung.set(row.id, merged.id);
    ergebnis.push(merged);
  }
  return { tenants: ergebnis, rechnungen: haengeRechnungenUm(rechnungen, ersetzung), zusammengefasst };
}
