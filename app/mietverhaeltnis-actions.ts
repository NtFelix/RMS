"use server";

/**
 * Server actions of the tenancy and rent history ("Mietverhältnis", GH-17, phases 3B, 4 and 5).
 *
 * Principles:
 * - Thin actions: sign-in check -> module right (`hasPermission('mieter', ...)`, writes also `ansehen`; fast
 *   failure, the database stays authoritative) -> input validation -> database access -> error mapping
 *   (`lib/mietverhaeltnis-errors.ts`) -> `revalidatePath` for writes -> log.
 * - Tenancy creation and rent entries (including changes of the rent) are written ONLY through RPCs
 *   (`mietverhaeltnis_anlegen`, `mietverhaeltnis_miete_setzen`, `mietverhaeltnis_miete_entfernen`). No `.insert()` or `.delete()` on the tenancy tables here.
 * - The ONLY direct write to a tenancy table is `vertragsdatenSpeichernAction`: a `.update()` on
 *   `"Mieter_Mietverhaeltnisse"` for seven contract columns (RLS applies). Rent history is never written that way.
 *   `restflaecheVerteilenSetzenAction` writes one column of the apartment (`Wohnungen.restflaeche_verteilen`, RLS applies).
 * - The tenancy ID is never taken from the client: it is read from the tenant row on the server.
 * - Amounts are validated strictly and sent as exact decimal strings (two decimal places, no rounding).
 * - No personal data, amounts or IDs in logs: only the action name, the event and the error code.
 * - Expected errors are returned as `{ success: false, error: { message, code } }`, not thrown. Messages are German
 *   (formal address) and come from `lib/mietverhaeltnis-errors.ts`.
 *
 * Security relevant (permissions, money): not production ready until the maintainer has reviewed it.
 * The database is authoritative: the RPCs and RLS check organisation, right and object scope themselves.
 *
 * "use server" file: only async functions are exported as values (types are erased).
 */

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureAuth } from "@/lib/auth-utils";
import { MIETER_PERSON_EMBED, personAnzeigename, type Person } from "@/lib/personen";
import { hasPermission } from "@/lib/permissions";
import { getAccessibleWohnungIds } from "@/lib/object-scope";
import { logAction } from "@/lib/logging-middleware";
import { mapMietverhaeltnisError, mietverhaeltnisFehler, MIETVERHAELTNIS_FEHLER_FALLBACK_MESSAGE } from "@/lib/mietverhaeltnis-errors";
import { flaechenHinweise, type VertragMitFlaeche } from "@/utils/vertragsflaeche-hinweise";
import type {
  FlaechenStand,
  MietEintrag,
  Mietverhaeltnis,
  MietverhaeltnisActionError,
  MietverhaeltnisActionResult,
  MietverhaeltnisUebersicht,
  MitmieterUebersicht,
} from "@/types/Mietverhaeltnis";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MieteSetzenInput {
  mieterId: string;
  /** Valid from `YYYY-MM-DD`. A rent of the same date is replaced by the database. */
  gueltigAb: string;
  /** Monthly rent in euro, 0 to 99999999.99, at most two decimal places. */
  betrag: number;
  /** Optional reason, trimmed, at most 500 characters. Empty = `null`. */
  grund?: string | null;
}

export interface MieteEntfernenInput {
  mieterId: string;
  /** Entry of the rent history of the tenancy of this tenant. */
  mieteId: string;
}

export interface MietverhaeltnisAnlegenInput {
  mieterId: string;
  /** ISO date. Omitted or `null`: the database uses the move-in date of the tenant (`Mieter.einzug`). */
  vertragsbeginn?: string | null;
  /** Monthly rent in euro, the first rent entry from the start date. Omitted or `null`: no rent entry. */
  miete?: number | null;
}

/** Contract data of the tenancy. `null` clears a field; every key must be present. */
export interface VertragsdatenSpeichernInput {
  mieterId: string;
  vertragsende: string | null;
  befristetBis: string | null;
  kuendigungEingangAm: string | null;
  kuendigungZum: string | null;
  kuendigungDurch: "mieter" | "vermieter" | null;
  notiz: string | null;
  /** Contract area in m² incl. the share of common areas (flat share with single contracts), `null` for none. */
  flaeche: number | null;
}

/** Move of a tenant with a tenancy into another apartment. The database ends the old tenancy the day before. */
export interface MieterUmzugInput {
  mieterId: string;
  /** Target apartment; must differ from the current one and lie inside the object scope. */
  wohnungId: string;
  /** Move date (`YYYY-MM-DD`). The old tenancy ends the day before; it must start before this date. */
  datum: string;
  /** Monthly rent of the new tenancy from the move date, same rules as `betrag` of `mieteSetzen`. Omitted or `null`: no entry, the apartment rent applies. */
  miete?: number | null;
}

/** A tenant joins an existing tenancy of the same apartment (several tenants in one contract). */
export interface MieterZusammenfuehrenInput {
  mieterId: string;
  /** Target tenancy; must belong to the same apartment as the tenant. */
  zielMietverhaeltnisId: string;
  /** Date from which the tenant belongs to the target tenancy (`YYYY-MM-DD`). The old tenancy of the tenant ends the day before. */
  datum: string;
  /** Optional role (info field only). Omitted or `null`: unchanged. */
  rolle?: "hauptmieter" | "mitmieter" | null;
}

/** A tenant leaves a shared tenancy and gets an own tenancy in the same apartment. */
export interface MieterTrennenInput {
  mieterId: string;
  /** Start of the own tenancy (`YYYY-MM-DD`). */
  datum: string;
  /** Monthly rent of the own tenancy from the start date, same rules as `betrag` of `mieteSetzen`. Omitted or `null`: no entry. */
  miete?: number | null;
  /** Contract area of the own tenancy in m² (same rules as `flaeche` of `vertragsdatenSpeichern`). Omitted or `null`: none. */
  flaecheNeu?: number | null;
  /** New contract area of the shared tenancy that continues for the others. Omitted or `null`: unchanged. */
  flaecheBisher?: number | null;
}

