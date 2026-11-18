/**
 * Applies the settlement mode of the tenancies to the data of a Betriebskostenabrechnung (GH-17, phase 6).
 *
 * Reads `Mieter.mietverhaeltnis_id` of the tenants and `Mieter_Mietverhaeltnisse.abrechnungsmodus` (both under
 * RLS of the signed-in user) and merges the rows of tenancies in mode `gemeinsam` into one tenant, see
 * `utils/abrechnung-mietverhaeltnis.ts`. FAIL-SOFT: any error leaves the data as it is (every row on its own,
 * the behaviour before this feature), so a failed read can never block or change a settlement by accident.
 * Only the kind of error is logged. Security relevant (money): not production ready until reviewed.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Mieter, Rechnung } from "@/lib/types";
import { fasseGemeinsameMietverhaeltnisseZusammen, type Abrechnungsmodus } from "@/utils/abrechnung-mietverhaeltnis";

export interface AbrechnungMietverhaeltnisDaten {
  tenants: Mieter[];
  rechnungen: Rechnung[];
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

export async function wendeAbrechnungsmodusAn<T extends AbrechnungMietverhaeltnisDaten>(
  supabase: SupabaseClient,
  daten: T,
  log: (code: string) => void = () => {}
): Promise<T> {
  try {
    const tenants = daten.tenants;
    if (!Array.isArray(tenants) || tenants.length < 2) return daten;

    const { data: mieterZeilen, error: mieterFehler } = await supabase
      .from("Mieter")
      .select("id, mietverhaeltnis_id")
      .in("id", tenants.map(tenant => tenant.id));
    if (mieterFehler || !Array.isArray(mieterZeilen)) {
      log("MIETVERHAELTNIS_NICHT_GELADEN");
      return daten;
    }
    const mvJeMieter = new Map<string, string>();
    for (const zeile of mieterZeilen) {
      const record = asRecord(zeile);
      if (record && typeof record.id === "string" && typeof record.mietverhaeltnis_id === "string") {
        mvJeMieter.set(record.id, record.mietverhaeltnis_id);
      }
    }
    const mvIds = Array.from(new Set(mvJeMieter.values()));
    // Only tenancies with at least two rows can be merged: skip the second query otherwise
    const zeilenJeMv = new Map<string, number>();
    for (const mvId of mvJeMieter.values()) zeilenJeMv.set(mvId, (zeilenJeMv.get(mvId) ?? 0) + 1);
    const kandidaten = mvIds.filter(mvId => (zeilenJeMv.get(mvId) ?? 0) >= 2);
    if (kandidaten.length === 0) return daten;

    const { data: mvZeilen, error: mvFehler } = await supabase
      .from("Mieter_Mietverhaeltnisse")
      .select("id, abrechnungsmodus")
      .in("id", kandidaten);
    if (mvFehler || !Array.isArray(mvZeilen)) {
      log("ABRECHNUNGSMODUS_NICHT_GELADEN");
      return daten;
    }
    const modi = new Map<string, Abrechnungsmodus>();
    for (const zeile of mvZeilen) {
      const record = asRecord(zeile);
      if (record && typeof record.id === "string" && record.abrechnungsmodus === "gemeinsam") modi.set(record.id, "gemeinsam");
    }
    if (modi.size === 0) return daten;

    const mitMietverhaeltnis = tenants.map(tenant => ({ ...tenant, mietverhaeltnis_id: mvJeMieter.get(tenant.id) ?? null }));
    const ergebnis = fasseGemeinsameMietverhaeltnisseZusammen(mitMietverhaeltnis, modi, daten.rechnungen ?? []);
    if (ergebnis.zusammengefasst.size === 0) return daten;
    return { ...daten, tenants: ergebnis.tenants, rechnungen: ergebnis.rechnungen };
  } catch {
    log("ABRECHNUNGSMODUS_FEHLER");
    return daten;
  }
}
