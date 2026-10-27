"use server";

/**
 * Server actions of the deposit management ("Kautionsmanagement", GH-6), phases 1 to 4.
 *
 * Principles (spec 4.1/4.5):
 * - Thin actions: sign-in check -> module right (`hasPermission('kautionen', <aktion>)` and, for every write
 *   action, additionally `ansehen` like the database; fast failure, the database stays authoritative) -> object
 *   scope (fail-closed, only where the tenant ID IS the object: details and create) -> input validation -> RPC
 *   call -> error mapping by SQLSTATE -> `revalidatePath('/mieter')` -> log.
 * - The ONLY way to read or change deposit data is the RPCs (`get_kaution_details`, `kaution_anlegen`,
 *   `kaution_aendern`, `kaution_buchen`, `kaution_storno`, `kaution_raten_planen`, `soft_delete_record`). There is no `.insert()`,
 *   `.update()` or `.delete()` on the deposit tables in this file, no calculation of balances, states or
 *   deadlines (they come from the database), and no organisation ID from the client.
 * - Amounts are parsed strictly (`lib/kautionen-money.ts`, no silent rounding) and sent as exact decimal strings.
 * - No personal data in logs: only the booking/deposit type and the error code are logged, never names,
 *   amounts, account data or free texts.
 * - Expected errors are returned as `{ success: false, error: { message, code } }`, not thrown. The messages
 *   are German (formal address) and come from `lib/kautionen-errors.ts`.
 *
 * Phase 2 (instalment plan: `planeKautionRatenAction`, optional rate of a deposit booking, receipts) and phase 3
 * (agreement fields incl. IBAN, interest schedule `planeKautionZinsstaffelAction`, interest proposal
 * `berechneKautionZinsenAction`, interest credit as a booking type) and phase 4 (settlement read `getKautionAbrechnungAction`,
 * interest hold `setzeKautionEinbehaltAction`) are in this file. The PDF route calls the settlement read action.
 *
 * Security relevant (money booking, module right, object scope): not production ready until the maintainer
 * has reviewed it. The database is authoritative: the RPCs check organisation, module right, object scope and
 * the strict balance themselves (fail-closed). The checks in this file are an early rejection, not the guarantee.
 *
 * "use server" file: only async functions are exported as values (types are erased).
 */

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureAuth } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/permissions";
import { logAction } from "@/lib/logging-middleware";
import type { LogAttributes } from "@/lib/otlp-utils";
import {
  KAUTION_ARTEN_VERFUEGBAR,
  KAUTION_BEWEGUNGSARTEN_VERFUEGBAR,
  KAUTION_RATEN_MAX_ANZAHL,
  KAUTION_TEXT_LIMITS,
  isKautionAbzugKategorie,
  isKautionArt,
  isKautionBewegungsArt,
  isKautionZinsmethode,
  type KautionVereinbarungsFeld,
} from "@/lib/kautionen-constants";
import { KAUTION_FEHLER_FALLBACK_MESSAGE, mapKautionError, type KautionRpcError } from "@/lib/kautionen-errors";
import { centsToDecimalString, getMoneyInputError, parseMoneyInput } from "@/lib/kautionen-money";
import { checkKautionScope } from "@/lib/kautionen-scope";
import { chunkIds, mergeLoeschauswirkung } from "@/lib/kautionen-loeschauswirkung";
import {
  BELEG_DOWNLOAD_GUELTIG_SEKUNDEN,
  BELEG_STORAGE_BUCKET,
  anzeigeNameAusDateiname,
  baueBelegPfad,
} from "@/lib/kautionen-belege";
import {
  validateKautionArtFelder,
  validateKautionDatum,
  validateKautionEinbehalt,
  validateKautionGetrennt,
  validateKautionIban,
  validateKautionStichtag,
  validateKautionText,
  validateKautionZinsmethode,
  validateUuid,
  validateZinsstaffel,
  validateZinszeitraum,
  type ValidationResult,
} from "@/lib/kautionen-validation";
import type {
  KautionAbrechnung,
  KautionAbzugKategorie,
  KautionArt,
  KautionBewegungsArt,
  KautionDetails,
  KautionLoeschauswirkung,
  KautionLoeschTabelle,
  KautionRechte,
  KautionVorschlag,
  KautionZinsVorschlag,
} from "@/types/Kaution";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Module right actions used here (`verwalten` has no meaning for `kautionen`). */
type KautionAktion = "ansehen" | "erstellen" | "bearbeiten" | "loeschen";

export interface KautionActionError {
  message: string;
  /** Stable code (SQLSTATE, see `lib/kautionen-errors.ts`), `undefined` for unclassified errors. */
  code?: string;
}

/** Result shape like the existing actions: `{ success, error?, data? }`. */
export type KautionActionResult<T = undefined> = { success: boolean; error?: KautionActionError; data?: T };

export interface CreateKautionInput {
  tenantId: string;
  /** Deposit type; omitted = `barkaution` (database default). */
  kautionsart?: KautionArt;
  /** Target amount, e.g. `"1500,00"` or `"1500.00"` (strict parsing, greater than 0). */
  sollBetrag: string;
  /**
   * Rent at contract date. `undefined` or empty: the database copies the current apartment rent.
   * `null`: deliberately empty. Otherwise an amount (0 is allowed).
   */
  mieteBeiVertragsschluss?: string | null;
  interneNotiz?: string | null;
  /** Phase 3 agreement fields (all optional, `null` or empty = not given). Bank fields only for bank account types. */
  iban?: string | null;
  bank?: string | null;
  kontoinhaber?: string | null;
  /** Guarantee or insurance only. */
  buergeVersicherer?: string | null;
  /** Guarantee or insurance only. */
  urkundennummer?: string | null;
  /** Bank account types only. */
  getrenntAngelegt?: boolean | null;
  /** Interest method, default `act_365` in the database. `null` is not accepted. */
  zinsmethode?: string;
}

export interface UpdateKautionVereinbarungInput {
  tenantId: string;
  kautionId: string;
  /**
   * Fields to change, database keys (`soll_betrag`, `miete_bei_vertragsschluss`, `interne_notiz`, `kautionsart`,
   * phase 3: `iban`, `bank`, `kontoinhaber`, `buerge_versicherer`, `urkundennummer`, `getrennt_angelegt`,
   * `zinsmethode`) or their camelCase aliases (`sollBetrag`, `mieteBeiVertragsschluss`, `interneNotiz`,
   * `buergeVersicherer`, `getrenntAngelegt`).
   * Empty string or `null` clears `miete_bei_vertragsschluss`, `interne_notiz` and the text fields of phase 3.
   * `zinsmethode` cannot be cleared (`null` is rejected).
   */
  felder: Record<string, string | number | boolean | null>;
}

