/**
 * Tenancy ("Mietverhältnis") and rent history (GH-17, phase 3).
 *
 * Database: `"Mieter_Mietverhaeltnisse"` (one contract for one apartment) and `"Mieter_Mietverhaeltnisse_Mieten"`
 * (rent history, written only through the RPCs `mietverhaeltnis_miete_setzen` / `mietverhaeltnis_miete_entfernen`).
 * `Mieter.mietverhaeltnis_id` links a tenant row to its tenancy; rows without a tenancy keep using `Wohnungen.miete`.
 *
 * Security relevant (permissions, money): not production ready until the maintainer has reviewed it.
 */

import type { FlaechenHinweis } from "@/utils/vertragsflaeche-hinweise";

export type { FlaechenHinweis };

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
  /**
   * Contract area in m² INCLUDING the share of common areas (kitchen, bath, hall) the user agreed on; optional, for flat
   * shares with single contracts. The Abrechnung then splits each day of the apartment by area (area / max(apartment size,
   * sum of the areas present that day), so at most 100 %; the rest is vacancy for the landlord). If any tenant present has no
   * area, that day is split equally among the tenants present, unless the apartment distributes the remaining area to the
   * tenants without area (`Wohnungen.restflaeche_verteilen`); without apartment size always equally (see `analysiereWgVerteilung`).
   * Not versioned: a change also applies to earlier periods when their Abrechnung is calculated again.
   */
  flaeche: number | null;
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
  /** Contract area notes and remaining area option of the apartment; `null` without tenancy. */
  flaechen: FlaechenStand | null;
}

/** Other tenants of the apartment of a tenant (phase 6, several tenants per tenancy). */
export interface MitmieterUebersicht {
  /** Other active tenants of the same tenancy. */
  mitmieter: { mieterId: string; name: string; rolle: "hauptmieter" | "mitmieter" | null }[];
  /** Other tenancies of the same apartment with their active tenants; the tenant could join one of them. */
  kandidaten: { mietverhaeltnisId: string; mieterNamen: string[] }[];
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
  | "MV013"
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

/**
 * Contract areas around a tenancy for the tenant dialog: notes (see `flaechenHinweise`, only tenancies running at the same time)
 * and the remaining area option of the apartment (`Wohnungen.restflaeche_verteilen`, `null` if it could not be read).
 */
export interface FlaechenStand {
  hinweise: FlaechenHinweis[];
  restflaecheVerteilen: boolean | null;
  /** The user may switch the option (`wohnungen: bearbeiten`); set only by the overview. */
  optionAenderbar?: boolean;
}
