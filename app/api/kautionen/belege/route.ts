import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureAuth } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/permissions";
import { logAction } from "@/lib/logging-middleware";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";
import { MAX_FILE_SIZE_LABEL } from "@/lib/finance-file-constants";
import { KAUTION_FEHLER_FALLBACK_MESSAGE, mapKautionError } from "@/lib/kautionen-errors";
import { validateUuid } from "@/lib/kautionen-validation";
import { checkStoragePathAccess, getActiveOrgId } from "@/lib/storage-access";
import {
  BELEG_STORAGE_BUCKET,
  baueBelegOrdner,
  baueBelegPfad,
  belegFehlerAntwort,
  erzeugeBelegDateiname,
  fehltBelegAnfrageGroesse,
  istBelegAnfrageZuGross,
  istNichtAngemeldetFehler,
  pruefeBelegDatei,
} from "@/lib/kautionen-belege";

/**
 * Upload of a receipt to a booking of a deposit ("Beleg", GH-6, phase 2b).
 *
 * Request: `multipart/form-data` with `bewegungId` (UUID of the booking) and `file`.
 * Flow: sign-in -> module right (`kautionen: bearbeiten` and `ansehen`, like the database) -> input check -> folder
 * from the DATABASE (booking -> deposit -> tenant -> apartment, read with the user's own client, so RLS applies;
 * the client never sends a folder) -> upload to the storage -> metadata row -> RPC `kaution_beleg_zuordnen`.
 * If the RPC fails, the metadata row and the storage object are removed again.
 *
 * Privacy: neither the file name nor amounts or names are logged; the log has the action name and the error code only.
 * Security relevant: not production ready until the maintainer has reviewed it. The database checks the object scope
 * and the links itself; the checks here are an early rejection.
 *
 * A route file may only export HTTP methods, so the helpers live in `lib/kautionen-belege.ts` or stay private here.
 */

const LOG_NAME = "kautionBelegHochladen";

/**
 * Folder of the booking, read from the database. `null` if the booking is not visible (or incomplete).
 * The organisation comes from the server (`getActiveOrgId`), never from the client.
 */
async function ermittleBelegOrdner(supabase: SupabaseClient, orgId: string, bewegungId: string): Promise<string | null> {
  const { data: bewegung, error: bewegungFehler } = await supabase
    .from("Kautionen_Bewegungen")
    .select("kaution_id")
    .eq("id", bewegungId)
    .maybeSingle();
  if (bewegungFehler) throw bewegungFehler;
  if (!bewegung?.kaution_id) return null;

  const { data: kaution, error: kautionFehler } = await supabase
    .from("Kautionen")
    .select("mieter_id")
    .eq("id", bewegung.kaution_id)
    .maybeSingle();
  if (kautionFehler) throw kautionFehler;
  if (!kaution?.mieter_id) return null;

  const { data: mieter, error: mieterFehler } = await supabase
    .from("Mieter")
    .select("id, wohnung_id")
    .eq("id", kaution.mieter_id)
    .maybeSingle();
  if (mieterFehler) throw mieterFehler;
  if (!mieter?.wohnung_id) return null;

  const { data: wohnung, error: wohnungFehler } = await supabase
    .from("Wohnungen")
    .select("id, haus_id")
    .eq("id", mieter.wohnung_id)
    .maybeSingle();
  if (wohnungFehler) throw wohnungFehler;
  if (!wohnung?.haus_id) return null;

  return baueBelegOrdner({ orgId, hausId: wohnung.haus_id, wohnungId: wohnung.id, mieterId: mieter.id });
}

/** Removes a stored file again (rollback). Errors are logged by code only and never returned to the client. */
async function entferneDatei(supabase: SupabaseClient, storagePfad: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from(BELEG_STORAGE_BUCKET).remove([storagePfad]);
    if (error) logAction(LOG_NAME, "error", { code: "ROLLBACK_STORAGE" });
  } catch {
    logAction(LOG_NAME, "error", { code: "ROLLBACK_STORAGE" });
  }
}

/** Removes a metadata row again (rollback). Errors are logged by code only. */
async function entferneMetadaten(supabase: SupabaseClient, dokumentId: string): Promise<void> {
  try {
    const { error } = await supabase.from("Dokumente_Metadaten").delete().eq("id", dokumentId);
    if (error) logAction(LOG_NAME, "error", { code: "ROLLBACK_METADATEN" });
  } catch {
    logAction(LOG_NAME, "error", { code: "ROLLBACK_METADATEN" });
  }
}

/** Rollback after a failed link: the metadata row (if it was created) and the stored file are removed again. */
async function zuruecknehmen(supabase: SupabaseClient, dokumentId: string | null, storagePfad: string): Promise<void> {
  if (dokumentId) await entferneMetadaten(supabase, dokumentId);
  await entferneDatei(supabase, storagePfad);
}

/** Error answer with the JSON shape `{ error: { message, code? } }`. Only the code reaches the log. */
function ablehnen(status: number, message: string, code?: string, unerwartet = false): NextResponse {
  logAction(LOG_NAME, unerwartet ? "error" : "failed", code ? { code } : {});
  return NextResponse.json({ error: code ? { message, code } : { message } }, { status, headers: NO_CACHE_HEADERS });
}

/** Form value that is a file (duck-typed: works for browser `File` and the Node `File` in tests). */
function istDatei(wert: FormDataEntryValue | null): wert is File {
  return (
    typeof wert === "object" &&
    wert !== null &&
    typeof (wert as Blob).size === "number" &&
    typeof (wert as Blob).type === "string" &&
    typeof (wert as Blob).arrayBuffer === "function"
  );
}