export interface BucheKautionBewegungInput {
  tenantId: string;
  kautionId: string;
  /** `einzahlung`, `zinsgutschrift`, `auszahlung`, `abzug`. */
  art: KautionBewegungsArt;
  betrag: string;
  /** Value date `YYYY-MM-DD`, not in the future. */
  wertstellung: string;
  /** Mandatory for `abzug`, not allowed otherwise. */
  kategorie?: KautionAbzugKategorie;
  /** Mandatory (3 to 500 characters) for `auszahlung` and `abzug`; optional for `zinsgutschrift`. */
  grund?: string;
  interneNotiz?: string;
  empfaenger?: string;
  /** Interest period `YYYY-MM-DD` (from, inclusive). Mandatory for `zinsgutschrift`, not forwarded for other types. */
  zinszeitraumVon?: string;
  /** Interest period `YYYY-MM-DD` (to, exclusive). Mandatory for `zinsgutschrift`, not forwarded for other types. */
  zinszeitraumBis?: string;
  /** `crypto.randomUUID()`, generated once per opening of the form: a repeated request books nothing twice. */
  idempotenzSchluessel: string;
  /** Optional rate of the instalment plan the deposit payment is assigned to. Only allowed for `einzahlung`. */
  rateId?: string;
}

/** One row of the interest schedule as the form sends it. The rate is the text as typed (strictly parsed). */
export interface ZinsstaffelEingabe {
  /** Valid from `YYYY-MM-DD`, strictly ascending. */
  gueltigAb: string;
  /** Rate in percent, e.g. `"1,5"` or `"1.50"` (0 to 100, at most 4 decimal places). */
  zinssatzProzent: string;
}

export interface PlaneKautionZinsstaffelInput {
  kautionId: string;
  /** The complete schedule (0 to 20 rows). An empty list removes it. It replaces the schedule as a whole. */
  staffel: ZinsstaffelEingabe[];
}

export interface BerechneKautionZinsenInput {
  kautionId: string;
  /** Start of the period `YYYY-MM-DD` (inclusive). Empty: the database default (after the last credit, else first deposit). */
  von?: string | null;
  /** End of the period `YYYY-MM-DD` (exclusive). Empty: the database default (today). */
  bis?: string | null;
}

/** One rate of an instalment plan as the form sends it. The amount is the text as typed (strictly parsed). */
export interface PlanRateInput {
  /** Due date `YYYY-MM-DD`. */
  faelligkeitsdatum: string;
  /** Target amount of the rate, e.g. `"333,33"` or `"333.33"` (strict parsing, greater than 0). */
  sollBetrag: string;
}

export interface PlaneKautionRatenInput {
  kautionId: string;
  /**
   * The complete plan (0 to 3 rates, due-date order, strictly ascending). An empty list removes the plan. The rates
   * replace the plan as a whole, they are not changed one by one.
   */
  raten: PlanRateInput[];
}

export interface StorniereKautionBewegungInput {
  tenantId: string;
  bewegungId: string;
  /** 3 to 500 characters. */
  grund: string;
}

export interface DeleteKautionInput {
  tenantId: string;
  kautionId: string;
}

export interface GetKautionAbrechnungInput {
  tenantId: string;
  /** Settlement date `YYYY-MM-DD` (not before 1990, not in the future: the database decides). Empty: today. */
  stichtag?: string | null;
}

export interface SetzeKautionEinbehaltInput {
  kautionId: string;
  /** Reason, 3 to 500 characters. Removes the hold together with `seit: null`. */
  grund: string | null;
  /** Date `YYYY-MM-DD`. Removes the hold together with `grund: null`. */
  seit: string | null;
}

type Step<T> = { ok: true; data: T } | { ok: false; error: KautionActionError };

// ---------------------------------------------------------------------------
// Helpers (not exported: a "use server" file only exports async actions)
// ---------------------------------------------------------------------------

const MSG_UNGUELTIGE_EINGABE = "Die Eingabe ist ungültig.";

/**
 * Message for a locked plan (`KA009`). The database uses the generic lock code for deletions too; for the plan the
 * text is fixed here, so no database text reaches the user unchecked.
 */
const MSG_RATENPLAN_GESPERRT = "Der Ratenplan kann nicht mehr geändert werden, weil bereits Zahlungen zugeordnet sind.";

/** Message for a locked interest schedule (`KA009`): rows for already credited periods cannot change. */
const MSG_ZINSSTAFFEL_GESPERRT = "Die Zinsstaffel kann für bereits gutgeschriebene Zeiträume nicht mehr geändert werden.";

/** Start of the message `ensureAuth` throws for "not signed in" (`lib/auth-utils.ts`); other errors are not a login problem. */
const NOT_SIGNED_IN_MESSAGE_PREFIX = "Nicht authentifiziert";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** Maps the error of an RPC call to the action error (message and code, never `details`/`hint`). */
function fromRpcError(error: KautionRpcError): KautionActionError {
  const mapped = mapKautionError(error);
  return { code: mapped.code, message: mapped.message };
}

/** Error with the UI text of the central mapping (`lib/kautionen-errors.ts`). */
function mappedError(code: string): KautionActionError {
  return fromRpcError({ code });
}

/** Validation error (`KA004`) with an own German message. */
function invalid(message: string = MSG_UNGUELTIGE_EINGABE): KautionActionError {
  return { code: "KA004", message };
}

function fail<T>(error: KautionActionError): Step<T> {
  return { ok: false, error };
}

/** Log attributes: only enumerations and the error code. Never IDs of persons, names, amounts or free texts. */
function buildLogAttributes(art: string | undefined, code: string | undefined): LogAttributes {
  const attributes: LogAttributes = {};
  if (art) attributes.art = art;
  if (code) attributes.code = code;
  return attributes;
}

/** `art` for the log, only if it is one of the known enumeration values (client input is untrusted). */
function safeLogArt(value: unknown, isKnown: (candidate: unknown) => boolean): string | undefined {
  return typeof value === "string" && isKnown(value) ? value : undefined;
}

interface RunOptions<T> {
  /** Name for the log, e.g. `createKaution`. */
  actionName: string;
  /** Tenant ID from the client. Only used (validated, scope-checked) if `mieterScope` is set. */
  tenantId?: unknown;
  /**
   * `true` for actions where the tenant IS the object (details, create): `tenantId` must be a valid ID and the object
   * scope is checked. `false` for actions that get a deposit or booking ID: the RPCs check the object scope themselves.
   * Required, so a new action has to decide explicitly (a missing `tenantId` then still fails, it is not skipped).
   */
  mieterScope: boolean;
  aktion: KautionAktion;
  logArt?: string;
  /** Calls `revalidatePath('/mieter')` after success (default: yes). Reading actions pass `false`. */
  revalidate?: boolean;
  /** Log successful runs (default: yes). Reading actions only log failures. */
  logSuccess?: boolean;
  /** Validation and RPC call. Runs only after sign-in, module right and (if `tenantId` is given) object scope are checked. */
  run: (supabase: SupabaseClient, tenantId: string) => Promise<Step<T>>;
}

/**
 * Common flow of every action (spec 4.5): sign-in -> module right -> object scope (only with `tenantId`) -> `run`
 * (validation + RPC) -> revalidation -> log. Expected errors are returned, unexpected ones are caught and logged by
 * code only.
 *
 * The object scope stage exists only where the tenant ID is the object itself (details, create). For update, book,
 * cancel and delete the client sends a tenant ID next to a `kautionId`/`bewegungId`, but nothing binds the two, so
 * a check of the tenant would give false assurance. There the database is authoritative: the RPCs and
 * `soft_delete_record` derive the tenant from the deposit or booking and check the object scope fail-closed
 * (`KA002`, `kautionen_pruefe_objektzugriff`). The tests of this file only cover how the action maps that database
 * error; the rejection itself is covered by the pgTAP tests of the database repository.
 */
