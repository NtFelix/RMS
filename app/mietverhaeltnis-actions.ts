"use server";

/**
 * Server actions of the tenancy and rent history ("Mietverhältnis", GH-17, phase 3B).
 *
 * Principles:
 * - Thin actions: sign-in check -> module right (`hasPermission('mieter', ...)`, writes also `ansehen`; fast
 *   failure, the database stays authoritative) -> input validation -> database access -> error mapping
 *   (`lib/mietverhaeltnis-errors.ts`) -> `revalidatePath` for writes -> log.
 * - The rent history is written and removed ONLY through the RPCs `mietverhaeltnis_miete_setzen` and
 *   `mietverhaeltnis_miete_entfernen`. No `.insert()`, `.update()` or `.delete()` on the tenancy tables here.
 * - The tenancy ID is never taken from the client: it is read from the tenant row on the server.
 * - Amounts are validated strictly and sent as exact decimal strings (two decimal places, no rounding).
 * - No personal data, amounts or IDs in logs: only the action name, the event and the error code.
 * - Expected errors are returned as `{ success: false, error: { message, code } }`, not thrown. Messages are German
 *   (formal address) and come from `lib/mietverhaeltnis-errors.ts`.
 *
 * Security relevant (permissions, money): not production ready until the maintainer has reviewed it.
 * The database is authoritative: the RPCs check organisation, right and object scope themselves.
 *
 * "use server" file: only async functions are exported as values (types are erased).
 */

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureAuth } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/permissions";
import { getAccessibleWohnungIds } from "@/lib/object-scope";
import { logAction } from "@/lib/logging-middleware";
import { mapMietverhaeltnisError, mietverhaeltnisFehler, MIETVERHAELTNIS_FEHLER_FALLBACK_MESSAGE } from "@/lib/mietverhaeltnis-errors";
import type {
  MietEintrag,
  Mietverhaeltnis,
  MietverhaeltnisActionError,
  MietverhaeltnisActionResult,
  MietverhaeltnisUebersicht,
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

/** Module right actions used here. */
type MieterAktion = "ansehen" | "bearbeiten";

type Step<T> = { ok: true; data: T } | { ok: false; error: MietverhaeltnisActionError };

// ---------------------------------------------------------------------------
// Constants and helpers (not exported: a "use server" file only exports async actions)
// ---------------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Lower and upper limit of the database for `gueltig_ab` (ISO strings compare correctly). */
const MIN_DATUM = "1900-01-01";
const MAX_DATUM = "2100-12-31";
const BETRAG_MAX = 99999999.99;
const GRUND_MAX_LAENGE = 500;
/** Change type of entries entered in the app (the database default). */
const AENDERUNGSART = "vereinbarung";
/** Start of the message `ensureAuth` throws for "not signed in" (`lib/auth-utils.ts`). */
const NOT_SIGNED_IN_MESSAGE_PREFIX = "Nicht authentifiziert";

const MIETVERHAELTNIS_SPALTEN =
  "id, wohnung_id, vertragsbeginn, vertragsende, befristet_bis, kuendigung_eingang_am, kuendigung_zum, kuendigung_durch, abrechnungsmodus, vertrag_dokument_id, notiz, quelle";

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

/** Reason: `null` for empty, trimmed text up to 500 characters, `undefined` if invalid. */
function pruefeGrund(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (text === "") return null;
  if (Array.from(text).length > GRUND_MAX_LAENGE) return undefined;
  return text;
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
 * Reads the tenant row (tenancy link and apartment rent) in one query and checks the object scope: a user who is
 * restricted to certain houses only reaches tenants of their apartments (`42501` otherwise, same as the database).
 */
async function ladeMieter(
  supabase: SupabaseClient,
  mieterId: string
): Promise<Step<{ mietverhaeltnisId: string | null; wohnungsmiete: number | null }>> {
  const { data, error } = await supabase
    .from("Mieter")
    .select("id, mietverhaeltnis_id, wohnung_id, Wohnungen(miete)")
    .eq("id", mieterId)
    .maybeSingle();
  if (error) return fail(mapMietverhaeltnisError(error));
  const record = asRecord(data);
  if (!record) return fail(mietverhaeltnisFehler("MV003"));
  const wohnungIds = await getAccessibleWohnungIds();
  if (wohnungIds !== null && (typeof record.wohnung_id !== "string" || !wohnungIds.includes(record.wohnung_id))) {
    return fail(mietverhaeltnisFehler("42501"));
  }
  const mietverhaeltnisId = typeof record.mietverhaeltnis_id === "string" ? record.mietverhaeltnis_id : null;
  return { ok: true, data: { mietverhaeltnisId, wohnungsmiete: parseWohnungsmiete(record.Wohnungen) } };
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
 * Common flow of every action: sign-in -> module right (all `aktionen` must be granted) -> `run` (validation and
 * database access) -> revalidation for writes -> log. Unexpected exceptions are caught and logged by kind only.
 */
async function runMietverhaeltnisAction<T>(options: {
  actionName: string;
  aktionen: readonly MieterAktion[];
  /** Writes revalidate the tenant list and the finance page. */
  schreibend: boolean;
  run: (supabase: SupabaseClient) => Promise<Step<T>>;
}): Promise<MietverhaeltnisActionResult<T>> {
  const { actionName, aktionen, schreibend, run } = options;

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
 * Tenancy, rent history and apartment rent of a tenant for the tenant dialog. A tenant without tenancy gets
 * `mietverhaeltnis: null` and an empty history (not an error).
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
      const { mietverhaeltnisId, wohnungsmiete } = mieter.data;
      if (!mietverhaeltnisId) {
        return { ok: true, data: { mietverhaeltnis: null, mieten: [], wohnungsmiete } };
      }

      const { data: mvData, error: mvError } = await supabase
        .from("Mieter_Mietverhaeltnisse")
        .select(MIETVERHAELTNIS_SPALTEN)
        .eq("id", mietverhaeltnisId)
        .maybeSingle();
      if (mvError) return fail(mapMietverhaeltnisError(mvError));
      const mietverhaeltnis = asRecord(mvData) as Mietverhaeltnis | null;
      if (!mietverhaeltnis) return fail(mietverhaeltnisFehler("MV003"));

      const historie = await ladeHistorie(supabase, mietverhaeltnisId);
      if (!historie.ok) return historie;

      return { ok: true, data: { mietverhaeltnis, mieten: historie.data, wohnungsmiete } };
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
      const grund = pruefeGrund(input?.grund);
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
