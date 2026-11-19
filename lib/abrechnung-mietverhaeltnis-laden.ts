/**
 * Groups the tenants of a Betriebskostenabrechnung by the tenancy that applied in the billing period (GH-17, phase 6).
 *
 * Reads the assignment history `Mieter_Mietverhaeltnis_Zuordnungen` of the tenants (under RLS of the signed-in user),
 * picks for every tenant the tenancy that applied on its reference day and merges the rows that share a tenancy, see
 * `utils/abrechnung-mietverhaeltnis.ts`. The current tenancy (`Mieter.mietverhaeltnis_id`) is deliberately NOT used: a
 * merge in 2026 must not change the settlement of 2025.
 *
 * Reference day: the end of the billing period, or the move-out of the tenant if it lies inside the period. A tenant who
 * changes the tenancy inside the period is settled with the tenancy of its reference day for the whole period (a change
 * inside the period is not split). Without an assignment the tenant is settled on its own, as before.
 *
 * FAIL-SOFT: any error leaves the data as it is (every row on its own, the behaviour before this feature), so a failed
 * read can never block or change a settlement by accident. Only the kind of error is logged. Security relevant (money):
 * not production ready until reviewed.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Mieter, Rechnung } from "@/lib/types";
import { fasseGemeinsameMietverhaeltnisseZusammen } from "@/utils/abrechnung-mietverhaeltnis";

export interface AbrechnungMietverhaeltnisDaten {
  tenants: Mieter[];
  rechnungen: Rechnung[];
}

/** Billing period as ISO dates (`YYYY-MM-DD`, a time part is ignored). */
export interface Abrechnungszeitraum {
  startdatum: unknown;
  enddatum: unknown;
}

interface Zuordnung {
  mietverhaeltnisId: string;
  ab: string;
  bis: string | null;
}

const ISO_DATUM = /^\d{4}-\d{2}-\d{2}/;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const alsDatum = (value: unknown): string | null =>
  typeof value === "string" && ISO_DATUM.test(value) ? value.slice(0, 10) : null;

/** Tenancy of one tenant on its reference day: the assignment covering that day, else the latest one before it in the period. */
function mietverhaeltnisAmStichtag(zuordnungen: Zuordnung[], start: string, stichtag: string): string | null {
  const deckend = zuordnungen.find(z => z.ab <= stichtag && (z.bis === null || z.bis >= stichtag));
  if (deckend) return deckend.mietverhaeltnisId;
  const imZeitraum = zuordnungen
    .filter(z => z.ab <= stichtag && (z.bis === null || z.bis >= start))
    .sort((a, b) => b.ab.localeCompare(a.ab));
  return imZeitraum[0]?.mietverhaeltnisId ?? null;
}

export async function gruppiereNachMietverhaeltnisImZeitraum<T extends AbrechnungMietverhaeltnisDaten>(
  supabase: SupabaseClient,
  daten: T,
  zeitraum: Abrechnungszeitraum,
  log: (code: string) => void = () => {}
): Promise<T> {
  try {
    const tenants = daten.tenants;
    if (!Array.isArray(tenants) || tenants.length < 2) return daten;

    const start = alsDatum(zeitraum.startdatum);
    const ende = alsDatum(zeitraum.enddatum);
    if (!start || !ende || start > ende) {
      log("ZEITRAUM_UNGUELTIG");
      return daten;
    }

    const { data: zeilen, error } = await supabase
      .from("Mieter_Mietverhaeltnis_Zuordnungen")
      .select("mieter_id, mietverhaeltnis_id, gueltig_ab, gueltig_bis")
      .in("mieter_id", tenants.map(tenant => tenant.id));
    if (error || !Array.isArray(zeilen)) {
      log("ZUORDNUNG_NICHT_GELADEN");
      return daten;
    }

    const jeMieter = new Map<string, Zuordnung[]>();
    for (const zeile of zeilen) {
      const record = asRecord(zeile);
      const ab = alsDatum(record?.gueltig_ab);
      if (!record || typeof record.mieter_id !== "string" || typeof record.mietverhaeltnis_id !== "string" || !ab) continue;
      const bis = record.gueltig_bis === null || record.gueltig_bis === undefined ? null : alsDatum(record.gueltig_bis);
      if (record.gueltig_bis !== null && record.gueltig_bis !== undefined && !bis) continue;
      jeMieter.set(record.mieter_id, [...(jeMieter.get(record.mieter_id) ?? []), { mietverhaeltnisId: record.mietverhaeltnis_id, ab, bis }]);
    }

    const imZeitraum = tenants.map(tenant => {
      const auszug = alsDatum(tenant.auszug);
      const stichtag = auszug && auszug >= start && auszug < ende ? auszug : ende;
      return { ...tenant, mietverhaeltnis_id: mietverhaeltnisAmStichtag(jeMieter.get(tenant.id) ?? [], start, stichtag) };
    });
    const ergebnis = fasseGemeinsameMietverhaeltnisseZusammen(imZeitraum, daten.rechnungen ?? []);
    if (ergebnis.zusammengefasst.size === 0) return daten;
    return { ...daten, tenants: ergebnis.tenants, rechnungen: ergebnis.rechnungen };
  } catch {
    log("GRUPPIERUNG_FEHLER");
    return daten;
  }
}