/** Remaining area option of the apartment of a tenant (`Wohnungen.restflaeche_verteilen`). */
export interface RestflaecheVerteilenSetzenInput {
  mieterId: string;
  wert: boolean;
}

/** Module right actions used here. */
type MieterAktion = "ansehen" | "bearbeiten" | "erstellen";

type Step<T> = { ok: true; data: T } | { ok: false; error: MietverhaeltnisActionError };

/**
 * Tenant data the actions need: tenancy link, apartment rent and move-in date. Applicants are not in "Mieter"
 * (they live in "Bewerber"), so a Mieter row is never an applicant.
 */
interface MieterDaten {
  mietverhaeltnisId: string | null;
  wohnungId: string | null;
  wohnungsmiete: number | null;
  einzug: string | null;
  istBewerber: boolean;
}

// ---------------------------------------------------------------------------
// Constants and helpers (not exported: a "use server" file only exports async actions)
// ---------------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Lower and upper limit of the database for dates (ISO strings compare correctly). */
const MIN_DATUM = "1900-01-01";
const MAX_DATUM = "2100-12-31";
const BETRAG_MAX = 99999999.99;
const GRUND_MAX_LAENGE = 500;
const NOTIZ_MAX_LAENGE = 2000;
/** Upper limit of a contract area in m², as the CHECK in the database. */
const FLAECHE_MAX = 100000;
/** Change type of entries entered in the rent form (the database default). */
const AENDERUNGSART = "vereinbarung";
/** Start of the message `ensureAuth` throws for "not signed in" (`lib/auth-utils.ts`). */
const NOT_SIGNED_IN_MESSAGE_PREFIX = "Nicht authentifiziert";

const MIETVERHAELTNIS_SPALTEN =
  "id, wohnung_id, vertragsbeginn, vertragsende, befristet_bis, kuendigung_eingang_am, kuendigung_zum, kuendigung_durch, flaeche, vertrag_dokument_id, notiz, quelle";

function fail<T>(error: MietverhaeltnisActionError): Step<T> {
  return { ok: false, error };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function istUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** ISO date `YYYY-MM-DD` as a real calendar day within the database limits, or `null`. */
function pruefeIsoDatum(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDay = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isRealDay || value < MIN_DATUM || value > MAX_DATUM) return null;
  return value;
}

/**
 * Date field of a contract: `null` clears it, a valid ISO date is kept. Anything else (also `undefined`, `""`)
 * is `undefined` (invalid), so a missing key can never clear a value by accident.
 */
function pruefeDatumFeld(value: unknown): string | null | undefined {
  if (value === null) return null;
  return pruefeIsoDatum(value) ?? undefined;
}

/**
 * Monthly rent as exact decimal string (`"1234.50"`), or `null`. Rejects NaN, infinity, negative values, values
 * above the database limit and more than two decimal places (no silent rounding).
 */
function pruefeBetrag(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > BETRAG_MAX) return null;
  const cents = Math.round(value * 100);
  if (Math.abs(value * 100 - cents) > 1e-6) return null;
  const euro = Math.trunc(cents / 100);
  return `${euro}.${String(cents % 100).padStart(2, "0")}`;
}

/**
 * Free text: `null` for `null`/`undefined`/empty after trimming, trimmed text up to `maxLaenge` characters,
 * `undefined` if the value is invalid.
 */
function pruefeFreitext(value: unknown, maxLaenge: number): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (text === "") return null;
  if (Array.from(text).length > maxLaenge) return undefined;
  return text;
}

/** Type of termination: `null` (no statement) or one of the two values, otherwise `undefined`. */
function pruefeKuendigungDurch(value: unknown): "mieter" | "vermieter" | null | undefined {
  if (value === null) return null;
  if (value === "mieter" || value === "vermieter") return value;
  return undefined;
}

/** Contract area in m²: `null` (no statement) or a number above 0 up to 100000 with at most two decimals, otherwise `undefined`. */
function pruefeFlaeche(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > FLAECHE_MAX) return undefined;
  const hundertstel = Math.round(value * 100);
  if (Math.abs(value * 100 - hundertstel) > 1e-6) return undefined;
  return hundertstel / 100;
}

/** A number from the database (`numeric` may come back as a string), `null` if missing or not finite. */
function alsZahl(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const zahl = typeof value === "number" ? value : Number(value);
  return Number.isFinite(zahl) ? zahl : null;
}

/**
 * Contract area notes of a tenancy (only tenancies of the apartment running at the same time count, see `flaechenHinweise`) and
 * the remaining area option of the apartment. Read under RLS; any read problem simply gives no notes (never an error: the
 * notes only explain the split of the Abrechnung).
 */