async function runKautionAction<T>(options: RunOptions<T>): Promise<KautionActionResult<T>> {
  const { actionName, tenantId, mieterScope, aktion, logArt, revalidate = true, logSuccess = true, run } = options;

  const failure = (error: KautionActionError): KautionActionResult<T> => {
    // Known, expected rejections (right, scope, validation, strict balance, ...) are "failed", everything the
    // mapping could not classify is "error".
    const unexpected = error.message === KAUTION_FEHLER_FALLBACK_MESSAGE;
    logAction(actionName, unexpected ? "error" : "failed", buildLogAttributes(logArt, error.code));
    return { success: false, error };
  };

  // 1. Sign-in. Only the "not signed in" case of `ensureAuth` means KA001 (sign in again); any other failure
  //    (e.g. the client cannot be created) is an infrastructure error and must not send the user to the login.
  let supabase: SupabaseClient;
  try {
    ({ supabase } = await ensureAuth());
  } catch (authError) {
    unstable_rethrow(authError);
    if (authError instanceof Error && authError.message.startsWith(NOT_SIGNED_IN_MESSAGE_PREFIX)) {
      return failure(mappedError("KA001"));
    }
    logAction(actionName, "error", buildLogAttributes(logArt, "AUTH_UNAVAILABLE"));
    return { success: false, error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } };
  }

  try {
    // 2. Module right (first stage; the RPC checks it again). Every write RPC and `get_kaution_vorschlag` also
    //    require `ansehen` in the database (a write right does not imply the read right there: a member with only
    //    `erstellen`/`bearbeiten`/`loeschen` gets 42501). Same error as for a missing right, no RPC call.
    //    Both checks run in parallel; the right of the action itself is requested first.
    const needsReadRight = aktion !== "ansehen";
    const [darfAktion, darfAnsehen] = await Promise.all([
      hasPermission("kautionen", aktion),
      needsReadRight ? hasPermission("kautionen", "ansehen") : Promise.resolve(true),
    ]);
    if (!darfAktion || !darfAnsehen) {
      return failure(mappedError("42501"));
    }

    // 3. Object scope, fail-closed (database helper `kautionen_pruefe_objektzugriff`), only where the tenant is the
    //    object. A malformed ID is rejected before the call.
    let scopedTenantId = "";
    if (mieterScope) {
      const tenantIdCheck = validateUuid(tenantId, "Mieter-ID");
      if (!tenantIdCheck.ok) return failure(invalid(tenantIdCheck.message));
      scopedTenantId = tenantIdCheck.value;
      let scope: Awaited<ReturnType<typeof checkKautionScope>>;
      try {
        scope = await checkKautionScope(supabase, scopedTenantId);
      } catch (scopeError) {
        unstable_rethrow(scopeError);
        scope = { ok: false, error: { code: "KA002", message: mappedError("KA002").message } };
      }
      if (!scope.ok) return failure(mappedError("KA002"));
    }

    // 4.-5. Validation and RPC
    const step = await run(supabase, scopedTenantId);
    if (!step.ok) return failure(step.error);

    // 6. Revalidation and log
    if (revalidate) revalidatePath("/mieter");
    if (logSuccess) logAction(actionName, "success", buildLogAttributes(logArt, undefined));
    return { success: true, data: step.data };
  } catch (error) {
    unstable_rethrow(error);
    // Log the kind only: the message of an exception could contain request details.
    logAction(actionName, "error", buildLogAttributes(logArt, "UNEXPECTED"));
    return { success: false, error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } };
  }
}

/** Calls an RPC and maps its error. */
async function callRpc(supabase: SupabaseClient, name: string, args: Record<string, unknown>): Promise<Step<unknown>> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) return fail(fromRpcError(error));
  return { ok: true, data };
}

/**
 * Error of `soft_delete_record`. The shared function raises plain English messages without a deposit SQLSTATE for
 * "no right", "outside the object scope" and "not found"; those are mapped to the deposit messages (by text,
 * only when no `KA...` code is set). Everything else goes through the normal mapping.
 */
function fromSoftDeleteError(error: KautionRpcError): KautionActionError {
  const hasDepositCode = typeof error.code === "string" && error.code.startsWith("KA");
  const message = typeof error.message === "string" ? error.message : "";
  if (!hasDepositCode) {
    if (/^Permission denied: record is outside your object scope/i.test(message)) return mappedError("KA002");
    if (/^Permission denied/i.test(message)) return mappedError("42501");
    if (/^Record not found/i.test(message)) return mappedError("KA003");
  }
  return fromRpcError(error);
}

/** Amount input -> exact decimal string for the RPC (`"1500.00"`), or a validation error. */
function parseBetrag(value: unknown, label: string, options: { allowZero?: boolean } = {}): Step<string> {
  if (typeof value !== "string" && typeof value !== "number") return fail(invalid(`${label}: Bitte geben Sie einen Betrag an.`));
  const parsed = parseMoneyInput(value);
  if (!parsed.ok || (parsed.cents === 0 && !options.allowZero)) {
    // Rejected: only now the message is looked up (this parses again, but only on the error path).
    return fail(invalid(getMoneyInputError(value, options) ?? MSG_UNGUELTIGE_EINGABE));
  }
  return { ok: true, data: centsToDecimalString(parsed.cents) };
}

/** `kautionsart`: known value (`KA004` otherwise) that is released in this phase (`KA015` otherwise). */
function checkKautionsart(value: unknown): Step<KautionArt> {
  if (!isKautionArt(value)) return fail(invalid("Die Kautionsart ist ungültig."));
  if (!KAUTION_ARTEN_VERFUEGBAR.includes(value)) return fail(mappedError("KA015"));
  return { ok: true, data: value };
}

/**
 * Form check of the interest proposal from the RPC (`KautionZinsVorschlag`, see `types/Kaution.ts`). Only the fields
 * the app reads are checked; an unexpected shape is an unclassified error, never shown as a proposal.
 */
function istZinsVorschlag(value: unknown): value is KautionZinsVorschlag {
  const feld = asRecord(value);
  if (typeof feld.moeglich !== "boolean") return false;
  if (typeof feld.von !== "string" || typeof feld.bis !== "string") return false;
  if (!isKautionZinsmethode(feld.methode)) return false;
  if (feld.moeglich === false) return feld.grund === "KEIN_ZINSSATZ" || feld.grund === "ZEITRAUM_ZU_LANG";
  return (
    typeof feld.betrag === "number" &&
    typeof feld.betrag_exakt === "string" &&
    Array.isArray(feld.staffel) &&
    Array.isArray(feld.segmente)
  );
}

/**
 * Form check of the settlement from the RPC (`KautionAbrechnung`, see `types/Kaution.ts`). Only the parts the view and
 * the PDF read are checked; an unexpected shape is an unclassified error, never shown or sent to the worker.
 */
function istKautionAbrechnung(value: unknown): value is KautionAbrechnung {
  const feld = asRecord(value);
  return (
    typeof feld.stichtag === "string" &&
    typeof feld.konto === "object" &&
    feld.konto !== null &&
    !Array.isArray(feld.konto) &&
    Array.isArray(feld.abzuege) &&
    Array.isArray(feld.bewegungen)
  );
}

