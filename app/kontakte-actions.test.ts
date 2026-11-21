/** @jest-environment node */

/**
 * Tests der Server-Actions des Bereichs Kontakte (GH-30).
 *
 * Alle Personen, E-Mail-Adressen und Telefonnummern sind synthetisch. Geprüft werden Rechte, Eingabevalidierung,
 * Verknüpfung der Rollen über person_id, die Löschsperre (PE011) und dass keine Personendaten in Logs landen.
 */

import { revalidatePath } from "next/cache";
import { ensureAuth } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/permissions";
import { logAction } from "@/lib/logging-middleware";
import {
  aktualisiereKontaktAction,
  anlegeKontaktAction,
  ladeKontakteAction,
  loescheKontaktAction,
} from "@/app/kontakte-actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/logging-middleware", () => ({ logAction: jest.fn() }));

const PERSON_A = "11111111-1111-4111-8111-111111111111";
const PERSON_B = "22222222-2222-4222-8222-222222222222";
const PERSON_C = "33333333-3333-4333-8333-333333333333";
const BEWERBER_PERSON = "44444444-4444-4444-8444-444444444444";
const SYNTH_NAME = "Muster-Nachname-Xyz";

const mockEnsureAuth = ensureAuth as jest.Mock;
const mockHasPermission = hasPermission as jest.Mock;
const mockLogAction = logAction as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

/** Baut einen Query-Builder, dessen Endpunkte (select/insert/update/eq) das gegebene Ergebnis liefern. */
function builder(result: unknown) {
  const b: Record<string, jest.Mock> = {};
  // `.select(...)` ist direkt await-bar und für die Liste verkettbar (.neq/.order/.range, seitenweises Laden).
  const kette: Record<string, unknown> = {
    then: (ok: (wert: unknown) => unknown, nein?: (grund: unknown) => unknown) => Promise.resolve(result).then(ok, nein),
  };
  kette.neq = jest.fn(() => kette);
  kette.order = jest.fn(() => kette);
  kette.range = jest.fn(() => Promise.resolve(result));
  b.select = jest.fn(() => kette);
  b.insert = jest.fn(() => Promise.resolve(result));
  b.update = jest.fn(() => b);
  b.eq = jest.fn(() => b);
  // `.update(...).eq(...).select(...)` liefert das Ergebnis; ein `.select()` direkt auf dem Builder ebenso.
  b.eq.mockImplementation(() => ({ select: jest.fn(() => Promise.resolve(result)) }));
  return b;
}

const mockFrom = jest.fn();
const mockRpc = jest.fn();
const supabase = {
  from: (table: string) => mockFrom(table),
  rpc: (...args: unknown[]) => mockRpc(...args),
};

const PERSONEN_DATEN = [
  { id: PERSON_B, anrede: "frau", vorname: "Vera", nachname: "Zeta", email: null, telefon: null, strasse: null, plz: null, ort: "Musterstadt" },
  { id: PERSON_A, anrede: "herr", vorname: "Anton", nachname: SYNTH_NAME, email: "anton@example.invalid", telefon: "0000 000000", strasse: null, plz: null, ort: null },
  { id: PERSON_C, anrede: "keine_angabe", vorname: null, nachname: "Alpha", email: null, telefon: null, strasse: null, plz: null, ort: null },
];

function setAlleTabellen(opts: {
  personen?: { data: unknown; error: unknown };
  mieter?: { data: unknown; error: unknown };
  bewerber?: { data: unknown; error: unknown };
} = {}) {
  const personen = opts.personen ?? { data: PERSONEN_DATEN, error: null };
  const mieter = opts.mieter ?? { data: [{ person_id: PERSON_A }], error: null };
  const bewerber = opts.bewerber ?? { data: [{ person_id: BEWERBER_PERSON }], error: null };
  const tabellen: Record<string, ReturnType<typeof builder>> = {
    Personen: builder(personen),
    Mieter: builder(mieter),
    Bewerber: builder(bewerber),
  };
  mockFrom.mockImplementation((table: string) => tabellen[table]);
  return tabellen;
}

/** Rechte: pro Aktion steuerbar, Standard erlaubt. */
function setRechte(erlaubt: Partial<Record<"ansehen" | "erstellen" | "bearbeiten" | "loeschen", boolean>>) {
  mockHasPermission.mockImplementation(async (modul: string, aktion: string) => {
    if (modul !== "kontakte") return false;
    return erlaubt[aktion as keyof typeof erlaubt] ?? true;
  });
}