async function ladeFlaechenStand(supabase: SupabaseClient, wohnungId: string | null, mietverhaeltnisId: string): Promise<FlaechenStand> {
  const leer: FlaechenStand = { hinweise: [], restflaecheVerteilen: null };
  if (!wohnungId) return leer;
  try {
    const [wohnung, vertraege, mieter] = await Promise.all([
      supabase.from("Wohnungen").select("groesse, restflaeche_verteilen").eq("id", wohnungId).maybeSingle(),
      supabase.from("Mieter_Mietverhaeltnisse").select("id, flaeche, vertragsbeginn, vertragsende").eq("wohnung_id", wohnungId),
      supabase.from("Mieter").select("mietverhaeltnis_id, auszug").eq("wohnung_id", wohnungId),
    ]);
    const wohnungRecord = asRecord(wohnung.data);
    if (wohnung.error || !wohnungRecord || vertraege.error || !Array.isArray(vertraege.data)) return leer;
    const restflaecheVerteilen = wohnungRecord.restflaeche_verteilen === true;
    // The Abrechnung counts a tenancy by the move-in and move-out of its tenants: when all its tenants have moved out, the
    // tenancy ends for the notes at the last move-out, even without a contract end. Without tenant rows (or if they cannot
    // be read) the contract dates apply.
    const auszugJeVertrag = new Map<string, string | null>();
    if (!mieter.error && Array.isArray(mieter.data)) {
      for (const zeile of mieter.data) {
        const record = asRecord(zeile);
        if (!record || typeof record.mietverhaeltnis_id !== "string") continue;
        const auszug = typeof record.auszug === "string" ? record.auszug.slice(0, 10) : null;
        const bisher = auszugJeVertrag.get(record.mietverhaeltnis_id);
        // null = at least one tenant has not moved out
        auszugJeVertrag.set(record.mietverhaeltnis_id, bisher === null || auszug === null ? null : bisher === undefined || auszug > bisher ? auszug : bisher);
      }
    }
    const liste: VertragMitFlaeche[] = [];
    for (const zeile of vertraege.data) {
      const record = asRecord(zeile);
      if (!record || typeof record.id !== "string" || typeof record.vertragsbeginn !== "string") continue;
      const flaeche = alsZahl(record.flaeche);
      const vertragsende = typeof record.vertragsende === "string" ? record.vertragsende.slice(0, 10) : null;
      const letzterAuszug = auszugJeVertrag.get(record.id) ?? null;
      liste.push({
        id: record.id,
        flaeche: flaeche !== null && flaeche > 0 ? flaeche : null,
        beginn: record.vertragsbeginn.slice(0, 10),
        ende: letzterAuszug !== null && (vertragsende === null || letzterAuszug < vertragsende) ? letzterAuszug : vertragsende,
      });
    }
    return { hinweise: flaechenHinweise(mietverhaeltnisId, liste, alsZahl(wohnungRecord.groesse), restflaecheVerteilen), restflaecheVerteilen };
  } catch (error) {
    unstable_rethrow(error);
    return leer;
  }
}

/** Rows of `get_mietverhaeltnis_mieten` as typed entries. `null` if the shape is not as expected. */
function parseMietenRows(data: unknown): MietEintrag[] | null {
  if (data === null || data === undefined) return [];
  if (!Array.isArray(data)) return null;
  const eintraege: MietEintrag[] = [];
  for (const row of data) {
    const record = asRecord(row);
    if (!record || typeof record.miete_id !== "string" || typeof record.gueltig_ab !== "string") return null;
    const betrag = typeof record.betrag === "number" ? record.betrag : Number(record.betrag);
    if (!Number.isFinite(betrag)) return null;
    eintraege.push({
      miete_id: record.miete_id,
      gueltig_ab: record.gueltig_ab,
      betrag,
      aenderungsart: typeof record.aenderungsart === "string" ? record.aenderungsart : "",
      grund: typeof record.grund === "string" ? record.grund : null,
      // The RPC does not return the declaration date; `uebersichtLaden` adds it.
      erklaert_am: null,
      quelle: record.quelle === "migration_bestand" ? "migration_bestand" : "app",
    });
  }
  return eintraege;
}

/** `Wohnungen(miete)` comes back as an object or, depending on the relation, as an array. */
function parseWohnungsmiete(wohnungen: unknown): number | null {
  const eintrag = Array.isArray(wohnungen) ? wohnungen[0] : wohnungen;
  const miete = asRecord(eintrag)?.miete;
  if (miete === null || miete === undefined) return null;
  const betrag = typeof miete === "number" ? miete : Number(miete);
  return Number.isFinite(betrag) ? betrag : null;
}

/**
 * Reads the tenant row (tenancy link, apartment rent, move-in date, applicant flag) in one query and checks the
 * object scope: a user who is restricted to certain houses only reaches tenants of their apartments (`42501`
 * otherwise, same as the database).
 */
async function ladeMieter(supabase: SupabaseClient, mieterId: string): Promise<Step<MieterDaten>> {
  const { data, error } = await supabase
    .from("Mieter")
    .select("id, mietverhaeltnis_id, wohnung_id, einzug, Wohnungen(miete)")
    .eq("id", mieterId)
    .maybeSingle();
  if (error) return fail(mapMietverhaeltnisError(error));
  const record = asRecord(data);
  if (!record) return fail(mietverhaeltnisFehler("MV003"));
  const wohnungIds = await getAccessibleWohnungIds();
  if (wohnungIds !== null && (typeof record.wohnung_id !== "string" || !wohnungIds.includes(record.wohnung_id))) {
    return fail(mietverhaeltnisFehler("42501"));
  }
  return {
    ok: true,
    data: {
      mietverhaeltnisId: typeof record.mietverhaeltnis_id === "string" ? record.mietverhaeltnis_id : null,
      wohnungId: typeof record.wohnung_id === "string" ? record.wohnung_id : null,
      wohnungsmiete: parseWohnungsmiete(record.Wohnungen),
      einzug: typeof record.einzug === "string" ? record.einzug : null,
      istBewerber: false,
    },
  };
}

/** Reads the rent history of a tenancy through the RPC (the database checks the right). */
async function ladeHistorie(supabase: SupabaseClient, mietverhaeltnisId: string): Promise<Step<MietEintrag[]>> {
  const { data, error } = await supabase.rpc("get_mietverhaeltnis_mieten", { p_mietverhaeltnis_id: mietverhaeltnisId });
  if (error) return fail(mapMietverhaeltnisError(error));
  const eintraege = parseMietenRows(data);
  if (!eintraege) return fail(mietverhaeltnisFehler("UNBEKANNT"));
  return { ok: true, data: eintraege };
}

