/**
 * Tenancy ("Mietverhältnis") and rent history (GH-17, phase 3).
 *
 * Database: `"Mieter_Mietverhaeltnisse"` (one contract for one apartment) and `"Mieter_Mietverhaeltnisse_Mieten"`
 * (rent history, written only through the RPCs `mietverhaeltnis_miete_setzen` / `mietverhaeltnis_miete_entfernen`).
 * `Mieter.mietverhaeltnis_id` links a tenant row to its tenancy; rows without a tenancy keep using `Wohnungen.miete`.
 *
 * Security relevant (permissions, money): not production ready until the maintainer has reviewed it.
 */

/** One entry of the rent history. `gueltig_ab` is an ISO date (YYYY-MM-DD), `betrag` is the monthly rent in euro. */
export interface MietEintrag {
  miete_id: string;
  gueltig_ab: string;
  betrag: number;
  aenderungsart: string;
  grund: string | null;
  /** Date of the declaration of the change (`erklaert_am`), `null` if not recorded. Not returned by the RPC; the actions add it. */
  erklaert_am: string | null;
  quelle: "app" | "migration_bestand";
}

/** Minimal shape the rent lookup needs; lets callers pass rows read directly from the table. */
export type MietEintragKurz = Pick<MietEintrag, "gueltig_ab" | "betrag">;

/** Contract data of a tenancy as shown in the tenant dialog. */
export interface Mietverhaeltnis {
  id: string;
  wohnung_id: string;
  vertragsbeginn: string;
  vertragsende: string | null;
  befristet_bis: string | null;
  kuendigung_eingang_am: string | null;
  kuendigung_zum: string | null;
  kuendigung_durch: "mieter" | "vermieter" | null;
  abrechnungsmodus: "je_mieter" | "gemeinsam";
  vertrag_dokument_id: string | null;
  notiz: string | null;
  quelle: "app" | "migration_bestand";
}

/** What the tenant dialog loads: the tenancy of a tenant (or null) and its rent history, newest first. */
export interface MietverhaeltnisUebersicht {
  mietverhaeltnis: Mietverhaeltnis | null;
  mieten: MietEintrag[];
  /** `Wohnungen.miete` of the tenant's apartment; used when the history has no entry for a date. */
  wohnungsmiete: number | null;
  /** `Mieter.einzug` (ISO date) of the tenant, used to pre-fill the contract start. */
  mieterEinzug: string | null;
  /** `Mieter.status` is `bewerber`: no tenancy is created for applicants. */
  istBewerber: boolean;
}

/** Stable error codes of the tenancy functions (SQLSTATE of the database, `42501` for missing permission or scope). */
export type MietverhaeltnisFehlerCode =
  | "MV001"
  | "MV003"
  | "MV004"
  | "MV005"
  | "MV006"
  | "MV007"
  | "MV008"
  | "MV009"
  | "MV010"
  | "MV011"
  | "MV012"
  | "42501"
  | "23503"
  | "UNBEKANNT";

export interface MietverhaeltnisActionError {
  message: string;
  code: MietverhaeltnisFehlerCode;
}

export type MietverhaeltnisActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: MietverhaeltnisActionError };
