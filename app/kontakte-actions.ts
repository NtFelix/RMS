"use server";

/**
 * Server actions des Bereichs "Kontakte" (GH-30): Personenstammdaten ohne Rolle sowie Lesen aller sichtbaren Personen.
 *
 * Prinzipien:
 * - Jede Aktion prüft zuerst die Anmeldung und das Modulrecht `kontakte` (ansehen, bei Schreibaktionen zusätzlich die
 *   jeweilige Aktion). Die Datenbank bleibt maßgeblich (RLS auf "Personen" und `check_permission`); die Prüfung hier ist
 *   eine frühe Ablehnung.
 * - Mieter und Bewerber werden nur über ihre Verknüpfung (`person_id`) gelesen. Namen, E-Mail und Telefon stehen an der
 *   Person, nicht an Mieter oder Bewerber (Migration M2 entfernt die Altspalten).
 * - Löschen geht über den Papierkorb (`soft_delete_record('Personen', id)`). Hat die Person noch aktive Mieter- oder
 *   Bewerber-Zeilen, bricht die Datenbank mit PE011 ab; das wird verständlich gemeldet.
 * - Keine Personennamen, E-Mail-Adressen oder Telefonnummern in Logs oder Events. Protokolliert werden nur der Aktionsname,
 *   das Ergebnis und ein Fehlercode.
 * - Meldungen sind deutsch und in der Sie-Form.
 *
 * "use server"-Datei: exportiert werden nur async-Funktionen (Typen werden entfernt).
 */

import { revalidatePath } from "next/cache";
import { ensureAuth } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/permissions";
import { logAction } from "@/lib/logging-middleware";
import {
  PERSON_SPALTEN,
  hatNamen,
  istAnrede,
  personAnzeigename,
  type Anrede,
  type Person,
} from "@/lib/personen";

/** Eine Person der Liste mit Anzeigename und den Rollen, die aus den vorhandenen Mieter- und Bewerber-Zeilen folgen. */
export type KontaktZeile = Person & {
  anzeigename: string;
  istMieter: boolean;
  istBewerber: boolean;
};

/** Stammdaten einer Person ohne Rolle. Alle Felder außer Anrede sind optional, mindestens Vor- oder Nachname ist Pflicht. */
export interface KontaktEingabe {
  anrede: Anrede;
  vorname: string | null;
  nachname: string | null;
  email: string | null;
  telefon: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
}

export type KontaktAktionsErgebnis<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

const TEXT_FELDER = ["vorname", "nachname", "email", "telefon", "strasse", "plz", "ort"] as const;
type TextFeld = (typeof TEXT_FELDER)[number];

const TEXT_FELD_LABEL: Record<TextFeld, string> = {
  vorname: "Vorname",
  nachname: "Nachname",
  email: "E-Mail",
  telefon: "Telefon",
  strasse: "Straße",
  plz: "PLZ",
  ort: "Ort",
};

const TEXT_MAX_LAENGE = 200;
const EMAIL_MAX_LAENGE = 254;
const EMAIL_MUSTER = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_MUSTER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NICHT_ANGEMELDET = "Bitte melden Sie sich erneut an.";
const KEINE_BERECHTIGUNG = "Sie haben keine Berechtigung für diese Aktion.";
const EINGABE_UNGUELTIG = "Die Eingaben sind unvollständig oder ungültig.";
const NAME_PFLICHT = "Bitte geben Sie mindestens einen Vor- oder Nachnamen an.";
const ANREDE_UNGUELTIG = "Bitte wählen Sie eine gültige Anrede.";
const EMAIL_UNGUELTIG = "Bitte geben Sie eine gültige E-Mail-Adresse an.";
const PERSON_NICHT_GEFUNDEN = "Die Person wurde nicht gefunden oder Sie dürfen sie nicht ändern.";
const PERSON_HAT_AKTIVE_ROLLEN =
  "Diese Person ist noch als Mieter oder Bewerber aktiv und kann nicht gelöscht werden. Bitte beenden oder löschen Sie zuerst den Mieter- bzw. Bewerber-Eintrag.";
const ALLGEMEINER_FEHLER = "Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut.";

type Aktion = "ansehen" | "erstellen" | "bearbeiten" | "loeschen";
type Pruefung = { ok: true; eingabe: KontaktEingabe } | { ok: false; error: string };