/**
 * Declaration dates of the rent entries (`erklaert_am`), keyed by entry ID. FAIL-SOFT: any error gives an empty
 * map, so the entries are still shown (without the date). Only the error code is logged.
 */
async function ladeErklaertAm(
  supabase: SupabaseClient,
  mietverhaeltnisId: string,
  actionName: string
): Promise<Map<string, string | null>> {
  const erklaert = new Map<string, string | null>();
  try {
    const { data, error } = await supabase
      .from("Mieter_Mietverhaeltnisse_Mieten")
      .select("id, erklaert_am")
      .eq("mietverhaeltnis_id", mietverhaeltnisId);
    if (error || !Array.isArray(data)) {
      logAction(actionName, "failed", { code: "ERKLAERT_AM_NICHT_GELADEN" });
      return erklaert;
    }
    for (const row of data) {
      const record = asRecord(row);
      if (!record || typeof record.id !== "string") continue;
      erklaert.set(record.id, pruefeIsoDatum(record.erklaert_am));
    }
  } catch {
    logAction(actionName, "failed", { code: "ERKLAERT_AM_NICHT_GELADEN" });
    return new Map<string, string | null>();
  }
  return erklaert;
}

/**
 * Common flow of every action: sign-in -> module right (all `aktionen` must be granted) -> `run` (validation and
 * database access) -> revalidation for writes -> log. Unexpected exceptions are caught and logged by kind only.
 */