/** Agreement fields of phase 3 as the database keys (the names of `KautionVereinbarungsFeld`). */
type PhaseDreiWert = string | boolean | null;

/** Validated phase 3 agreement values for the RPC: `null` means "clear" (update only). */
type PhaseDreiDaten = Partial<Record<KautionVereinbarungsFeld, PhaseDreiWert>>;

/** Validation of one phase 3 agreement field with its own rule (the message names the field, never the value). */
function pruefePhaseDreiFeld(feld: KautionVereinbarungsFeld, wert: unknown): ValidationResult<PhaseDreiWert> {
  switch (feld) {
    case "iban":
      return validateKautionIban(wert);
    case "zinsmethode":
      return validateKautionZinsmethode(wert);
    case "getrennt_angelegt":
      return validateKautionGetrennt(wert);
    case "bank":
      return validateKautionText(wert, { label: "Die Bank", max: KAUTION_TEXT_LIMITS.bank.max });
    case "kontoinhaber":
      return validateKautionText(wert, { label: "Der Kontoinhaber", max: KAUTION_TEXT_LIMITS.kontoinhaber.max });
    case "buerge_versicherer":
      return validateKautionText(wert, { label: "Der Bürge bzw. Versicherer", max: KAUTION_TEXT_LIMITS.buergeVersicherer.max });
    case "urkundennummer":
      return validateKautionText(wert, { label: "Die Urkundennummer", max: KAUTION_TEXT_LIMITS.urkundennummer.max });
  }
}

/**
 * Validates the phase 3 agreement fields of one request. `werte` holds only the fields the caller received (database key
 * -> raw client value). `anlegen`: `null` means "not given" and is left out. `aendern`: `null` or an empty text clears
 * the field, `zinsmethode` cannot be cleared. `art` is the deposit type when this request knows it (create, or update
 * with `kautionsart`): then every filled field must belong to that type (`KA004` otherwise). Without it the database
 * decides.
 */
function pruefePhaseDreiFelder(
  werte: ReadonlyMap<KautionVereinbarungsFeld, unknown>,
  art: KautionArt | undefined,
  modus: "anlegen" | "aendern"
): Step<PhaseDreiDaten> {
  const daten: PhaseDreiDaten = {};
  for (const [feld, wert] of werte) {
    if (wert === null && modus === "anlegen") continue;
    const geprueft = pruefePhaseDreiFeld(feld, wert);
    if (!geprueft.ok) return fail(invalid(geprueft.message));
    daten[feld] = geprueft.value;
  }

  if (art !== undefined) {
    const gefuellt = (Object.keys(daten) as KautionVereinbarungsFeld[]).filter((feld) => daten[feld] !== null);
    const passt = validateKautionArtFelder(art, gefuellt);
    if (!passt.ok) return fail(invalid(passt.message));
  }
  return { ok: true, data: daten };
}

/** Phase 3 agreement fields with their accepted input names (database key and camelCase alias). */
const PHASE_DREI_FELDER = new Map<string, KautionVereinbarungsFeld>([
  ["iban", "iban"],
  ["bank", "bank"],
  ["kontoinhaber", "kontoinhaber"],
  ["buerge_versicherer", "buerge_versicherer"],
  ["buergeVersicherer", "buerge_versicherer"],
  ["urkundennummer", "urkundennummer"],
  ["getrennt_angelegt", "getrennt_angelegt"],
  ["getrenntAngelegt", "getrennt_angelegt"],
  ["zinsmethode", "zinsmethode"],
]);

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Details of the deposit of a tenant in one consistent snapshot (`get_kaution_details`) plus the module rights
 * of the user (for enabling/disabling buttons; the server stays authoritative) and, if there is no deposit yet
 * and the user may create one, the suggested amount (`get_kaution_vorschlag`).
 * `details` is `null` while the tenant has no deposit.
 */
export async function getKautionDetailsAction(
  tenantId: string
): Promise<KautionActionResult<{ details: KautionDetails | null; rechte: KautionRechte; vorschlag: KautionVorschlag | null }>> {
  return runKautionAction({
    actionName: "getKautionDetails",
    tenantId,
    mieterScope: true,
    aktion: "ansehen",
    revalidate: false,
    logSuccess: false,
    run: async (supabase, id) => {
      // The module rights and the details are independent: load them in parallel.
      const [detailsStep, erstellen, bearbeiten, loeschen] = await Promise.all([
        callRpc(supabase, "get_kaution_details", { p_mieter_id: id }),
        hasPermission("kautionen", "erstellen"),
        hasPermission("kautionen", "bearbeiten"),
        hasPermission("kautionen", "loeschen"),
      ]);
      if (!detailsStep.ok) return fail(detailsStep.error);

      const details = (detailsStep.data ?? null) as KautionDetails | null;
      const rechte: KautionRechte = { ansehen: true, erstellen, bearbeiten, loeschen };

      let vorschlag: KautionVorschlag | null = null;
      if (details === null && erstellen) {
        const vorschlagStep = await callRpc(supabase, "get_kaution_vorschlag", { p_mieter_id: id });
        if (vorschlagStep.ok) {
          vorschlag = (vorschlagStep.data ?? null) as KautionVorschlag | null;
        } else if (vorschlagStep.error.code === "KA002" || vorschlagStep.error.code === "KA003") {
          // The tenant is not accessible (anymore): do not show the creation form for it.
          return fail(vorschlagStep.error);
        }
        // Other errors: the suggestion is a convenience, the form works without it.
      }

      return { ok: true, data: { details, rechte, vorschlag } };
    },
  });
}

// ---------------------------------------------------------------------------
// Interest proposal (phase 3, read only)
// ---------------------------------------------------------------------------

/**
 * Interest proposal for a period (`kaution_zinsen_berechnen`), calculated by the database. Without a period the database
 * uses its defaults (from the end of the last credit or the first deposit, to today). `null` when the deposit is not
 * visible or is not a bank account type. Nothing is changed and nothing is logged on success.
 */
export async function berechneKautionZinsenAction(input: BerechneKautionZinsenInput): Promise<KautionActionResult<KautionZinsVorschlag | null>> {
  const raw = asRecord(input);
  return runKautionAction({
    actionName: "berechneKautionZinsen",
    mieterScope: false,
    aktion: "ansehen",
    revalidate: false,
    logSuccess: false,
    run: async (supabase) => {
      const kautionId = validateUuid(raw.kautionId, "Kautions-ID");
      if (!kautionId.ok) return fail(invalid(kautionId.message));

      let von: string | null = null;
      if (raw.von !== undefined && raw.von !== null) {
        const datum = validateKautionDatum(raw.von, "Der Zinszeitraum (von)");
        if (!datum.ok) return fail(invalid(datum.message));
        von = datum.value;
      }
      let bis: string | null = null;
      if (raw.bis !== undefined && raw.bis !== null) {
        const datum = validateKautionDatum(raw.bis, "Der Zinszeitraum (bis)");
        if (!datum.ok) return fail(invalid(datum.message));
        bis = datum.value;
      }

      // An invalid period (order, future, more than 10 years) is decided by the database (KA013, fixed text).
      const result = await callRpc(supabase, "kaution_zinsen_berechnen", { p_kaution_id: kautionId.value, p_von: von, p_bis: bis });
      if (!result.ok) return fail(result.error);
      if (result.data === null) return { ok: true, data: null };
      // Defensive: the shape is checked before it reaches the UI.
      if (!istZinsVorschlag(result.data)) return fail({ message: KAUTION_FEHLER_FALLBACK_MESSAGE });
      return { ok: true, data: result.data };
    },
  });
}