async function holeAuth() {
  try {
    return await ensureAuth();
  } catch {
    return null;
  }
}

/**
 * Modulrecht: `ansehen` ist immer nötig (die Datenbank verlangt es für die Rückgabe geschriebener Zeilen), dazu die
 * Aktion selbst. Gibt `null` bei Erfolg zurück, sonst die Meldung.
 */
async function pruefeRecht(aktion: Aktion): Promise<string | null> {
  const [darfSehen, darfAktion] = await Promise.all([
    hasPermission("kontakte", "ansehen"),
    aktion === "ansehen" ? Promise.resolve(true) : hasPermission("kontakte", aktion),
  ]);
  return darfSehen && darfAktion ? null : KEINE_BERECHTIGUNG;
}

function validiereEingabe(roh: unknown): Pruefung {
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) {
    return { ok: false, error: EINGABE_UNGUELTIG };
  }
  const daten = roh as Record<string, unknown>;
  if (!istAnrede(daten.anrede)) {
    return { ok: false, error: ANREDE_UNGUELTIG };
  }

  const texte = {} as Record<TextFeld, string | null>;
  for (const feld of TEXT_FELDER) {
    const wert = daten[feld];
    if (wert !== undefined && wert !== null && typeof wert !== "string") {
      return { ok: false, error: EINGABE_UNGUELTIG };
    }
    const getrimmt = typeof wert === "string" ? wert.trim() : "";
    if (getrimmt.length > TEXT_MAX_LAENGE) {
      return { ok: false, error: `${TEXT_FELD_LABEL[feld]} ist zu lang (höchstens ${TEXT_MAX_LAENGE} Zeichen).` };
    }
    texte[feld] = getrimmt === "" ? null : getrimmt;
  }

  if (!hatNamen(texte)) {
    return { ok: false, error: NAME_PFLICHT };
  }
  if (texte.email !== null && (texte.email.length > EMAIL_MAX_LAENGE || !EMAIL_MUSTER.test(texte.email))) {
    return { ok: false, error: EMAIL_UNGUELTIG };
  }

  return {
    ok: true,
    eingabe: { anrede: daten.anrede, ...texte },
  };
}

/** Zeile für INSERT/UPDATE: alle Stammdatenfelder, leere Felder als NULL. Die Organisation setzt die Datenbank. */
function zuZeile(eingabe: KontaktEingabe) {
  return {
    anrede: eingabe.anrede,
    vorname: eingabe.vorname,
    nachname: eingabe.nachname,
    email: eingabe.email,
    telefon: eingabe.telefon,
    strasse: eingabe.strasse,
    plz: eingabe.plz,
    ort: eingabe.ort,
  };
}

/** Liefert alle für den Benutzer sichtbaren Personen mit ihren Rollen. */
export async function ladeKontakteAction(): Promise<KontaktAktionsErgebnis<KontaktZeile[]>> {
  const auth = await holeAuth();
  if (!auth) return { success: false, error: NICHT_ANGEMELDET };

  const recht = await pruefeRecht("ansehen");
  if (recht) return { success: false, error: recht };

  const { supabase } = auth;
  try {
    const [personen, mieter, bewerber] = await Promise.all([
      supabase.from("Personen").select(PERSON_SPALTEN),
      // Nur die Verknüpfung. Keine Namen oder Kontaktdaten von Mieter oder Bewerber lesen (Migration M2).
      supabase.from("Mieter").select("person_id"),
      supabase.from("Bewerber").select("person_id"),
    ]);

    if (personen.error || mieter.error || bewerber.error) {
      const code = personen.error?.code ?? mieter.error?.code ?? bewerber.error?.code ?? null;
      logAction("ladeKontakteAction", "error", { error_code: code });
      return { success: false, error: ALLGEMEINER_FEHLER };
    }

    const mieterPersonen = new Set((mieter.data ?? []).map((zeile: { person_id: string | null }) => zeile.person_id));
    const bewerberPersonen = new Set((bewerber.data ?? []).map((zeile: { person_id: string | null }) => zeile.person_id));

    const kontakte: KontaktZeile[] = ((personen.data ?? []) as Person[])
      .map((person) => ({
        ...person,
        anzeigename: personAnzeigename(person),
        istMieter: mieterPersonen.has(person.id),
        istBewerber: bewerberPersonen.has(person.id),
      }))
      .sort(
        (a, b) =>
          (a.nachname ?? "").localeCompare(b.nachname ?? "", "de") ||
          (a.vorname ?? "").localeCompare(b.vorname ?? "", "de")
      );

    logAction("ladeKontakteAction", "success", { anzahl: kontakte.length });
    return { success: true, data: kontakte };
  } catch (error) {
    logAction("ladeKontakteAction", "error", { error_code: (error as { code?: string })?.code ?? null });
    return { success: false, error: ALLGEMEINER_FEHLER };
  }
}

