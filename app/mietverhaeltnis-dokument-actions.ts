"use server";

/**
 * Server actions for the contract document of a tenancy (GH-17, phase 4, document link).
 *
 * No upload and no new storage rules: the contract document is a file that already lies in the document storage
 * ("Dateien") of the house of the tenant's apartment. These actions only LINK it (`vertrag_dokument_id` of
 * `"Mieter_Mietverhaeltnisse"`), unlink it and open it. Files are uploaded in the existing document area.
 *
 * Principles (as in `app/mietverhaeltnis-actions.ts`): sign-in -> module right -> validation -> database access.
 * - IDs of tenancy and document come from the server: the tenancy is read from the tenant row, the document is
 *   read under RLS and its path must lie in the document folder of the house of the tenant's apartment (not in
 *   the archive and not in the deposit receipts, whose access runs through the module `kautionen`).
 * - The database checks again: the foreign key `(vertrag_dokument_id, organisation_id)` and the trigger `MV011`
 *   (the signed-in user must be able to see the document).
 * - Opening goes through `createSignedUrls`, which validates the path against organisation and house scope. The
 *   link lives only a few minutes.
 * - No file names, paths or IDs in logs: only the action name, the event and the error code.
 *
 * Security relevant (permissions, documents): not production ready until the maintainer has reviewed it.
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
import { createSignedUrls } from "@/lib/storage-operations";
import { ARCHIVE_SEGMENT, KAUTIONEN_SEGMENT, folderMetadataFilter, isPathInFolder, sharedPath } from "@/lib/storage-paths";
import type { MietverhaeltnisActionError, MietverhaeltnisActionResult } from "@/types/Mietverhaeltnis";

/** A document that can be linked as contract document. */
export interface VertragsdokumentInfo {
  id: string;
  /** File name as stored. */
  name: string;
  /** Folder of the file below the house folder, `""` for the house folder itself. */
  ordner: string;
}