const GUELTIGE_EINGABE = {
  anrede: "herr",
  vorname: "  Anton ",
  nachname: "Muster",
  email: "anton@example.invalid",
  telefon: "",
  strasse: null,
  plz: "",
  ort: "Musterstadt",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockEnsureAuth.mockResolvedValue({ user: { id: "user-1" }, supabase });
  setRechte({});
  setAlleTabellen();
  mockRpc.mockResolvedValue({ data: null, error: null });
});

describe("ladeKontakteAction", () => {
  it("verweigert ohne Recht kontakte ansehen und liest nichts", async () => {
    setRechte({ ansehen: false });
    const ergebnis = await ladeKontakteAction();
    expect(ergebnis.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("verweigert ohne Anmeldung", async () => {
    mockEnsureAuth.mockRejectedValueOnce(new Error("Nicht authentifiziert"));
    const ergebnis = await ladeKontakteAction();
    expect(ergebnis.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("leitet die Rollen aus person_id der Mieter- und Bewerber-Zeilen ab und sortiert nach Nachname", async () => {
    const ergebnis = await ladeKontakteAction();
    expect(ergebnis.success).toBe(true);
    if (!ergebnis.success) return;
    const kontakte = ergebnis.data ?? [];

    expect(kontakte.map((k) => k.id)).toEqual([PERSON_C, PERSON_A, PERSON_B]);
    const anton = kontakte.find((k) => k.id === PERSON_A);
    expect(anton).toMatchObject({ istMieter: true, istBewerber: false, anzeigename: `Anton ${SYNTH_NAME}` });
    expect(kontakte.find((k) => k.id === PERSON_C)).toMatchObject({ istMieter: false, istBewerber: false, anzeigename: "Alpha" });
  });

  it("markiert Bewerber über ihre Zeilen in der Tabelle Bewerber", async () => {
    setAlleTabellen({ bewerber: { data: [{ person_id: PERSON_B }], error: null } });
    const ergebnis = await ladeKontakteAction();
    if (!ergebnis.success) throw new Error("erwartet Erfolg");
    expect(ergebnis.data?.find((k) => k.id === PERSON_B)).toMatchObject({ istBewerber: true, istMieter: false });
  });

  it("liest von Mieter und Bewerber nur die Verknüpfung person_id, keine Namen oder Kontaktdaten", async () => {
    const tabellen = setAlleTabellen();
    await ladeKontakteAction();
    expect(tabellen.Mieter.select).toHaveBeenCalledWith("person_id");
    expect(tabellen.Bewerber.select).toHaveBeenCalledWith("person_id");
  });

  it("meldet einen Fehler der Abfrage generisch und protokolliert nur den Fehlercode", async () => {
    setAlleTabellen({ personen: { data: null, error: { code: "42501", message: "keine Sicht auf Muster" } } });
    const ergebnis = await ladeKontakteAction();
    expect(ergebnis).toEqual({ success: false, error: expect.any(String) });
    expect(JSON.stringify(ergebnis)).not.toContain("Muster");
    expect(mockLogAction).toHaveBeenCalledWith("ladeKontakteAction", "error", { error_code: "42501" });
  });

  it("protokolliert keine Personennamen, E-Mail-Adressen oder Telefonnummern", async () => {
    await ladeKontakteAction();
    const protokoll = JSON.stringify(mockLogAction.mock.calls);
    expect(protokoll).not.toContain(SYNTH_NAME);
    expect(protokoll).not.toContain("anton@example.invalid");
    expect(protokoll).not.toContain("0000 000000");
  });
});

describe("anlegeKontaktAction", () => {
  it("verweigert ohne Recht kontakte erstellen und schreibt nichts", async () => {
    setRechte({ erstellen: false });
    const ergebnis = await anlegeKontaktAction(GUELTIGE_EINGABE);
    expect(ergebnis.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("verlangt mindestens Vor- oder Nachname", async () => {
    const ergebnis = await anlegeKontaktAction({ ...GUELTIGE_EINGABE, vorname: " ", nachname: "" });
    expect(ergebnis).toEqual({ success: false, error: expect.stringContaining("Vor- oder Nachnamen") });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("lehnt eine unbekannte Anrede ab", async () => {
    const ergebnis = await anlegeKontaktAction({ ...GUELTIGE_EINGABE, anrede: "divers" });
    expect(ergebnis.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("lehnt eine ungültige E-Mail-Adresse ab", async () => {
    const ergebnis = await anlegeKontaktAction({ ...GUELTIGE_EINGABE, email: "kein-at-zeichen" });
    expect(ergebnis).toEqual({ success: false, error: expect.stringContaining("E-Mail") });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("lehnt Nicht-Objekte und zu lange Felder ab", async () => {
    expect((await anlegeKontaktAction("kein Objekt")).success).toBe(false);
    expect((await anlegeKontaktAction({ ...GUELTIGE_EINGABE, ort: "x".repeat(201) })).success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("schreibt getrimmte Werte, leere Felder als null und lädt die Seite neu", async () => {
    const tabellen = setAlleTabellen();
    const ergebnis = await anlegeKontaktAction(GUELTIGE_EINGABE);
    expect(ergebnis).toEqual({ success: true });
    expect(tabellen.Personen.insert).toHaveBeenCalledWith({
      anrede: "herr",
      vorname: "Anton",
      nachname: "Muster",
      email: "anton@example.invalid",
      telefon: null,
      strasse: null,
      plz: null,
      ort: "Musterstadt",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/kontakte");
  });

  it("meldet einen Schreibfehler generisch", async () => {
    const tabellen = setAlleTabellen();
    tabellen.Personen.insert.mockResolvedValueOnce({ error: { code: "42501", message: "PERSON_KEIN_RECHT" } });
    const ergebnis = await anlegeKontaktAction(GUELTIGE_EINGABE);
    expect(ergebnis.success).toBe(false);
    expect(JSON.stringify(ergebnis)).not.toContain("PERSON_KEIN_RECHT");
  });
});

describe("aktualisiereKontaktAction", () => {
  it("verweigert ohne Recht kontakte bearbeiten", async () => {
    setRechte({ bearbeiten: false });
    const ergebnis = await aktualisiereKontaktAction(PERSON_A, GUELTIGE_EINGABE);
    expect(ergebnis.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("prüft die Personen-ID als UUID, bevor die Datenbank angesprochen wird", async () => {
    const ergebnis = await aktualisiereKontaktAction("'; DROP TABLE x; --", GUELTIGE_EINGABE);
    expect(ergebnis.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("meldet eine nicht sichtbare oder unbekannte Person als nicht gefunden", async () => {
    const tabellen = setAlleTabellen();
    tabellen.Personen.eq.mockImplementation(() => ({ select: jest.fn(() => Promise.resolve({ data: [], error: null })) }));
    const ergebnis = await aktualisiereKontaktAction(PERSON_A, GUELTIGE_EINGABE);
    expect(ergebnis).toEqual({ success: false, error: expect.stringContaining("nicht gefunden") });
  });

  it("aktualisiert die Stammdaten der Person per id", async () => {
    const tabellen = setAlleTabellen();
    tabellen.Personen.eq.mockImplementation(() => ({ select: jest.fn(() => Promise.resolve({ data: [{ id: PERSON_A }], error: null })) }));
    const ergebnis = await aktualisiereKontaktAction(PERSON_A, GUELTIGE_EINGABE);
    expect(ergebnis).toEqual({ success: true });
    expect(tabellen.Personen.update).toHaveBeenCalledWith(expect.objectContaining({ vorname: "Anton", telefon: null }));
    expect(tabellen.Personen.eq).toHaveBeenCalledWith("id", PERSON_A);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/kontakte");
  });
});

describe("loescheKontaktAction", () => {
  it("verweigert ohne Recht kontakte loeschen", async () => {
    setRechte({ loeschen: false });
    const ergebnis = await loescheKontaktAction(PERSON_A);
    expect(ergebnis.success).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("verschiebt die Person über den Papierkorb (soft_delete_record)", async () => {
    const ergebnis = await loescheKontaktAction(PERSON_C);
    expect(ergebnis).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("soft_delete_record", { p_table_name: "Personen", p_record_id: PERSON_C });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/kontakte");
  });

  it("meldet PE011 (aktive Rollen) verständlich und protokolliert nur den Code", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "PE011", message: "PE011: Person hat noch aktive Rollen" } });
    const ergebnis = await loescheKontaktAction(PERSON_A);
    expect(ergebnis).toEqual({ success: false, error: expect.stringContaining("Mieter oder Bewerber") });
    expect(mockLogAction).toHaveBeenCalledWith("loescheKontaktAction", "failed", { error_code: "PE011" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("erkennt PE011 auch an der Meldung, wenn kein Code mitkommt", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "PE011: Person hat noch aktive Rollen" } });
    const ergebnis = await loescheKontaktAction(PERSON_A);
    expect(ergebnis.success).toBe(false);
    expect(JSON.stringify(ergebnis)).toContain("Mieter oder Bewerber");
  });

  it("meldet andere Fehler generisch, ohne die Datenbankmeldung weiterzugeben", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "XX000", message: "interne Details" } });
    const ergebnis = await loescheKontaktAction(PERSON_A);
    expect(ergebnis.success).toBe(false);
    expect(JSON.stringify(ergebnis)).not.toContain("interne Details");
  });
});