/** Legt eine Person ohne Rolle an (Recht `kontakte` erstellen). */
export async function anlegeKontaktAction(roh: unknown): Promise<KontaktAktionsErgebnis> {
  const auth = await holeAuth();
  if (!auth) return { success: false, error: NICHT_ANGEMELDET };

  const recht = await pruefeRecht("erstellen");
  if (recht) return { success: false, error: recht };

  const pruefung = validiereEingabe(roh);
  if (!pruefung.ok) return { success: false, error: pruefung.error };

  const { error } = await auth.supabase.from("Personen").insert(zuZeile(pruefung.eingabe));
  if (error) {
    logAction("anlegeKontaktAction", "error", { error_code: error.code ?? null });
    return { success: false, error: ALLGEMEINER_FEHLER };
  }

  logAction("anlegeKontaktAction", "success");
  revalidatePath("/kontakte");
  return { success: true };
}

/** Ändert die Stammdaten einer Person (Recht `kontakte` bearbeiten). Alle Felder werden übernommen. */
export async function aktualisiereKontaktAction(personId: unknown, roh: unknown): Promise<KontaktAktionsErgebnis> {
  const auth = await holeAuth();
  if (!auth) return { success: false, error: NICHT_ANGEMELDET };

  const recht = await pruefeRecht("bearbeiten");
  if (recht) return { success: false, error: recht };

  if (typeof personId !== "string" || !UUID_MUSTER.test(personId)) {
    return { success: false, error: EINGABE_UNGUELTIG };
  }
  const pruefung = validiereEingabe(roh);
  if (!pruefung.ok) return { success: false, error: pruefung.error };

  const { data, error } = await auth.supabase
    .from("Personen")
    .update(zuZeile(pruefung.eingabe))
    .eq("id", personId)
    .select("id");
  if (error) {
    logAction("aktualisiereKontaktAction", "error", { error_code: error.code ?? null });
    return { success: false, error: ALLGEMEINER_FEHLER };
  }
  // Ohne Treffer (unbekannte ID oder keine Sicht) meldet PostgREST keinen Fehler, nur eine leere Antwort.
  if (!data || data.length === 0) {
    return { success: false, error: PERSON_NICHT_GEFUNDEN };
  }

  logAction("aktualisiereKontaktAction", "success");
  revalidatePath("/kontakte");
  return { success: true };
}

/** Verschiebt eine Person in den Papierkorb (Recht `kontakte` loeschen). */
export async function loescheKontaktAction(personId: unknown): Promise<KontaktAktionsErgebnis> {
  const auth = await holeAuth();
  if (!auth) return { success: false, error: NICHT_ANGEMELDET };

  const recht = await pruefeRecht("loeschen");
  if (recht) return { success: false, error: recht };

  if (typeof personId !== "string" || !UUID_MUSTER.test(personId)) {
    return { success: false, error: EINGABE_UNGUELTIG };
  }

  const { error } = await auth.supabase.rpc("soft_delete_record", {
    p_table_name: "Personen",
    p_record_id: personId,
  });
  if (error) {
    // PE011: die Person hat noch eine aktive Mieter- oder Bewerber-Zeile (Migration 20261122000005).
    if (error.code === "PE011" || error.message?.startsWith("PE011")) {
      logAction("loescheKontaktAction", "failed", { error_code: "PE011" });
      return { success: false, error: PERSON_HAT_AKTIVE_ROLLEN };
    }
    logAction("loescheKontaktAction", "error", { error_code: error.code ?? null });
    return { success: false, error: ALLGEMEINER_FEHLER };
  }

  logAction("loescheKontaktAction", "success");
  revalidatePath("/kontakte");
  return { success: true };
}