// ---------------------------------------------------------------------------
// Impact of deleting a house, apartment or tenant
// ---------------------------------------------------------------------------

export interface KautionLoeschauswirkungInput {
  tabelle: KautionLoeschTabelle;
  /** IDs of the same table (bulk deletion: one overview for all of them). */
  ids: string[];
}

/** Limit of the database function (`get_kautionen_loeschauswirkung`) per request: larger selections are requested in chunks. */
const MAX_LOESCH_IDS_JE_ANFRAGE = 200;

/** Upper bound of one overview (a selection beyond this is not offered for deletion in one go). */
const MAX_LOESCH_IDS = 2000;

const LOESCH_TABELLEN: readonly string[] = ["Haeuser", "Wohnungen", "Mieter"];

/**
 * What deleting the given houses, apartments or tenants means for the deposits (`get_kautionen_loeschauswirkung`):
 * counts, amounts "still open" and "held" (deposit accounts only), guarantees/insurances separately, tenants with
 * a balance and a checksum to send back when confirming. All figures come from the database.
 *
 * Without the module right `kautionen: ansehen` this action fails with `42501` (the caller then deletes without the
 * overview; the database still blocks deposits with bookings). The database checks the object scope itself.
 */
export async function getKautionLoeschauswirkungAction(
  input: KautionLoeschauswirkungInput
): Promise<KautionActionResult<KautionLoeschauswirkung>> {
  const raw = asRecord(input);
  return runKautionAction({
    actionName: "getKautionLoeschauswirkung",
    mieterScope: false,
    aktion: "ansehen",
    logArt: safeLogArt(raw.tabelle, (candidate) => typeof candidate === "string" && LOESCH_TABELLEN.includes(candidate)),
    revalidate: false,
    logSuccess: false,
    run: async (supabase) => {
      if (typeof raw.tabelle !== "string" || !LOESCH_TABELLEN.includes(raw.tabelle)) return fail(invalid());
      if (!Array.isArray(raw.ids) || raw.ids.length === 0) return fail(invalid());
      if (raw.ids.length > MAX_LOESCH_IDS) {
        return fail(invalid(`Bitte wählen Sie höchstens ${MAX_LOESCH_IDS} Einträge gleichzeitig aus.`));
      }
      // Set statt Array.includes: bis zu 2000 IDs, doppelte fallen weg (Reihenfolge bleibt erhalten)
      const eindeutig = new Set<string>();
      for (const candidate of raw.ids) {
        const id = validateUuid(candidate, "ID");
        if (!id.ok) return fail(invalid(id.message));
        eindeutig.add(id.value);
      }
      const ids = Array.from(eindeutig);

      // The database function takes at most 200 IDs: a larger selection is asked for in chunks and combined here (on the server).
      const teile: KautionLoeschauswirkung[] = [];
      for (const chunk of chunkIds(ids, MAX_LOESCH_IDS_JE_ANFRAGE)) {
        const result = await callRpc(supabase, "get_kautionen_loeschauswirkung", { p_tabelle: raw.tabelle, p_ids: chunk });
        if (!result.ok) return fail(result.error);
        const data = asRecord(result.data);
        if (typeof data.anzahl_mieter !== "number" || !Array.isArray(data.eintraege)) return fail({ message: KAUTION_FEHLER_FALLBACK_MESSAGE });
        teile.push(data as unknown as KautionLoeschauswirkung);
      }
      return { ok: true, data: mergeLoeschauswirkung(teile) };
    },
  });
}

// ---------------------------------------------------------------------------
// Create / change
// ---------------------------------------------------------------------------

/** Creates the deposit of a tenant (`kaution_anlegen`). One active deposit per tenant (`KA008` otherwise). */
export async function createKautionAction(input: CreateKautionInput): Promise<KautionActionResult<{ kautionId: string }>> {
  const raw = asRecord(input);
  return runKautionAction({
    actionName: "createKaution",
    tenantId: raw.tenantId,
    mieterScope: true,
    aktion: "erstellen",
    logArt: safeLogArt(raw.kautionsart, isKautionArt),
    run: async (supabase, tenantId) => {
      const daten: Record<string, unknown> = {};

      // Omitted = bar deposit (database default). The type is known here, so the agreement fields are checked against it.
      let art: KautionArt = "barkaution";
      if (raw.kautionsart !== undefined && raw.kautionsart !== null) {
        const gewaehlt = checkKautionsart(raw.kautionsart);
        if (!gewaehlt.ok) return fail(gewaehlt.error);
        art = gewaehlt.data;
        daten.kautionsart = art;
      }

      const soll = parseBetrag(raw.sollBetrag, "Soll-Betrag");
      if (!soll.ok) return fail(soll.error);
      daten.soll_betrag = soll.data;

      // undefined/empty: key omitted (the database copies the current rent), null: deliberately empty.
      const miete = raw.mieteBeiVertragsschluss;
      if (miete === null) {
        daten.miete_bei_vertragsschluss = null;
      } else if (miete !== undefined && !(typeof miete === "string" && miete.trim() === "")) {
        const betrag = parseBetrag(miete, "Miete bei Vertragsschluss", { allowZero: true });
        if (!betrag.ok) return fail(betrag.error);
        daten.miete_bei_vertragsschluss = betrag.data;
      }

      const notiz = validateKautionText(raw.interneNotiz, { label: "Die interne Notiz", max: KAUTION_TEXT_LIMITS.interneNotiz.max });
      if (!notiz.ok) return fail(invalid(notiz.message));
      if (notiz.value !== null) daten.interne_notiz = notiz.value;

      // Phase 3 agreement fields: only the whitelisted camelCase inputs, `null` = not given.
      const werte = new Map<KautionVereinbarungsFeld, unknown>();
      for (const [eingabe, feld] of [
        ["iban", "iban"],
        ["bank", "bank"],
        ["kontoinhaber", "kontoinhaber"],
        ["buergeVersicherer", "buerge_versicherer"],
        ["urkundennummer", "urkundennummer"],
        ["getrenntAngelegt", "getrennt_angelegt"],
        ["zinsmethode", "zinsmethode"],
      ] as const) {
        if (raw[eingabe] !== undefined) werte.set(feld, raw[eingabe]);
      }
      const phaseDrei = pruefePhaseDreiFelder(werte, art, "anlegen");
      if (!phaseDrei.ok) return fail(phaseDrei.error);
      for (const [feld, wert] of Object.entries(phaseDrei.data)) {
        if (wert !== null) daten[feld] = wert;
      }

      const result = await callRpc(supabase, "kaution_anlegen", { p_mieter_id: tenantId, p_daten: daten });
      if (!result.ok) return fail(result.error);
      if (typeof result.data !== "string") return fail({ message: KAUTION_FEHLER_FALLBACK_MESSAGE });
      return { ok: true, data: { kautionId: result.data } };
    },
  });
}

