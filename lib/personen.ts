/**
 * Personen-Stammdaten (GH-30).
 *
 * Name, E-Mail und Telefon eines Mieters oder Bewerbers stehen in der Tabelle "Personen".
 * "Mieter" und "Bewerber" verweisen per person_id darauf. Dieses Modul ist die gemeinsame
 * Schnittstelle für alle Lese- und Schreibpfade der App:
 * - Select-Fragmente für das Einbetten der Person (PostgREST, Fremdschlüssel mit Namen),
 * - der Anzeigename (Vorname + Nachname),
 * - das Abbilden auf die bisherigen Felder name, email, telefonnummer, damit bestehende
 *   Oberflächen unverändert lesen können,
 * - das Auslesen der Personenfelder aus FormData für die RPCs mieter_anlegen,
 *   mieter_aktualisieren und bewerber_anlegen.
 */

export type Anrede = 'frau' | 'herr' | 'keine_angabe';

export const ANREDE_OPTIONEN: ReadonlyArray<{ value: Anrede; label: string }> = [
  { value: 'keine_angabe', label: 'Keine Angabe' },
  { value: 'frau', label: 'Frau' },
  { value: 'herr', label: 'Herr' },
];

export interface Person {
  id: string;
  anrede: Anrede;
  vorname: string | null;
  nachname: string | null;
  email: string | null;
  telefon: string | null;
  strasse?: string | null;
  plz?: string | null;
  ort?: string | null;
}

/** Alle Spalten einer Person (nur für die Kontakte-Seite, die auch die Anschrift pflegt). */
export const PERSON_SPALTEN = 'id, anrede, vorname, nachname, email, telefon, strasse, plz, ort';

/**
 * Spalten der Person an Mieter- und Bewerber-Zeilen: ohne Anschrift (Datenminimierung). Mieter- und Bewerber-Ansichten,
 * Exporte und API-Antworten brauchen nur Anrede, Name und Kontakt; die Anschrift gehört zur Kontakte-Seite.
 */
export const PERSON_SPALTEN_ROLLE = 'id, anrede, vorname, nachname, email, telefon';

/** Eingebettete Person an einer Mieter-Zeile (Schlüssel `person`). */
export const MIETER_PERSON_EMBED = `person:Personen!fk_mieter_person(${PERSON_SPALTEN_ROLLE})`;

/** Wie MIETER_PERSON_EMBED, aber als Inner-Join: Filter auf `person` schränken dann die Mieter-Zeilen ein (Suche). */
export const MIETER_PERSON_EMBED_INNER = `person:Personen!fk_mieter_person!inner(${PERSON_SPALTEN_ROLLE})`;

/** Eingebettete Person an einer Bewerber-Zeile (Schlüssel `person`). */
export const BEWERBER_PERSON_EMBED = `person:Personen!fk_bewerber_person(${PERSON_SPALTEN_ROLLE})`;

/** Wie BEWERBER_PERSON_EMBED, aber als Inner-Join (Suche). */
export const BEWERBER_PERSON_EMBED_INNER = `person:Personen!fk_bewerber_person!inner(${PERSON_SPALTEN_ROLLE})`;

/** Anzeigename "Vorname Nachname"; leerer String, wenn nichts gepflegt ist. */
export function personAnzeigename(
  person: Pick<Person, 'vorname' | 'nachname'> | null | undefined
): string {
  if (!person) return '';
  return [person.vorname, person.nachname]
    .map((teil) => (typeof teil === 'string' ? teil.trim() : ''))
    .filter(Boolean)
    .join(' ');
}

export function istAnrede(wert: unknown): wert is Anrede {
  return wert === 'frau' || wert === 'herr' || wert === 'keine_angabe';
}

export interface PersonenFelder {
  /** Anzeigename aus der Person (bisheriges Feld Mieter.name). */
  name: string;
  /** E-Mail aus der Person (bisheriges Feld Mieter.email). */
  email: string | null;
  /** Telefon aus der Person (bisheriges Feld Mieter.telefonnummer). */
  telefonnummer: string | null;
  anrede: Anrede;
  vorname: string | null;
  nachname: string | null;
}

/**
 * Bildet die eingebettete Person auf die bisherigen Felder ab. Supabase liefert eine
 * eingebettete 1:1-Beziehung als Objekt, in manchen Typpfaden als Array; beides wird akzeptiert.
 * Fehlt die Person (z. B. keine Leseberechtigung), bleiben die Felder leer.
 */
export function mitPersonenfeldern<T extends { person?: Person | Person[] | null }>(
  zeile: T
): T & PersonenFelder {
  const roh = zeile.person;
  const person = Array.isArray(roh) ? (roh[0] ?? null) : (roh ?? null);
  return {
    ...zeile,
    person,
    name: personAnzeigename(person),
    email: person?.email ?? null,
    telefonnummer: person?.telefon ?? null,
    anrede: person && istAnrede(person.anrede) ? person.anrede : 'keine_angabe',
    vorname: person?.vorname ?? null,
    nachname: person?.nachname ?? null,
  };
}

/** Eingabe für die Personenfelder der RPCs (nur übergebene Schlüssel werden geändert). */
export interface PersonEingabe {
  person_id?: string;
  anrede?: Anrede;
  vorname?: string | null;
  nachname?: string | null;
  email?: string | null;
  telefon?: string | null;
  strasse?: string | null;
  plz?: string | null;
  ort?: string | null;
}

function textOderNull(wert: FormDataEntryValue | null): string | null {
  if (typeof wert !== 'string') return null;
  const getrimmt = wert.trim();
  return getrimmt === '' ? null : getrimmt;
}

/**
 * Liest die Personenfelder aus einem Formular. Feldnamen: anrede, vorname, nachname, email,
 * telefon (alternativ telefonnummer), strasse, plz, ort. Nur vorhandene Felder werden übernommen.
 */
export function personEingabeAusFormData(formData: FormData): PersonEingabe {
  const eingabe: PersonEingabe = {};
  const anrede = formData.get('anrede');
  if (anrede !== null) eingabe.anrede = istAnrede(anrede) ? anrede : 'keine_angabe';
  for (const feld of ['vorname', 'nachname', 'email', 'strasse', 'plz', 'ort'] as const) {
    if (formData.has(feld)) eingabe[feld] = textOderNull(formData.get(feld));
  }
  if (formData.has('telefon')) eingabe.telefon = textOderNull(formData.get('telefon'));
  else if (formData.has('telefonnummer')) eingabe.telefon = textOderNull(formData.get('telefonnummer'));
  return eingabe;
}

/** true, wenn Vor- oder Nachname gesetzt ist (Pflicht laut Datenbank). */
export function hatNamen(eingabe: Pick<PersonEingabe, 'vorname' | 'nachname'>): boolean {
  return Boolean(eingabe.vorname?.trim() || eingabe.nachname?.trim());
}