export interface VertragsdokumentSetzenInput {
  mieterId: string;
  /** Document to link; `null` removes the link. */
  dokumentId: string | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_SIGNED_IN_MESSAGE_PREFIX = "Nicht authentifiziert";
/** Number of documents offered for linking (newest names first is not needed: sorted by name). */
const KANDIDATEN_LIMIT = 200;
/** Lifetime of the link to open the document, seconds. */
const OEFFNEN_GUELTIG_SEKUNDEN = 120;

type Step<T> = { ok: true; data: T } | { ok: false; error: MietverhaeltnisActionError };

interface Kontext {
  mietverhaeltnisId: string;
  /** `org_{org}/shared/{house}`, the document folder of the house. */
  hausOrdner: string;
  vertragDokumentId: string | null;
}

const fail = <T>(error: MietverhaeltnisActionError): Step<T> => ({ ok: false, error });
const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const istUuid = (value: unknown): value is string => typeof value === "string" && UUID_PATTERN.test(value);

/** `Wohnungen(haus_id)` comes back as an object or, depending on the relation, as an array. */
function hausIdVon(wohnungen: unknown): string | null {
  const eintrag = Array.isArray(wohnungen) ? wohnungen[0] : wohnungen;
  const hausId = asRecord(eintrag)?.haus_id;
  return istUuid(hausId) ? hausId : null;
}

/** Document of the house folder that may be a contract document: not archived, not a placeholder, not a deposit receipt. */
function istVertragsdokumentPfad(dateipfad: string, dateiname: string, hausOrdner: string): boolean {
  if (!isPathInFolder(dateipfad, hausOrdner) || dateiname === ".keep") return false;
  const unterhalb = dateipfad.slice(hausOrdner.length).split("/").filter(Boolean);
  const erstes = unterhalb[0];
  return erstes !== ARCHIVE_SEGMENT && erstes !== KAUTIONEN_SEGMENT;
}

function dokumentInfo(record: Record<string, unknown>, hausOrdner: string): VertragsdokumentInfo | null {
  if (!istUuid(record.id) || typeof record.dateiname !== "string" || typeof record.dateipfad !== "string") return null;
  if (!istVertragsdokumentPfad(record.dateipfad, record.dateiname, hausOrdner)) return null;
  return {
    id: record.id,
    name: record.dateiname,
    ordner: record.dateipfad.slice(hausOrdner.length).replace(/^\/+/, ""),
  };
}

/**
 * Reads tenancy, house and linked document of a tenant on the server and checks the object scope (`42501` for a
 * tenant outside the user's houses, as in the database).
 */
async function ladeKontext(supabase: SupabaseClient, mieterId: string): Promise<Step<Kontext>> {
  const { data, error } = await supabase
    .from("Mieter")
    .select("id, mietverhaeltnis_id, wohnung_id, Wohnungen(haus_id)")
    .eq("id", mieterId)
    .maybeSingle();
  if (error) return fail(mapMietverhaeltnisError(error));
  const record = asRecord(data);
  if (!record) return fail(mietverhaeltnisFehler("MV003"));
  const wohnungIds = await getAccessibleWohnungIds();
  if (wohnungIds !== null && (typeof record.wohnung_id !== "string" || !wohnungIds.includes(record.wohnung_id))) {
    return fail(mietverhaeltnisFehler("42501"));
  }
  if (!istUuid(record.mietverhaeltnis_id)) return fail(mietverhaeltnisFehler("MV003"));
  const hausId = hausIdVon(record.Wohnungen);
  if (!hausId) return fail(mietverhaeltnisFehler("MV007"));

  const { data: orgId, error: orgError } = await supabase.rpc("current_organisation_id");
  if (orgError || !istUuid(orgId)) return fail(mietverhaeltnisFehler("42501"));

  const { data: mvData, error: mvError } = await supabase
    .from("Mieter_Mietverhaeltnisse")
    .select("id, vertrag_dokument_id")
    .eq("id", record.mietverhaeltnis_id)
    .maybeSingle();
  if (mvError) return fail(mapMietverhaeltnisError(mvError));
  const mv = asRecord(mvData);
  if (!mv) return fail(mietverhaeltnisFehler("MV003"));

  return {
    ok: true,
    data: {
      mietverhaeltnisId: record.mietverhaeltnis_id,
      hausOrdner: sharedPath(orgId, hausId),
      vertragDokumentId: istUuid(mv.vertrag_dokument_id) ? mv.vertrag_dokument_id : null,
    },
  };
}

/** Same flow for all actions: sign-in -> module right -> `run` -> revalidation for writes -> log. */
async function runDokumentAction<T>(options: {
  actionName: string;
  aktionen: readonly ("ansehen" | "bearbeiten")[];
  schreibend: boolean;
  run: (supabase: SupabaseClient) => Promise<Step<T>>;
}): Promise<MietverhaeltnisActionResult<T>> {
  const { actionName, aktionen, schreibend, run } = options;
  const failure = (error: MietverhaeltnisActionError): MietverhaeltnisActionResult<T> => {
    logAction(actionName, error.code === "UNBEKANNT" ? "error" : "failed", { code: error.code });
    return { success: false, error };
  };

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
    const rechte = await Promise.all(aktionen.map((aktion) => hasPermission("mieter", aktion)));
    if (rechte.some((recht) => !recht)) return failure(mietverhaeltnisFehler("42501"));

    const step = await run(supabase);
    if (!step.ok) return failure(step.error);

    if (schreibend) {
      revalidatePath("/mieter");
      revalidatePath("/finanzen");
    }
    logAction(actionName, "success", {});
    return { success: true, data: step.data };
  } catch (error) {
    unstable_rethrow(error);
    logAction(actionName, "error", { code: "UNEXPECTED" });
    return { success: false, error: { code: "UNBEKANNT", message: MIETVERHAELTNIS_FEHLER_FALLBACK_MESSAGE } };
  }
}

/** Reads one document under RLS; `null` if it does not exist or the user cannot see it. */
async function ladeDokument(
  supabase: SupabaseClient,
  dokumentId: string,
  hausOrdner: string
): Promise<Step<{ info: VertragsdokumentInfo; pfad: string } | null>> {
  const { data, error } = await supabase
    .from("Dokumente_Metadaten")
    .select("id, dateiname, dateipfad")
    .eq("id", dokumentId)
    .maybeSingle();
  if (error) return fail(mapMietverhaeltnisError(error));
  const record = asRecord(data);
  if (!record) return { ok: true, data: null };
  const info = dokumentInfo(record, hausOrdner);
  if (!info) return { ok: true, data: null };
  return { ok: true, data: { info, pfad: `${record.dateipfad as string}/${record.dateiname as string}` } };
}

/** The contract document linked to the tenancy of a tenant, or `null`. */
export async function getVertragsdokumentAction(mieterId: string): Promise<MietverhaeltnisActionResult<VertragsdokumentInfo | null>> {
  return runDokumentAction<VertragsdokumentInfo | null>({
    actionName: "getVertragsdokument",
    aktionen: ["ansehen"],
    schreibend: false,
    run: async (supabase) => {
      if (!istUuid(mieterId)) return fail(mietverhaeltnisFehler("MV004"));
      const kontext = await ladeKontext(supabase, mieterId);
      if (!kontext.ok) return kontext;
      if (!kontext.data.vertragDokumentId) return { ok: true, data: null };
      const dokument = await ladeDokument(supabase, kontext.data.vertragDokumentId, kontext.data.hausOrdner);
      if (!dokument.ok) return dokument;
      // Linked but not (or no longer) visible, or outside the house folder: shown as "not available", never as an error
      return { ok: true, data: dokument.data?.info ?? null };
    },
  });
}