export async function POST(request: NextRequest) {
  try {
    // 1. Sign-in
    let angemeldet: Awaited<ReturnType<typeof ensureAuth>>;
    try {
      angemeldet = await ensureAuth();
    } catch (authError) {
      unstable_rethrow(authError);
      if (istNichtAngemeldetFehler(authError)) {
        const anmelden = mapKautionError({ code: "KA001" });
        return ablehnen(401, anmelden.message, anmelden.code);
      }
      return ablehnen(500, KAUTION_FEHLER_FALLBACK_MESSAGE, undefined, true);
    }
    const { user, supabase } = angemeldet;

    // 2. Module right: writing needs `bearbeiten`, the database also needs `ansehen` (same as the actions)
    const [darfBearbeiten, darfAnsehen] = await Promise.all([
      hasPermission("kautionen", "bearbeiten"),
      hasPermission("kautionen", "ansehen"),
    ]);
    if (!darfBearbeiten || !darfAnsehen) {
      const abgelehnt = belegFehlerAntwort({ code: "42501" });
      return ablehnen(abgelehnt.status, abgelehnt.body.error.message, "42501");
    }

    // Early size check (before the body is read): a huge request is refused without parsing it. Without a declared length
    // (chunked) `formData()` would buffer the whole body before the file size is known: refused (411).
    if (fehltBelegAnfrageGroesse(request.headers.get("content-length"))) {
      return ablehnen(411, "Die Anfrage muss eine Größenangabe enthalten.");
    }
    if (istBelegAnfrageZuGross(request.headers.get("content-length"))) {
      return ablehnen(413, `Die Datei ist zu groß (max. ${MAX_FILE_SIZE_LABEL}).`);
    }

    // 3. Input: booking ID and file
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError) {
      unstable_rethrow(formError);
      return ablehnen(400, "Die Anfrage ist ungültig.");
    }

    const bewegungId = validateUuid(formData.get("bewegungId"), "Buchungs-ID");
    if (!bewegungId.ok) return ablehnen(400, bewegungId.message);

    const eintrag = formData.get("file");
    if (!istDatei(eintrag)) return ablehnen(400, "Keine gültige Datei hochgeladen.");
    const datei = eintrag;
    const pruefung = pruefeBelegDatei({ size: datei.size, type: datei.type });
    if (!pruefung.ok) return ablehnen(pruefung.status, pruefung.message);

    // 4. Folder from the database (never from the client): org from the server, house-scoped path
    const orgId = await getActiveOrgId(supabase);
    if (!orgId) return ablehnen(403, "Keine aktive Organisation gefunden.", "42501");
    const dateipfad = await ermittleBelegOrdner(supabase, orgId, bewegungId.value);
    if (!dateipfad) return ablehnen(404, "Die Buchung wurde nicht gefunden.", "KA003");

    // Object scope: the folder must lie in a house the user may access. Writing has NO legacy exception.
    const zugriff = await checkStoragePathAccess(supabase, user.id, dateipfad);
    if (zugriff) return ablehnen(403, "Zugriff verweigert.", "42501");

    // 5. Upload under a unique, sanitized name
    const dateiname = erzeugeBelegDateiname(datei.name, Date.now());
    const storagePfad = baueBelegPfad(dateipfad, dateiname);

    const { error: uploadFehler } = await supabase.storage.from(BELEG_STORAGE_BUCKET).upload(storagePfad, datei, {
      contentType: datei.type,
      upsert: false,
    });
    if (uploadFehler) {
      logAction(LOG_NAME, "error", { code: "UPLOAD" });
      return ablehnen(500, "Die Datei konnte nicht hochgeladen werden.", undefined, true);
    }

    // 6.-8. Metadata row and link. Any failure after the upload removes both new records again (rollback), also an
    //       exception (no orphaned file in the storage).
    let dokumentId: string | null = null;
    try {
      const { data: metadaten, error: metadatenFehler } = await supabase
        .from("Dokumente_Metadaten")
        .insert({ dateipfad, dateiname, dateigroesse: datei.size, mime_type: datei.type })
        .select("id")
        .single();
      if (metadatenFehler || typeof metadaten?.id !== "string") {
        logAction(LOG_NAME, "error", { code: "METADATEN" });
        await entferneDatei(supabase, storagePfad);
        return ablehnen(500, "Die Datei konnte nicht gespeichert werden.", undefined, true);
      }
      dokumentId = metadaten.id;

      const { error: zuordnungFehler } = await supabase.rpc("kaution_beleg_zuordnen", {
        p_bewegung_id: bewegungId.value,
        p_dokument_id: dokumentId,
      });
      if (zuordnungFehler) {
        await zuruecknehmen(supabase, dokumentId, storagePfad);
        const abgelehnt = belegFehlerAntwort(zuordnungFehler);
        logAction(LOG_NAME, abgelehnt.unerwartet ? "error" : "failed", abgelehnt.body.error.code ? { code: abgelehnt.body.error.code } : {});
        return NextResponse.json(abgelehnt.body, { status: abgelehnt.status, headers: NO_CACHE_HEADERS });
      }

      // Success: the statement and the list of receipts are shown again
      revalidatePath("/mieter");
      logAction(LOG_NAME, "success", {});
      return NextResponse.json({ success: true, dokumentId }, { headers: NO_CACHE_HEADERS });
    } catch (zwischenFehler) {
      unstable_rethrow(zwischenFehler);
      logAction(LOG_NAME, "error", { code: "UNEXPECTED_NACH_UPLOAD" });
      await zuruecknehmen(supabase, dokumentId, storagePfad);
      return ablehnen(500, KAUTION_FEHLER_FALLBACK_MESSAGE, undefined, true);
    }
  } catch (error) {
    unstable_rethrow(error);
    logAction(LOG_NAME, "error", { code: "UNEXPECTED" });
    return NextResponse.json({ error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
