"use server";

import { ensureAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { formatFailureReasons, stripDbCodePrefix, summarizeBulkDeleteResults } from "@/lib/bulk-delete-summary";
import {
  BEWERBER_PERSON_EMBED,
  hatNamen,
  mitPersonenfeldern,
  personEingabeAusFormData,
  type Anrede,
  type Person,
  type PersonEingabe,
} from "@/lib/personen";
import type { Tenant } from "@/types/Tenant";

/**
 * Bewerber (GH-30). Ein Bewerber ist eine Zeile in "Bewerber" mit einer Person in "Personen".
 * Die Mieter-Tabelle kennt keine Bewerber mehr: Alle Lese- und Schreibwege laufen hier.
 *
 * Datenschutz: Keine Personennamen, E-Mails oder Telefonnummern in Logs oder Fehlermeldungen. Die Meldungen der
 * Datenbank werden ohne technisches Präfix (`PERSON_...: `) an die Oberfläche gegeben.
 */

export type BewerberStatus = "neu" | "in_pruefung" | "abgesagt" | "angenommen";

/** Bewerber in der Form der Tenant-Liste (`status: 'bewerber'`), damit die Tabelle unverändert bleibt. */
export type BewerberListenEintrag = Tenant & {
  status: "bewerber";
  bewerber_status: BewerberStatus;
  anrede: Anrede;
  vorname: string | null;
  nachname: string | null;
};

export interface BewerberLadenErgebnis {
  success: boolean;
  data: BewerberListenEintrag[];
  error?: string;
}

/** Zeile aus "Bewerber" mit eingebetteter Person (Schlüssel `person`). */
interface BewerberZeile {
  id: string;
  person_id: string | null;
  wohnung_id: string | null;
  status: BewerberStatus;
  bewerbung_score: number | null;
  bewerbung_metadaten: Record<string, unknown> | null;
  bewerbung_mail_id: string | null;
  notiz: string | null;
  person?: Person | Person[] | null;
}

type Supabase = Awaited<ReturnType<typeof ensureAuth>>["supabase"];

const NOTIZ_MAX_LAENGE = 2000;
const BEWERBER_STATUS_AENDERBAR: readonly BewerberStatus[] = ["neu", "in_pruefung", "abgesagt"];
const UNBEKANNTER_FEHLER = "Ein unbekannter Fehler ist aufgetreten.";

function fehler(message: string): { success: false; error: { message: string } } {
  return { success: false, error: { message } };
}

/** Meldung einer Datenbankfunktion ohne technisches Präfix; keine Inhalte, die Personendaten enthalten. */
function datenbankMeldung(error: { message?: string } | null | undefined): string {
  return stripDbCodePrefix(error?.message ?? "") || UNBEKANNTER_FEHLER;
}

/** Text aus FormData: getrimmt, leer wird null. Nicht vorhandene Felder liefern `undefined`. */
function formularText(formData: FormData, feld: string): string | null | undefined {
  if (!formData.has(feld)) return undefined;
  const wert = formData.get(feld);
  if (typeof wert !== "string") return null;
  const getrimmt = wert.trim();
  return getrimmt === "" ? null : getrimmt;
}

/** Bildet eine Bewerber-Zeile auf die Tenant-Form ab (Name, E-Mail, Telefon aus der Person). */
function aufBewerberListenEintrag(zeile: BewerberZeile): BewerberListenEintrag {
  const personFelder = mitPersonenfeldern(zeile);
  return {
    id: zeile.id,
    wohnung_id: zeile.wohnung_id ?? undefined,
    name: personFelder.name,
    email: personFelder.email ?? undefined,
    telefonnummer: personFelder.telefonnummer ?? undefined,
    notiz: zeile.notiz ?? undefined,
    status: "bewerber",
    bewerber_status: zeile.status,
    person_id: zeile.person_id ?? undefined,
    anrede: personFelder.anrede,
    vorname: personFelder.vorname,
    nachname: personFelder.nachname,
    bewerbung_score: zeile.bewerbung_score ?? undefined,
    bewerbung_metadaten: zeile.bewerbung_metadaten ?? undefined,
    bewerbung_mail_id: zeile.bewerbung_mail_id ?? undefined,
  };
}

/** Wohnung im Objektzugriff des Nutzers? `null` (unbeschränkt) erlaubt alles. */
function wohnungErlaubt(wohnungIds: string[] | null, wohnungId: string): boolean {
  return wohnungIds === null || wohnungIds.includes(wohnungId);
}

/**
 * Lädt die Bewerber der Organisation (ohne Papierkorb, ohne bereits angenommene). Ein Bewerber ohne Wohnung bleibt für
 * eingeschränkte Nutzer sichtbar, weil die Haus-Einschränkung nur bei gesetzter Wohnung greift (wie in der Datenbank).
 */
export async function bewerberLadenAction(): Promise<BewerberLadenErgebnis> {
  let supabase: Supabase;
  try {
    ({ supabase } = await ensureAuth());
  } catch {
    return { success: false, data: [], error: "Nicht authentifiziert" };
  }

  const { hasPermission } = await import("@/lib/permissions");
  if (!(await hasPermission("mieter", "ansehen"))) {
    return { success: false, data: [], error: "Keine Berechtigung" };
  }

  const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
  const wohnungIds = await getAccessibleWohnungIds();

  const { data, error } = await supabase
    .from("Bewerber")
    .select(`id, person_id, wohnung_id, status, bewerbung_score, bewerbung_metadaten, bewerbung_mail_id, notiz, ${BEWERBER_PERSON_EMBED}`)
    .is("geloescht_am", null)
    .neq("status", "angenommen");

  if (error) {
    console.error("Fehler beim Laden der Bewerber:", error.code);
    return { success: false, data: [], error: datenbankMeldung(error) };
  }

  // Die eingebettete Person wird über die Select-Zeichenkette geliefert; der Typ ist dort nicht ableitbar.
  const zeilen = (data ?? []) as unknown as BewerberZeile[];
  const sichtbar = zeilen.filter((zeile) => !zeile.wohnung_id || wohnungErlaubt(wohnungIds, zeile.wohnung_id));

  return { success: true, data: sichtbar.map(aufBewerberListenEintrag) };
}

/** Liest Wohnung und Papierkorbstatus eines Bewerbers; `null`, wenn er nicht (mehr) existiert oder nicht sichtbar ist. */
async function ladeBewerberZuordnung(supabase: Supabase, bewerberId: string) {
  const { data, error } = await supabase
    .from("Bewerber")
    .select("id, person_id, wohnung_id")
    .eq("id", bewerberId)
    .is("geloescht_am", null)
    .maybeSingle();
  if (error) {
    console.error("Fehler beim Laden des Bewerbers:", error.code);
    return null;
  }
  return (data as { id: string; person_id: string | null; wohnung_id: string | null } | null) ?? null;
}

/**
 * Ändert Person (Name, Kontakt, Anschrift) und Bewerberfelder (Wohnung, Notiz, Status).
 * Nur übergebene Felder werden geändert. `angenommen` läuft über bewerberAnnehmenAction.
 */
export async function bewerberAktualisierenAction(
  bewerberId: string,
  formData: FormData
): Promise<{ success: boolean; error?: { message: string } }> {
  let supabase: Supabase;
  try {
    ({ supabase } = await ensureAuth());
  } catch {
    return fehler("Nicht authentifiziert");
  }

  const { hasPermission } = await import("@/lib/permissions");
  if (!(await hasPermission("mieter", "bearbeiten"))) {
    return fehler("Keine Berechtigung");
  }

  const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
  const wohnungIds = await getAccessibleWohnungIds();

  const bestand = await ladeBewerberZuordnung(supabase, bewerberId);
  if (!bestand) return fehler("Bewerber nicht gefunden.");
  if (bestand.wohnung_id && !wohnungErlaubt(wohnungIds, bestand.wohnung_id)) {
    return fehler("Zugriff auf diesen Bewerber verweigert.");
  }

  // Personenfelder (ohne person_id: die Zuordnung ändert der Client nicht).
  const personEingabe: PersonEingabe = personEingabeAusFormData(formData);
  delete personEingabe.person_id;
  const personUpdate: Record<string, unknown> = Object.fromEntries(
    Object.entries(personEingabe).filter(([, wert]) => wert !== undefined)
  );

  if (Object.keys(personUpdate).length > 0) {
    if (!bestand.person_id) return fehler("Der Bewerber hat keine Person.");

    if ("vorname" in personUpdate || "nachname" in personUpdate) {
      // Vor- oder Nachname muss nach der Änderung gesetzt bleiben: den aktuellen Stand mit einbeziehen.
      const { data: aktuell, error: ladeFehler } = await supabase
        .from("Personen")
        .select("vorname, nachname")
        .eq("id", bestand.person_id)
        .maybeSingle();
      if (ladeFehler || !aktuell) return fehler("Person nicht gefunden.");
      const vorname = "vorname" in personUpdate ? personEingabe.vorname : aktuell.vorname;
      const nachname = "nachname" in personUpdate ? personEingabe.nachname : aktuell.nachname;
      if (!hatNamen({ vorname: vorname ?? null, nachname: nachname ?? null })) {
        return fehler("Vor- oder Nachname ist erforderlich.");
      }
    }

    const { data: geaendert, error: personFehler } = await supabase
      .from("Personen")
      .update(personUpdate)
      .eq("id", bestand.person_id)
      .select("id")
      .maybeSingle();
    if (personFehler) return fehler(datenbankMeldung(personFehler));
    if (!geaendert) return fehler("Keine Berechtigung");
  }

  const bewerberUpdate: Record<string, unknown> = {};

  const wohnungId = formularText(formData, "wohnung_id");
  if (wohnungId !== undefined) {
    if (wohnungId && !wohnungErlaubt(wohnungIds, wohnungId)) {
      return fehler("Zugriff auf die angegebene Wohnung verweigert.");
    }
    bewerberUpdate.wohnung_id = wohnungId;
  }

  const notiz = formularText(formData, "notiz");
  if (notiz !== undefined) {
    if (notiz && notiz.length > NOTIZ_MAX_LAENGE) {
      return fehler(`Notiz ist zu lang (höchstens ${NOTIZ_MAX_LAENGE} Zeichen).`);
    }
    bewerberUpdate.notiz = notiz;
  }

  const status = formularText(formData, "bewerber_status");
  if (status !== undefined) {
    if (!status || !BEWERBER_STATUS_AENDERBAR.includes(status as BewerberStatus)) {
      return fehler("Ungültiger Status.");
    }
    bewerberUpdate.status = status;
  }

  if (Object.keys(bewerberUpdate).length > 0) {
    const { data: geaendert, error: bewerberFehler } = await supabase
      .from("Bewerber")
      .update(bewerberUpdate)
      .eq("id", bewerberId)
      .is("geloescht_am", null)
      .select("id")
      .maybeSingle();
    if (bewerberFehler) return fehler(datenbankMeldung(bewerberFehler));
    if (!geaendert) return fehler("Keine Berechtigung");
  }

  revalidatePath("/mieter");
  return { success: true };
}

/**
 * Übernimmt einen offenen Bewerber als Mieter in `wohnungId` zum Einzugsdatum (`YYYY-MM-DD`). Die Datenbankfunktion
 * legt den Mieter mit derselben Person an und setzt den Bewerber auf `angenommen`.
 */
export async function bewerberAnnehmenAction(
  bewerberId: string,
  wohnungId: string,
  einzug: string
): Promise<{ success: boolean; mieterId?: string; error?: { message: string } }> {
  let supabase: Supabase;
  try {
    ({ supabase } = await ensureAuth());
  } catch {
    return fehler("Nicht authentifiziert");
  }

  // Annehmen legt einen Mieter an (erstellen) und setzt den Bewerber auf "angenommen" (bearbeiten).
  const { hasPermission } = await import("@/lib/permissions");
  if (!(await hasPermission("mieter", "erstellen")) || !(await hasPermission("mieter", "bearbeiten"))) {
    return fehler("Keine Berechtigung");
  }

  if (!bewerberId) return fehler("Bewerber nicht gefunden.");
  if (!wohnungId) return fehler("Bitte wählen Sie eine Wohnung.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(einzug)) return fehler("Bitte geben Sie ein gültiges Einzugsdatum an.");

  const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
  const wohnungIds = await getAccessibleWohnungIds();
  if (!wohnungErlaubt(wohnungIds, wohnungId)) {
    return fehler("Zugriff auf die angegebene Wohnung verweigert.");
  }

  const { data, error } = await supabase.rpc("bewerber_annehmen", {
    p_bewerber_id: bewerberId,
    p_wohnung_id: wohnungId,
    p_einzug: einzug,
  });
  if (error) {
    console.error("Fehler beim Übernehmen des Bewerbers:", error.code);
    return fehler(datenbankMeldung(error));
  }

  revalidatePath("/mieter");
  revalidatePath("/wohnungen");
  return { success: true, mieterId: typeof data === "string" ? data : undefined };
}

/** Löscht einen Bewerber in den Papierkorb (Datenbankfunktion soft_delete_record). */
export async function bewerberLoeschenAction(bewerberId: string): Promise<{ success: boolean; error?: { message: string } }> {
  let supabase: Supabase;
  try {
    ({ supabase } = await ensureAuth());
  } catch {
    return fehler("Nicht authentifiziert");
  }

  const { hasPermission } = await import("@/lib/permissions");
  if (!(await hasPermission("mieter", "loeschen"))) {
    return fehler("Keine Berechtigung");
  }

  const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
  const wohnungIds = await getAccessibleWohnungIds();

  const bestand = await ladeBewerberZuordnung(supabase, bewerberId);
  if (!bestand) return fehler("Bewerber nicht gefunden.");
  if (bestand.wohnung_id && !wohnungErlaubt(wohnungIds, bestand.wohnung_id)) {
    return fehler("Zugriff auf diesen Bewerber verweigert.");
  }

  const { error } = await supabase.rpc("soft_delete_record", { p_table_name: "Bewerber", p_record_id: bewerberId });
  if (error) {
    console.error("Fehler beim Löschen des Bewerbers:", error.code);
    return fehler(datenbankMeldung(error));
  }

  revalidatePath("/mieter");
  return { success: true };
}

/** Löscht alle Bewerber der Liste (je einzeln; Teilerfolge werden gemeldet). */
export async function bewerberAlleLoeschenAction(): Promise<{ success: boolean; error?: { message: string } }> {
  let supabase: Supabase;
  try {
    ({ supabase } = await ensureAuth());
  } catch {
    return fehler("Nicht authentifiziert");
  }

  const { hasPermission } = await import("@/lib/permissions");
  if (!(await hasPermission("mieter", "loeschen"))) {
    return fehler("Keine Berechtigung");
  }

  const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
  const wohnungIds = await getAccessibleWohnungIds();

  const { data, error } = await supabase
    .from("Bewerber")
    .select("id, wohnung_id")
    .is("geloescht_am", null)
    .neq("status", "angenommen");
  if (error) {
    console.error("Fehler beim Laden der Bewerber zum Löschen:", error.code);
    return fehler(datenbankMeldung(error));
  }

  const ids = ((data ?? []) as { id: string; wohnung_id: string | null }[])
    .filter((zeile) => !zeile.wohnung_id || wohnungErlaubt(wohnungIds, zeile.wohnung_id))
    .map((zeile) => zeile.id);
  if (ids.length === 0) {
    revalidatePath("/mieter");
    return { success: true };
  }

  // Jeden Bewerber einzeln löschen und alle Ergebnisse abwarten: Die Datenbank kann einzelne Löschungen ablehnen.
  const ergebnisse = await Promise.allSettled(
    ids.map(async (id) => {
      const { error: loeschFehler } = await supabase.rpc("soft_delete_record", { p_table_name: "Bewerber", p_record_id: id });
      return loeschFehler
        ? { success: false, error: { message: datenbankMeldung(loeschFehler) } }
        : { success: true };
    })
  );
  const { successCount, errorCount, reasons } = summarizeBulkDeleteResults(ergebnisse);

  revalidatePath("/mieter");
  if (errorCount === 0) return { success: true };

  const zusammenfassung =
    successCount === 0
      ? "Es konnten keine Bewerber gelöscht werden."
      : `${errorCount} von ${ids.length} Bewerbern ${errorCount === 1 ? "konnte" : "konnten"} nicht gelöscht werden.`;
  const grund = formatFailureReasons(reasons);
  return fehler(grund ? `${zusammenfassung} ${grund}` : zusammenfassung);
}