async function runMietverhaeltnisAction<T>(options: {
  actionName: string;
  aktionen: readonly MieterAktion[];
  /** Writes revalidate the tenant list and the finance page. */
  schreibend: boolean;
  /** Further pages to revalidate after a successful write (only for writes). */
  zusaetzlichePfade?: readonly string[];
  run: (supabase: SupabaseClient) => Promise<Step<T>>;
}): Promise<MietverhaeltnisActionResult<T>> {
  const { actionName, aktionen, schreibend, zusaetzlichePfade = [], run } = options;

  const failure = (error: MietverhaeltnisActionError): MietverhaeltnisActionResult<T> => {
    const unexpected = error.code === "UNBEKANNT";
    logAction(actionName, unexpected ? "error" : "failed", { code: error.code });
    return { success: false, error };
  };

  // 1. Sign-in. Only "not signed in" means MV001; other failures are infrastructure errors.
  let supabase: SupabaseClient;
  try {
    ({ supabase } = await ensureAuth());
  } catch (authError) {
    unstable_rethrow(authError);
    if (authError instanceof Error && authError.message.startsWith(NOT_SIGNED_IN_MESSAGE_PREFIX)) {
      return failure(mietverhaeltnisFehler("MV001"));
    }
    logAction(actionName, "error", { code: "AUTH_UNAVAILABLE" });
    return { success: false, error: { code: "UNBEKANNT", message: MIETVERHAELTNIS_FEHLER_FALLBACK_MESSAGE } };
  }

  try {
    // 2. Module right (early rejection; the database checks again). No database call on failure.
    const rechte = await Promise.all(aktionen.map((aktion) => hasPermission("mieter", aktion)));
    if (rechte.some((recht) => !recht)) {
      return failure(mietverhaeltnisFehler("42501"));
    }

    // 3. Validation and database access
    const step = await run(supabase);
    if (!step.ok) return failure(step.error);

    // 4. Revalidation and log
    if (schreibend) {
      revalidatePath("/mieter");
      revalidatePath("/finanzen");
      for (const pfad of zusaetzlichePfade) revalidatePath(pfad);
    }
    logAction(actionName, "success", {});
    return { success: true, data: step.data };
  } catch (error) {
    unstable_rethrow(error);
    // Log the kind only: the message of an exception could contain request details.
    logAction(actionName, "error", { code: "UNEXPECTED" });
    return { success: false, error: { code: "UNBEKANNT", message: MIETVERHAELTNIS_FEHLER_FALLBACK_MESSAGE } };
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Tenancy, rent history (with declaration dates), apartment rent, move-in date and applicant flag of a tenant for
 * the tenant dialog. A tenant without tenancy gets `mietverhaeltnis: null` and an empty history (not an error).
 */
export async function getMietverhaeltnisUebersichtAction(
  mieterId: string
): Promise<MietverhaeltnisActionResult<MietverhaeltnisUebersicht>> {
  return runMietverhaeltnisAction<MietverhaeltnisUebersicht>({
    actionName: "getMietverhaeltnisUebersicht",
    aktionen: ["ansehen"],
    schreibend: false,
    run: async (supabase) => {
      if (!istUuid(mieterId)) return fail(mietverhaeltnisFehler("MV004"));

      const mieter = await ladeMieter(supabase, mieterId);
      if (!mieter.ok) return mieter;
      const { mietverhaeltnisId, wohnungId, wohnungsmiete, einzug, istBewerber } = mieter.data;
      const basis = { wohnungsmiete, mieterEinzug: einzug, istBewerber };
      if (!mietverhaeltnisId) {
        return { ok: true, data: { mietverhaeltnis: null, mieten: [], ...basis, flaechen: null } };
      }

      const { data: mvData, error: mvError } = await supabase
        .from("Mieter_Mietverhaeltnisse")
        .select(MIETVERHAELTNIS_SPALTEN)
        .eq("id", mietverhaeltnisId)
        .maybeSingle();
      if (mvError) return fail(mapMietverhaeltnisError(mvError));
      const mietverhaeltnis = asRecord(mvData) as Mietverhaeltnis | null;
      if (!mietverhaeltnis) return fail(mietverhaeltnisFehler("MV003"));

      // The area notes never fail and do not depend on the history: load them alongside
      const [historie, stand, optionAenderbar] = await Promise.all([
        ladeHistorie(supabase, mietverhaeltnisId),
        ladeFlaechenStand(supabase, wohnungId, mietverhaeltnisId),
        hasPermission("wohnungen", "bearbeiten"),
      ]);
      if (!historie.ok) return historie;

      const erklaert = await ladeErklaertAm(supabase, mietverhaeltnisId, "getMietverhaeltnisUebersicht");
      const mieten = historie.data.map((eintrag) => ({ ...eintrag, erklaert_am: erklaert.get(eintrag.miete_id) ?? null }));
      const flaechen: FlaechenStand = { ...stand, optionAenderbar };

      return { ok: true, data: { mietverhaeltnis, mieten, ...basis, flaechen } };
    },
  });
}

/**
 * Creates the tenancy for a tenant without one (one transaction in the database, the tenant is linked as main
 * tenant). Applicants are rejected by the database (`MV004`).
 */
export async function mietverhaeltnisAnlegenAction(
  input: MietverhaeltnisAnlegenInput
): Promise<MietverhaeltnisActionResult<{ mietverhaeltnisId: string }>> {
  return runMietverhaeltnisAction<{ mietverhaeltnisId: string }>({
    actionName: "mietverhaeltnisAnlegen",
    aktionen: ["erstellen", "ansehen"],
    schreibend: true,
    run: async (supabase) => {
      const mieterId = input?.mieterId;
      if (!istUuid(mieterId)) return fail(mietverhaeltnisFehler("MV004"));

      // Only the keys that are set go into p_daten. Omitted and null mean "not set".
      const daten: { vertragsbeginn?: string; miete?: number } = {};
      const vertragsbeginn = input?.vertragsbeginn;
      if (vertragsbeginn !== undefined && vertragsbeginn !== null) {
        const beginn = pruefeIsoDatum(vertragsbeginn);
        if (!beginn) return fail(mietverhaeltnisFehler("MV004"));
        daten.vertragsbeginn = beginn;
      }
      const miete = input?.miete;
      if (miete !== undefined && miete !== null) {
        const betrag = pruefeBetrag(miete);
        if (betrag === null) return fail(mietverhaeltnisFehler("MV004"));
        daten.miete = Number(betrag);
      }

      // Object scope check (the database checks it again)
      const mieter = await ladeMieter(supabase, mieterId);
      if (!mieter.ok) return mieter;

      const { data, error } = await supabase.rpc("mietverhaeltnis_anlegen", { p_mieter_id: mieterId, p_daten: daten });
      if (error) return fail(mapMietverhaeltnisError(error));
      if (!istUuid(data)) return fail(mietverhaeltnisFehler("UNBEKANNT"));
      return { ok: true, data: { mietverhaeltnisId: data } };
    },
  });
}

/** Sets the rent from a date on (replaces an entry of the same date). */
export async function mieteSetzenAction(input: MieteSetzenInput): Promise<MietverhaeltnisActionResult<{ mieteId: string }>> {
  return runMietverhaeltnisAction<{ mieteId: string }>({
    actionName: "mieteSetzen",
    aktionen: ["bearbeiten", "ansehen"],
    schreibend: true,
    run: async (supabase) => {
      // Validation first, before any database call. Amount and reason are checked strictly.
      const mieterId = input?.mieterId;
      if (!istUuid(mieterId)) return fail(mietverhaeltnisFehler("MV004"));
      const gueltigAb = pruefeIsoDatum(input?.gueltigAb);
      if (!gueltigAb) return fail(mietverhaeltnisFehler("MV004"));
      const betrag = pruefeBetrag(input?.betrag);
      if (betrag === null) return fail(mietverhaeltnisFehler("MV004"));
      const grund = pruefeFreitext(input?.grund, GRUND_MAX_LAENGE);
      if (grund === undefined) return fail(mietverhaeltnisFehler("MV004"));

      // The tenancy ID comes from the tenant row, never from the client.
      const mieter = await ladeMieter(supabase, mieterId);
      if (!mieter.ok) return mieter;
      if (!mieter.data.mietverhaeltnisId) return fail(mietverhaeltnisFehler("MV003"));

      const { data, error } = await supabase.rpc("mietverhaeltnis_miete_setzen", {
        p_mietverhaeltnis_id: mieter.data.mietverhaeltnisId,
        p_gueltig_ab: gueltigAb,
        p_betrag: betrag,
        p_aenderungsart: AENDERUNGSART,
        p_grund: grund,
      });
      if (error) return fail(mapMietverhaeltnisError(error));
      if (!istUuid(data)) return fail(mietverhaeltnisFehler("UNBEKANNT"));
      return { ok: true, data: { mieteId: data } };
    },
  });
}

/**
 * Removes an entry of the rent history. The entry must belong to the history of the tenancy of this tenant,
 * otherwise `MV003` (checked before the removal).
 */
export async function mieteEntfernenAction(input: MieteEntfernenInput): Promise<MietverhaeltnisActionResult> {
  return runMietverhaeltnisAction<undefined>({
    actionName: "mieteEntfernen",
    aktionen: ["bearbeiten", "ansehen"],
    schreibend: true,
    run: async (supabase) => {
      const mieterId = input?.mieterId;
      const mieteId = input?.mieteId;
      if (!istUuid(mieterId) || !istUuid(mieteId)) return fail(mietverhaeltnisFehler("MV004"));

      const mieter = await ladeMieter(supabase, mieterId);
      if (!mieter.ok) return mieter;
      const mietverhaeltnisId = mieter.data.mietverhaeltnisId;
      if (!mietverhaeltnisId) return fail(mietverhaeltnisFehler("MV003"));

      const historie = await ladeHistorie(supabase, mietverhaeltnisId);
      if (!historie.ok) return historie;
      if (!historie.data.some((eintrag) => eintrag.miete_id === mieteId)) {
        return fail(mietverhaeltnisFehler("MV003"));
      }

      const { error } = await supabase.rpc("mietverhaeltnis_miete_entfernen", { p_miete_id: mieteId });
      if (error) return fail(mapMietverhaeltnisError(error));
      return { ok: true, data: undefined };
    },
  });
}

/**
 * Writes the contract data of the tenancy: end, fixed term, termination (date, effective date, party), note and contract area.
 * This is the ONLY direct write to a tenancy table (`.update()`, seven columns, RLS applies). After the save, `flaechen` gives
 * the contract area notes of the tenancies running at the same time (areas above the apartment, vacancy of a single area,
 * missing areas); they never refuse the save. The tenancy ID is read from the tenant row. No row back means RLS refused the
 * write (`42501`).
 */
export async function vertragsdatenSpeichernAction(
  input: VertragsdatenSpeichernInput
): Promise<MietverhaeltnisActionResult<{ flaechen: FlaechenStand }>> {
  return runMietverhaeltnisAction<{ flaechen: FlaechenStand }>({
    actionName: "vertragsdatenSpeichern",
    aktionen: ["bearbeiten", "ansehen"],
    schreibend: true,
    run: async (supabase) => {
      const mieterId = input?.mieterId;
      if (!istUuid(mieterId)) return fail(mietverhaeltnisFehler("MV004"));

      // Every date is null or a valid ISO date. `undefined` (missing key) is invalid, it never clears a value.
      const vertragsende = pruefeDatumFeld(input?.vertragsende);
      const befristetBis = pruefeDatumFeld(input?.befristetBis);
      const kuendigungEingangAm = pruefeDatumFeld(input?.kuendigungEingangAm);
      const kuendigungZum = pruefeDatumFeld(input?.kuendigungZum);
      if (vertragsende === undefined || befristetBis === undefined || kuendigungEingangAm === undefined || kuendigungZum === undefined) {
        return fail(mietverhaeltnisFehler("MV004"));
      }
      const kuendigungDurch = pruefeKuendigungDurch(input?.kuendigungDurch);
      if (kuendigungDurch === undefined) return fail(mietverhaeltnisFehler("MV004"));
      if (input?.notiz === undefined) return fail(mietverhaeltnisFehler("MV004"));
      const notiz = pruefeFreitext(input.notiz, NOTIZ_MAX_LAENGE);
      if (notiz === undefined) return fail(mietverhaeltnisFehler("MV004"));
      // `undefined` (missing key) is invalid as for the dates: it never clears a stored area
      const flaeche = pruefeFlaeche(input?.flaeche);
      if (flaeche === undefined) return fail(mietverhaeltnisFehler("MV004"));

      const mieter = await ladeMieter(supabase, mieterId);
      if (!mieter.ok) return mieter;
      const mietverhaeltnisId = mieter.data.mietverhaeltnisId;
      if (!mietverhaeltnisId) return fail(mietverhaeltnisFehler("MV003"));

      const { data, error } = await supabase
        .from("Mieter_Mietverhaeltnisse")
        .update({
          vertragsende,
          befristet_bis: befristetBis,
          kuendigung_eingang_am: kuendigungEingangAm,
          kuendigung_zum: kuendigungZum,
          kuendigung_durch: kuendigungDurch,
          notiz,
          flaeche,
        })
        .eq("id", mietverhaeltnisId)
        .select("id");
      if (error) return fail(mapMietverhaeltnisError(error));
      // No row back: RLS refused the update (or the tenancy is not visible)
      if (!Array.isArray(data) || data.length === 0) return fail(mietverhaeltnisFehler("42501"));
      // Notes only matter when this tenancy has an area (the section reloads the overview with all notes anyway)
      const flaechen: FlaechenStand = flaeche === null
        ? { hinweise: [], restflaecheVerteilen: null }
        : await ladeFlaechenStand(supabase, mieter.data.wohnungId, mietverhaeltnisId);
      return { ok: true, data: { flaechen } };
    },
  });
}

/**
 * Switches the remaining area option of the tenant's apartment (`Wohnungen.restflaeche_verteilen`, GH-17): on days with tenancies
 * with and without contract area, the tenancies without area share the rest of the apartment instead of an equal split of the day.
 * Needs the tenant rights to see and edit plus `wohnungen: bearbeiten` (the apartment is changed); RLS applies to the update.
 * Whether such a mixed key is allowed is a legal question; the option is off by default.
 */
export async function restflaecheVerteilenSetzenAction(
  input: RestflaecheVerteilenSetzenInput
): Promise<MietverhaeltnisActionResult<{ flaechen: FlaechenStand }>> {
  return runMietverhaeltnisAction<{ flaechen: FlaechenStand }>({
    actionName: "restflaecheVerteilenSetzen",
    aktionen: ["bearbeiten", "ansehen"],
    schreibend: true,
    zusaetzlichePfade: ["/wohnungen"],
    run: async (supabase) => {
      const mieterId = input?.mieterId;
      if (!istUuid(mieterId) || typeof input?.wert !== "boolean") return fail(mietverhaeltnisFehler("MV004"));
      if (!(await hasPermission("wohnungen", "bearbeiten"))) return fail(mietverhaeltnisFehler("42501"));

      const mieter = await ladeMieter(supabase, mieterId);
      if (!mieter.ok) return mieter;
      const { wohnungId, mietverhaeltnisId } = mieter.data;
      if (!wohnungId) return fail(mietverhaeltnisFehler("MV007"));
      if (!mietverhaeltnisId) return fail(mietverhaeltnisFehler("MV003"));

      const { data, error } = await supabase
        .from("Wohnungen")
        .update({ restflaeche_verteilen: input.wert })
        .eq("id", wohnungId)
        .select("id");
      if (error) return fail(mapMietverhaeltnisError(error));
      if (!Array.isArray(data) || data.length === 0) return fail(mietverhaeltnisFehler("42501"));
      return { ok: true, data: { flaechen: await ladeFlaechenStand(supabase, wohnungId, mietverhaeltnisId) } };
    },
  });
}

/**
 * Moves a tenant with a tenancy into another apartment (GH-17, Wohnungswechsel). The database ends the current
 * tenancy the day before the move, opens a new one in the new apartment and moves the tenant, in one transaction.
 * The new apartment must lie inside the object scope too; the database checks rights and both houses again.
 */
export async function mieterUmzugAction(
  input: MieterUmzugInput
): Promise<MietverhaeltnisActionResult<{ mietverhaeltnisId: string }>> {
  return runMietverhaeltnisAction<{ mietverhaeltnisId: string }>({
    actionName: "mieterUmzug",
    aktionen: ["ansehen", "bearbeiten", "erstellen"],
    schreibend: true,
    zusaetzlichePfade: ["/wohnungen"],
    run: async (supabase) => {
      // Validation first, before any database call.
      const mieterId = input?.mieterId;
      if (!istUuid(mieterId)) return fail(mietverhaeltnisFehler("MV004"));
      const wohnungId = input?.wohnungId;
      if (!istUuid(wohnungId)) return fail(mietverhaeltnisFehler("MV004"));
      const datum = pruefeIsoDatum(input?.datum);
      if (!datum) return fail(mietverhaeltnisFehler("MV004"));
      const miete = input?.miete;
      let betrag: number | null = null;
      if (miete !== undefined && miete !== null) {
        const geprueft = pruefeBetrag(miete);
        if (geprueft === null) return fail(mietverhaeltnisFehler("MV004"));
        betrag = Number(geprueft);
      }

      // Object scope: the current apartment (in ladeMieter) and the new apartment (here).
      const mieter = await ladeMieter(supabase, mieterId);
      if (!mieter.ok) return mieter;
      const wohnungIds = await getAccessibleWohnungIds();
      if (wohnungIds !== null && !wohnungIds.includes(wohnungId)) return fail(mietverhaeltnisFehler("42501"));

      const { data, error } = await supabase.rpc("mietverhaeltnis_umzug", {
        p_mieter_id: mieterId,
        p_wohnung_id: wohnungId,
        p_datum: datum,
        p_miete: betrag,
      });
      if (error) return fail(mapMietverhaeltnisError(error));
      if (!istUuid(data)) return fail(mietverhaeltnisFehler("UNBEKANNT"));
      return { ok: true, data: { mietverhaeltnisId: data } };
    },
  });
}

/**
 * Other tenants of the same apartment, for the tenancy section: who shares the tenancy of this tenant (`mitmieter`) and
 * which other tenancies of the apartment the tenant could join (`kandidaten`, one entry per tenancy). Read-only.
 */
export async function getMitmieterUebersichtAction(mieterId: string): Promise<MietverhaeltnisActionResult<MitmieterUebersicht>> {
  return runMietverhaeltnisAction<MitmieterUebersicht>({
    actionName: "getMitmieterUebersicht",
    aktionen: ["ansehen"],
    schreibend: false,
    run: async (supabase) => {
      if (!istUuid(mieterId)) return fail(mietverhaeltnisFehler("MV004"));
      const mieter = await ladeMieter(supabase, mieterId);
      if (!mieter.ok) return mieter;
      const { wohnungId, mietverhaeltnisId } = mieter.data;
      const leer: MitmieterUebersicht = { mitmieter: [], kandidaten: [] };
      // Without apartment or tenancy there is nothing to share or join.
      if (!wohnungId || !mietverhaeltnisId) return { ok: true, data: leer };

      const { data, error } = await supabase
        .from("Mieter")
        .select(`id, rolle, mietverhaeltnis_id, geloescht_am, auszug, ${MIETER_PERSON_EMBED}`)
        .eq("wohnung_id", wohnungId);
      if (error) return fail(mapMietverhaeltnisError(error));
      if (!Array.isArray(data)) return fail(mietverhaeltnisFehler("UNBEKANNT"));

      const heute = new Date().toISOString().slice(0, 10);
      const kandidaten = new Map<string, string[]>();
      const ergebnis: MitmieterUebersicht = { mitmieter: [], kandidaten: [] };
      for (const row of data) {
        const record = asRecord(row);
        if (!record || !istUuid(record.id) || record.id === mieterId) continue;
        if (record.geloescht_am !== null && record.geloescht_am !== undefined) continue;
        // A tenant who has already moved out is neither a fellow tenant nor the tenant of a tenancy to join
        if (typeof record.auszug === "string" && record.auszug < heute) continue;
        // Name from the person (Personen); Mieter rows are never applicants
        const person = (Array.isArray(record.person) ? record.person[0] : record.person) as Person | null | undefined;
        const name = personAnzeigename(person);
        const mvId = typeof record.mietverhaeltnis_id === "string" ? record.mietverhaeltnis_id : null;
        if (mvId === mietverhaeltnisId) {
          ergebnis.mitmieter.push({
            mieterId: record.id,
            name,
            rolle: record.rolle === "hauptmieter" || record.rolle === "mitmieter" ? record.rolle : null,
          });
        } else if (mvId) {
          kandidaten.set(mvId, [...(kandidaten.get(mvId) ?? []), name]);
        }
      }
      // Tenancies that have already ended cannot be joined (the database rejects the date): leave them out
      if (kandidaten.size > 0) {
        const { data: mvData, error: mvError } = await supabase
          .from("Mieter_Mietverhaeltnisse")
          .select("id, vertragsende")
          .in("id", Array.from(kandidaten.keys()));
        if (mvError) return fail(mapMietverhaeltnisError(mvError));
        if (!Array.isArray(mvData)) return fail(mietverhaeltnisFehler("UNBEKANNT"));
        const beendet = new Set<string>();
        for (const row of mvData) {
          const mv = asRecord(row);
          if (mv && typeof mv.id === "string" && typeof mv.vertragsende === "string" && mv.vertragsende < heute) beendet.add(mv.id);
        }
        for (const id of beendet) kandidaten.delete(id);
      }
      ergebnis.kandidaten = Array.from(kandidaten, ([id, namen]) => ({ mietverhaeltnisId: id, mieterNamen: namen }));
      return { ok: true, data: ergebnis };
    },
  });
}

/**
 * A tenant joins an existing tenancy of the same apartment (GH-17, phase 6). The database ends the old tenancy of the
 * tenant the day before and keeps it as history; deposits stay where they were agreed. No legal rule is checked here.
 */
export async function mieterZusammenfuehrenAction(
  input: MieterZusammenfuehrenInput
): Promise<MietverhaeltnisActionResult<{ mietverhaeltnisId: string }>> {
  return runMietverhaeltnisAction<{ mietverhaeltnisId: string }>({
    actionName: "mieterZusammenfuehren",
    aktionen: ["ansehen", "bearbeiten"],
    schreibend: true,
    zusaetzlichePfade: ["/wohnungen"],
    run: async (supabase) => {
      // Validation first, before any database call.
      const mieterId = input?.mieterId;
      if (!istUuid(mieterId)) return fail(mietverhaeltnisFehler("MV004"));
      const ziel = input?.zielMietverhaeltnisId;
      if (!istUuid(ziel)) return fail(mietverhaeltnisFehler("MV004"));
      const datum = pruefeIsoDatum(input?.datum);
      if (!datum) return fail(mietverhaeltnisFehler("MV004"));
      const rolle = input?.rolle ?? null;
      if (rolle !== null && rolle !== "hauptmieter" && rolle !== "mitmieter") return fail(mietverhaeltnisFehler("MV004"));

      // Object scope (apartment of the tenant); the database checks rights and the house again.
      const mieter = await ladeMieter(supabase, mieterId);
      if (!mieter.ok) return mieter;

      const { data, error } = await supabase.rpc("mietverhaeltnis_mieter_zusammenfuehren", {
        p_mieter_id: mieterId,
        p_ziel_mietverhaeltnis_id: ziel,
        p_datum: datum,
        p_rolle: rolle,
      });
      if (error) return fail(mapMietverhaeltnisError(error));
      if (!istUuid(data)) return fail(mietverhaeltnisFehler("UNBEKANNT"));
      return { ok: true, data: { mietverhaeltnisId: data } };
    },
  });
}

/**
 * A tenant leaves a shared tenancy and gets an own tenancy in the same apartment (GH-17, phase 6). The shared
 * tenancy continues for the other tenants; deposits stay at the shared tenancy. Optionally with the contract area of the new
 * tenancy and a new area of the shared one (not versioned: it also applies to earlier periods when they are calculated again).
 */
export async function mieterTrennenAction(
  input: MieterTrennenInput
): Promise<MietverhaeltnisActionResult<{ mietverhaeltnisId: string }>> {
  return runMietverhaeltnisAction<{ mietverhaeltnisId: string }>({
    actionName: "mieterTrennen",
    aktionen: ["ansehen", "bearbeiten", "erstellen"],
    schreibend: true,
    run: async (supabase) => {
      const mieterId = input?.mieterId;
      if (!istUuid(mieterId)) return fail(mietverhaeltnisFehler("MV004"));
      const datum = pruefeIsoDatum(input?.datum);
      if (!datum) return fail(mietverhaeltnisFehler("MV004"));
      const miete = input?.miete;
      let betrag: number | null = null;
      if (miete !== undefined && miete !== null) {
        const geprueft = pruefeBetrag(miete);
        if (geprueft === null) return fail(mietverhaeltnisFehler("MV004"));
        betrag = Number(geprueft);
      }
      // Areas are optional here: a missing key means none (new tenancy) or unchanged (shared tenancy)
      const flaecheNeu = input?.flaecheNeu === undefined ? null : pruefeFlaeche(input.flaecheNeu);
      const flaecheBisher = input?.flaecheBisher === undefined ? null : pruefeFlaeche(input.flaecheBisher);
      if (flaecheNeu === undefined || flaecheBisher === undefined) return fail(mietverhaeltnisFehler("MV004"));

      const mieter = await ladeMieter(supabase, mieterId);
      if (!mieter.ok) return mieter;

      // The area parameters are only sent when given, so a split without areas also works against a database without them
      const { data, error } = await supabase.rpc("mietverhaeltnis_mieter_trennen", {
        p_mieter_id: mieterId,
        p_datum: datum,
        p_miete: betrag,
        ...(flaecheNeu !== null ? { p_flaeche_neu: flaecheNeu } : {}),
        ...(flaecheBisher !== null ? { p_flaeche_bisher: flaecheBisher } : {}),
      });
      if (error) return fail(mapMietverhaeltnisError(error));
      if (!istUuid(data)) return fail(mietverhaeltnisFehler("UNBEKANNT"));
      return { ok: true, data: { mietverhaeltnisId: data } };
    },
  });
}