/** Documents of the house folder that can be linked (not archived, no deposit receipts), sorted by name. */
export async function listeVertragsdokumentKandidatenAction(mieterId: string): Promise<MietverhaeltnisActionResult<VertragsdokumentInfo[]>> {
  return runDokumentAction<VertragsdokumentInfo[]>({
    actionName: "listeVertragsdokumentKandidaten",
    aktionen: ["ansehen"],
    schreibend: false,
    run: async (supabase) => {
      if (!istUuid(mieterId)) return fail(mietverhaeltnisFehler("MV004"));
      const kontext = await ladeKontext(supabase, mieterId);
      if (!kontext.ok) return kontext;
      const { data, error } = await supabase
        .from("Dokumente_Metadaten")
        .select("id, dateiname, dateipfad")
        .or(folderMetadataFilter(kontext.data.hausOrdner))
        .order("dateiname", { ascending: true })
        .limit(KANDIDATEN_LIMIT);
      if (error) return fail(mapMietverhaeltnisError(error));
      if (!Array.isArray(data)) return fail(mietverhaeltnisFehler("UNBEKANNT"));
      const liste: VertragsdokumentInfo[] = [];
      for (const zeile of data) {
        const record = asRecord(zeile);
        const info = record ? dokumentInfo(record, kontext.data.hausOrdner) : null;
        // The folder filter is not exact for names with `*`: the path is checked again in dokumentInfo
        if (info) liste.push(info);
      }
      return { ok: true, data: liste };
    },
  });
}

/** Links a document of the house folder as contract document, or removes the link (`dokumentId: null`). */
export async function vertragsdokumentSetzenAction(input: VertragsdokumentSetzenInput): Promise<MietverhaeltnisActionResult> {
  return runDokumentAction<undefined>({
    actionName: "vertragsdokumentSetzen",
    aktionen: ["ansehen", "bearbeiten"],
    schreibend: true,
    run: async (supabase) => {
      const mieterId = input?.mieterId;
      if (!istUuid(mieterId)) return fail(mietverhaeltnisFehler("MV004"));
      const dokumentId = input?.dokumentId;
      if (dokumentId !== null && !istUuid(dokumentId)) return fail(mietverhaeltnisFehler("MV004"));

      const kontext = await ladeKontext(supabase, mieterId);
      if (!kontext.ok) return kontext;
      if (dokumentId !== null) {
        const dokument = await ladeDokument(supabase, dokumentId, kontext.data.hausOrdner);
        if (!dokument.ok) return dokument;
        // Missing, not visible, outside the house folder, archived or a deposit receipt: same answer (MV011)
        if (!dokument.data) return fail(mietverhaeltnisFehler("MV011"));
      }

      const { data, error } = await supabase
        .from("Mieter_Mietverhaeltnisse")
        .update({ vertrag_dokument_id: dokumentId })
        .eq("id", kontext.data.mietverhaeltnisId)
        .select("id");
      if (error) return fail(mapMietverhaeltnisError(error));
      // No row back: RLS refused the update (or the tenancy is not visible)
      if (!Array.isArray(data) || data.length === 0) return fail(mietverhaeltnisFehler("42501"));
      return { ok: true, data: undefined };
    },
  });
}

/** A short-lived link to open the linked contract document. */
export async function vertragsdokumentOeffnenAction(mieterId: string): Promise<MietverhaeltnisActionResult<{ url: string }>> {
  return runDokumentAction<{ url: string }>({
    actionName: "vertragsdokumentOeffnen",
    aktionen: ["ansehen"],
    schreibend: false,
    run: async (supabase) => {
      if (!istUuid(mieterId)) return fail(mietverhaeltnisFehler("MV004"));
      const kontext = await ladeKontext(supabase, mieterId);
      if (!kontext.ok) return kontext;
      if (!kontext.data.vertragDokumentId) return fail(mietverhaeltnisFehler("MV003"));
      const dokument = await ladeDokument(supabase, kontext.data.vertragDokumentId, kontext.data.hausOrdner);
      if (!dokument.ok) return dokument;
      if (!dokument.data) return fail(mietverhaeltnisFehler("MV011"));

      const [ergebnis] = await createSignedUrls([dokument.data.pfad], { expiresIn: OEFFNEN_GUELTIG_SEKUNDEN });
      // The storage layer validates the path against organisation and house scope; no URL means no access
      if (!ergebnis?.url) return fail(mietverhaeltnisFehler("MV011"));
      return { ok: true, data: { url: ergebnis.url } };
    },
  });
}