/** Maps the accepted field names (database keys and camelCase aliases) to the database keys. */
const VEREINBARUNG_FELDER = new Map<string, "soll_betrag" | "miete_bei_vertragsschluss" | "interne_notiz" | "kautionsart">([
  ["soll_betrag", "soll_betrag"],
  ["sollBetrag", "soll_betrag"],
  ["miete_bei_vertragsschluss", "miete_bei_vertragsschluss"],
  ["mieteBeiVertragsschluss", "miete_bei_vertragsschluss"],
  ["interne_notiz", "interne_notiz"],
  ["interneNotiz", "interne_notiz"],
  ["kautionsart", "kautionsart"],
]);

/** Changes the agreement of an existing deposit (`kaution_aendern`): target amount, rent at contract date, note. */
export async function updateKautionVereinbarungAction(input: UpdateKautionVereinbarungInput): Promise<KautionActionResult> {
  const raw = asRecord(input);
  return runKautionAction({
    actionName: "updateKautionVereinbarung",
    mieterScope: false,
    aktion: "bearbeiten",
    run: async (supabase) => {
      const kautionId = validateUuid(raw.kautionId, "Kautions-ID");
      if (!kautionId.ok) return fail(invalid(kautionId.message));

      const felder = asRecord(raw.felder);
      const schluessel = Object.keys(felder);
      if (schluessel.length === 0) return fail(invalid("Keine Änderung angegeben."));

      const daten: Record<string, unknown> = {};
      const phaseDreiWerte = new Map<KautionVereinbarungsFeld, unknown>();
      for (const key of schluessel) {
        const feld = VEREINBARUNG_FELDER.get(key);
        if (!feld) {
          // Phase 3 agreement fields are validated together below (type fit needs the whole request).
          const phaseDrei = PHASE_DREI_FELDER.get(key);
          if (!phaseDrei) return fail(invalid("Die Änderung enthält ein unbekanntes Feld."));
          if (phaseDreiWerte.has(phaseDrei)) return fail(invalid("Ein Feld wurde mehrfach angegeben."));
          phaseDreiWerte.set(phaseDrei, felder[key]);
          continue;
        }
        if (Object.prototype.hasOwnProperty.call(daten, feld)) return fail(invalid("Ein Feld wurde mehrfach angegeben."));
        const value = felder[key];

        if (feld === "soll_betrag") {
          const betrag = parseBetrag(value, "Soll-Betrag");
          if (!betrag.ok) return fail(betrag.error);
          daten[feld] = betrag.data;
        } else if (feld === "miete_bei_vertragsschluss") {
          if (value === null || (typeof value === "string" && value.trim() === "")) {
            daten[feld] = null;
          } else {
            const betrag = parseBetrag(value, "Miete bei Vertragsschluss", { allowZero: true });
            if (!betrag.ok) return fail(betrag.error);
            daten[feld] = betrag.data;
          }
        } else if (feld === "interne_notiz") {
          const notiz = validateKautionText(value, { label: "Die interne Notiz", max: KAUTION_TEXT_LIMITS.interneNotiz.max });
          if (!notiz.ok) return fail(invalid(notiz.message));
          daten[feld] = notiz.value; // empty or null clears the note
        } else {
          const art = checkKautionsart(value);
          if (!art.ok) return fail(art.error);
          daten[feld] = art.data;
        }
      }

      // Type fit only where the request names the type (`kautionsart`); otherwise the database decides.
      const art = typeof daten.kautionsart === "string" ? (daten.kautionsart as KautionArt) : undefined;
      const phaseDrei = pruefePhaseDreiFelder(phaseDreiWerte, art, "aendern");
      if (!phaseDrei.ok) return fail(phaseDrei.error);
      Object.assign(daten, phaseDrei.data);

      const result = await callRpc(supabase, "kaution_aendern", { p_kaution_id: kautionId.value, p_daten: daten });
      if (!result.ok) return fail(result.error);
      return { ok: true, data: undefined };
    },
  });
}

// ---------------------------------------------------------------------------
// Instalment plan (phase 2)
// ---------------------------------------------------------------------------

/**
 * Replaces the instalment plan of a deposit as a whole (`kaution_raten_planen`); an empty list removes it. The rates
 * are validated here (count, strict amounts, real dates, ascending order); the database checks the object scope and
 * the lock (`KA009` once payments are assigned). The database does not require the rates to add up to the target
 * amount: the form only warns about a difference.
 */
export async function planeKautionRatenAction(input: PlaneKautionRatenInput): Promise<KautionActionResult> {
  const raw = asRecord(input);
  return runKautionAction({
    actionName: "planeKautionRaten",
    mieterScope: false,
    aktion: "bearbeiten",
    run: async (supabase) => {
      const kautionId = validateUuid(raw.kautionId, "Kautions-ID");
      if (!kautionId.ok) return fail(invalid(kautionId.message));

      if (!Array.isArray(raw.raten)) return fail(invalid("Der Ratenplan ist ungültig."));
      if (raw.raten.length > KAUTION_RATEN_MAX_ANZAHL) {
        return fail(invalid(`Ein Ratenplan hat höchstens ${KAUTION_RATEN_MAX_ANZAHL} Raten.`));
      }

      const raten: { faelligkeitsdatum: string; soll_betrag: string }[] = [];
      for (const eintrag of raw.raten) {
        const feld = asRecord(eintrag);
        const datum = validateKautionDatum(feld.faelligkeitsdatum, "Das Fälligkeitsdatum");
        if (!datum.ok) return fail(invalid(datum.message));
        const betrag = parseBetrag(feld.sollBetrag, "Der Betrag der Rate");
        if (!betrag.ok) return fail(betrag.error);

        // Strictly ascending: ISO dates compare correctly as text.
        const vorige = raten[raten.length - 1];
        if (vorige && datum.value <= vorige.faelligkeitsdatum) {
          return fail(invalid("Die Fälligkeitsdaten müssen in aufsteigender Reihenfolge liegen."));
        }
        raten.push({ faelligkeitsdatum: datum.value, soll_betrag: betrag.data });
      }

      const result = await callRpc(supabase, "kaution_raten_planen", { p_kaution_id: kautionId.value, p_raten: raten });
      if (!result.ok) {
        if (result.error.code === "KA009") return fail({ code: "KA009", message: MSG_RATENPLAN_GESPERRT });
        return fail(result.error);
      }
      return { ok: true, data: undefined };
    },
  });
}

// ---------------------------------------------------------------------------
// Interest schedule (phase 3)
// ---------------------------------------------------------------------------

/**
 * Replaces the interest schedule of a bank account deposit as a whole (`kaution_zinsstaffel_setzen`); an empty list
 * removes it. The rows are validated here (count, real dates, strictly ascending, strict rates); the database checks the
 * object scope and the lock: `KA009` once a credit covers the period (fixed text), `KA015` for guarantee and insurance.
 */
export async function planeKautionZinsstaffelAction(input: PlaneKautionZinsstaffelInput): Promise<KautionActionResult> {
  const raw = asRecord(input);
  return runKautionAction({
    actionName: "planeKautionZinsstaffel",
    mieterScope: false,
    aktion: "bearbeiten",
    run: async (supabase) => {
      const kautionId = validateUuid(raw.kautionId, "Kautions-ID");
      if (!kautionId.ok) return fail(invalid(kautionId.message));

      const staffel = validateZinsstaffel(raw.staffel);
      if (!staffel.ok) return fail(invalid(staffel.message));

      const result = await callRpc(supabase, "kaution_zinsstaffel_setzen", { p_kaution_id: kautionId.value, p_staffel: staffel.value });
      if (!result.ok) {
        if (result.error.code === "KA009") return fail({ code: "KA009", message: MSG_ZINSSTAFFEL_GESPERRT });
        return fail(result.error);
      }
      return { ok: true, data: undefined };
    },
  });
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

/**
 * Books a movement (`kaution_buchen`): deposit, payout or deduction. The database checks the strict balance
 * (never negative on any date) under a row lock; a repeated request with the same `idempotenzSchluessel`
 * books nothing twice.
 */
export async function bucheKautionBewegungAction(input: BucheKautionBewegungInput): Promise<KautionActionResult<{ bewegungId: string }>> {
  const raw = asRecord(input);
  return runKautionAction({
    actionName: "bucheKautionBewegung",
    mieterScope: false,
    aktion: "erstellen",
    logArt: safeLogArt(raw.art, isKautionBewegungsArt),
    run: async (supabase) => {
      const kautionId = validateUuid(raw.kautionId, "Kautions-ID");
      if (!kautionId.ok) return fail(invalid(kautionId.message));

      const art = raw.art;
      if (!isKautionBewegungsArt(art)) return fail(invalid("Die Buchungsart ist ungültig."));
      if (!KAUTION_BEWEGUNGSARTEN_VERFUEGBAR.includes(art)) return fail(mappedError("KA015"));

      // Optional rate of the plan: a deposit payment only. Empty counts as "not given". The database checks that the
      // rate belongs to this deposit (KA004 otherwise).
      let rateId: string | null = null;
      if (raw.rateId !== undefined && raw.rateId !== null && raw.rateId !== "") {
        if (art !== "einzahlung") return fail(invalid("Eine Rate kann nur einer Einzahlung zugeordnet werden."));
        const rate = validateUuid(raw.rateId, "Raten-ID");
        if (!rate.ok) return fail(invalid(rate.message));
        rateId = rate.value;
      }

      const betrag = parseBetrag(raw.betrag, "Betrag");
      if (!betrag.ok) return fail(betrag.error);

      const wertstellung = validateKautionDatum(raw.wertstellung, "Wertstellung");
      if (!wertstellung.ok) return fail(invalid(wertstellung.message));

      // Interest period: mandatory for an interest credit only. Other booking types never forward it (the database
      // would reject it, and the client does not send it there anyway). The database checks the rest (KA013).
      let zinszeitraum: { von: string; bis: string } | null = null;
      if (art === "zinsgutschrift") {
        const periode = validateZinszeitraum(raw.zinszeitraumVon, raw.zinszeitraumBis);
        if (!periode.ok) return fail(invalid(periode.message));
        zinszeitraum = periode.value;
      }

      // The idempotency key is mandatory: without it a retry could book twice.
      const schluessel = validateUuid(raw.idempotenzSchluessel, "Kennung der Buchung");
      if (!schluessel.ok) return fail(invalid(schluessel.message));

      const mussGrundHaben = art === "auszahlung" || art === "abzug";
      const grund = validateKautionText(raw.grund, {
        label: "Der Grund",
        min: mussGrundHaben ? KAUTION_TEXT_LIMITS.grund.min : 0,
        max: KAUTION_TEXT_LIMITS.grund.max,
        required: mussGrundHaben,
      });
      if (!grund.ok) return fail(invalid(grund.message));

      // Category: mandatory for a deduction, not allowed for other types (empty counts as "not given").
      const kategorieText = typeof raw.kategorie === "string" ? raw.kategorie.trim() : raw.kategorie;
      let kategorie: KautionAbzugKategorie | null = null;
      if (kategorieText !== undefined && kategorieText !== null && kategorieText !== "") {
        if (!isKautionAbzugKategorie(kategorieText)) return fail(invalid("Die Kategorie ist ungültig."));
        kategorie = kategorieText;
      }
      if (art === "abzug" && kategorie === null) return fail(invalid("Für einen Abzug ist eine Kategorie erforderlich."));
      if (art !== "abzug" && kategorie !== null) return fail(invalid("Eine Kategorie ist nur bei Abzügen zulässig."));

      const notiz = validateKautionText(raw.interneNotiz, { label: "Die interne Notiz", max: KAUTION_TEXT_LIMITS.interneNotiz.max });
      if (!notiz.ok) return fail(invalid(notiz.message));
      const empfaenger = validateKautionText(raw.empfaenger, { label: "Der Empfänger", max: KAUTION_TEXT_LIMITS.empfaenger.max });
      if (!empfaenger.ok) return fail(invalid(empfaenger.message));

      // Only the keys the RPC accepts (any other key is rejected by the database with KA004). The server calculates the
      // proposal and the calculation basis itself: neither is ever sent from here.
      const details: Record<string, unknown> = { idempotenz_schluessel: schluessel.value };
      if (zinszeitraum !== null) {
        details.zinszeitraum_von = zinszeitraum.von;
        details.zinszeitraum_bis = zinszeitraum.bis;
      }
      if (rateId !== null) details.rate_id = rateId;
      if (kategorie !== null) details.kategorie = kategorie;
      if (grund.value !== null) details.grund = grund.value;
      if (notiz.value !== null) details.interne_notiz = notiz.value;
      if (empfaenger.value !== null) details.empfaenger = empfaenger.value;

      const result = await callRpc(supabase, "kaution_buchen", {
        p_kaution_id: kautionId.value,
        p_bewegungsart: art,
        p_betrag: betrag.data,
        p_wertstellung: wertstellung.value,
        p_details: details,
      });
      if (!result.ok) return fail(result.error);
      if (typeof result.data !== "string") return fail({ message: KAUTION_FEHLER_FALLBACK_MESSAGE });
      return { ok: true, data: { bewegungId: result.data } };
    },
  });
}

/**
 * Cancels a movement (`kaution_storno`): the row stays in the statement and no longer counts. A cancellation
 * runs through the strict balance like a payout (cancelling a deposit after a payout is rejected with `KA005`).
 * A correction is cancellation plus a new booking.
 */
export async function storniereKautionBewegungAction(input: StorniereKautionBewegungInput): Promise<KautionActionResult> {
  const raw = asRecord(input);
  return runKautionAction({
    actionName: "storniereKautionBewegung",
    mieterScope: false,
    aktion: "loeschen",
    run: async (supabase) => {
      const bewegungId = validateUuid(raw.bewegungId, "Buchungs-ID");
      if (!bewegungId.ok) return fail(invalid(bewegungId.message));

      const grund = validateKautionText(raw.grund, {
        label: "Der Stornogrund",
        min: KAUTION_TEXT_LIMITS.stornoGrund.min,
        max: KAUTION_TEXT_LIMITS.stornoGrund.max,
        required: true,
      });
      if (!grund.ok) return fail(invalid(grund.message));

      const result = await callRpc(supabase, "kaution_storno", { p_bewegung_id: bewegungId.value, p_grund: grund.value });
      if (!result.ok) return fail(result.error);
      return { ok: true, data: undefined };
    },
  });
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * Moves a deposit WITHOUT bookings to the trash bin (`soft_delete_record('Kautionen', id)`). A deposit with
 * bookings is locked by the database (`KA009`): corrections are made by cancellation.
 * `soft_delete_record` is a shared function whose generic errors have no SQLSTATE of the deposit module;
 * the two common ones are mapped to the deposit messages here.
 */
export async function deleteKautionAction(input: DeleteKautionInput): Promise<KautionActionResult> {
  const raw = asRecord(input);
  return runKautionAction({
    actionName: "deleteKaution",
    mieterScope: false,
    aktion: "loeschen",
    run: async (supabase) => {
      const kautionId = validateUuid(raw.kautionId, "Kautions-ID");
      if (!kautionId.ok) return fail(invalid(kautionId.message));

      const { error } = await supabase.rpc("soft_delete_record", { p_table_name: "Kautionen", p_record_id: kautionId.value });
      if (error) return fail(fromSoftDeleteError(error));
      return { ok: true, data: undefined };
    },
  });
}

// ---------------------------------------------------------------------------
// Receipts ("Belege", phase 2b)
// ---------------------------------------------------------------------------

export interface EntferneKautionBelegInput {
  /** Booking whose receipt link is removed. The file itself stays in the document management. */
  bewegungId: string;
}

export interface GetKautionBelegUrlInput {
  /** Document ID (`Dokumente_Metadaten.id`) of the receipt. */
  dokumentId: string;
}

/**
 * Removes the link between a booking and its receipt (`kaution_beleg_zuordnen` with `p_dokument_id = NULL`). The
 * document stays in the document management and can be linked again.
 */
export async function entferneKautionBelegAction(input: EntferneKautionBelegInput): Promise<KautionActionResult> {
  const raw = asRecord(input);
  return runKautionAction({
    actionName: "entferneKautionBeleg",
    mieterScope: false,
    aktion: "bearbeiten",
    run: async (supabase) => {
      const bewegungId = validateUuid(raw.bewegungId, "Buchungs-ID");
      if (!bewegungId.ok) return fail(invalid(bewegungId.message));

      const result = await callRpc(supabase, "kaution_beleg_zuordnen", { p_bewegung_id: bewegungId.value, p_dokument_id: null });
      if (!result.ok) return fail(result.error);
      return { ok: true, data: undefined };
    },
  });
}

/**
 * Short-lived download link of a receipt. The database returns the storage location only if the document is linked to a
 * deposit booking that the user may see (`get_kaution_beleg`, otherwise `KA003`). The link downloads under the
 * original name and is valid for `BELEG_DOWNLOAD_GUELTIG_SEKUNDEN` seconds. Nothing is revalidated (read action).
 */
export async function getKautionBelegUrlAction(input: GetKautionBelegUrlInput): Promise<KautionActionResult<{ url: string }>> {
  const raw = asRecord(input);
  return runKautionAction({
    actionName: "getKautionBelegUrl",
    mieterScope: false,
    aktion: "ansehen",
    revalidate: false,
    logSuccess: false,
    run: async (supabase) => {
      const dokumentId = validateUuid(raw.dokumentId, "Dokument-ID");
      if (!dokumentId.ok) return fail(invalid(dokumentId.message));

      const result = await callRpc(supabase, "get_kaution_beleg", { p_dokument_id: dokumentId.value });
      if (!result.ok) return fail(result.error);

      // NULL (not linked, not visible): the same answer as for a missing record.
      const beleg = asRecord(result.data);
      if (typeof beleg.dateipfad !== "string" || beleg.dateipfad === "" || typeof beleg.dateiname !== "string" || beleg.dateiname === "") {
        return fail(mappedError("KA003"));
      }

      const { data: signiert, error: signierFehler } = await supabase.storage
        .from(BELEG_STORAGE_BUCKET)
        .createSignedUrl(baueBelegPfad(beleg.dateipfad, beleg.dateiname), BELEG_DOWNLOAD_GUELTIG_SEKUNDEN, {
          download: anzeigeNameAusDateiname(beleg.dateiname),
        });
      if (signierFehler || typeof signiert?.signedUrl !== "string") {
        // Unclassified: the storage error itself is not passed on (no file names or paths in messages or logs).
        return fail({ message: KAUTION_FEHLER_FALLBACK_MESSAGE });
      }
      return { ok: true, data: { url: signiert.signedUrl } };
    },
  });
}

// ---------------------------------------------------------------------------
// Settlement (phase 4)
// ---------------------------------------------------------------------------

/**
 * Settlement figures of a tenant's deposit (`get_kaution_abrechnung`) for the settlement view and the PDF route. Read
 * only: nothing is changed and nothing is logged on success. `data` is `null` when the database answers NULL (deposit not
 * visible, or no account type); callers must not tell these cases apart. The settlement date defaults to today in the
 * database. Amounts are computed there, never here.
 */
export async function getKautionAbrechnungAction(input: GetKautionAbrechnungInput): Promise<KautionActionResult<KautionAbrechnung | null>> {
  const raw = asRecord(input);
  return runKautionAction({
    actionName: "getKautionAbrechnung",
    tenantId: raw.tenantId,
    mieterScope: true,
    aktion: "ansehen",
    revalidate: false,
    logSuccess: false,
    run: async (supabase, id) => {
      const stichtag = validateKautionStichtag(raw.stichtag);
      if (!stichtag.ok) return fail(invalid(stichtag.message));

      const result = await callRpc(supabase, "get_kaution_abrechnung", { p_mieter_id: id, p_stichtag: stichtag.value });
      if (!result.ok) return fail(result.error);
      if (result.data === null || result.data === undefined) return { ok: true, data: null };
      // Defensive: the shape is checked before it reaches the view or the worker.
      if (!istKautionAbrechnung(result.data)) return fail({ message: KAUTION_FEHLER_FALLBACK_MESSAGE });
      return { ok: true, data: result.data };
    },
  });
}

/**
 * Sets or removes the interest hold ("Einbehalt") of a deposit (`kaution_einbehalt_setzen`). It is NOT a booking: it only
 * documents reason and date; the amount still held is the balance. Both values empty removes the hold; only one of them
 * is an error (`KA004`, own message). The database checks the object scope, the right to edit, the balance (`KA004`
 * without balance), the date (`KA013`) and the deposit type (`KA014`).
 */
export async function setzeKautionEinbehaltAction(input: SetzeKautionEinbehaltInput): Promise<KautionActionResult> {
  const raw = asRecord(input);
  return runKautionAction({
    actionName: "setzeKautionEinbehalt",
    mieterScope: false,
    aktion: "bearbeiten",
    run: async (supabase) => {
      const kautionId = validateUuid(raw.kautionId, "Kautions-ID");
      if (!kautionId.ok) return fail(invalid(kautionId.message));

      const einbehalt = validateKautionEinbehalt(raw.grund, raw.seit);
      if (!einbehalt.ok) return fail(invalid(einbehalt.message));

      const result = await callRpc(supabase, "kaution_einbehalt_setzen", {
        p_kaution_id: kautionId.value,
        p_grund: einbehalt.value?.grund ?? null,
        p_seit: einbehalt.value?.seit ?? null,
      });
      if (!result.ok) return fail(result.error);
      return { ok: true, data: undefined };
    },
  });
}
