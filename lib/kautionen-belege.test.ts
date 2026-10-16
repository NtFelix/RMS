/**
 * Tests of the pure helpers for the receipts of deposit bookings (GH-6, phase 2b).
 * Synthetic values only.
 */

import {
  BELEG_DOWNLOAD_GUELTIG_SEKUNDEN,
  anzeigeNameAusDateiname,
  baueBelegOrdner,
  baueBelegPfad,
  belegFehlerAntwort,
  belegFehlerStatus,
  belegTypLabel,
  bereinigeBelegDateiname,
  erzeugeBelegDateiname,
  formatBelegGroesse,
  istBelegAnfrageZuGross,
  istNichtAngemeldetFehler,
  parseBelegFehler,
  pruefeBelegDatei,
} from "@/lib/kautionen-belege";
import { MAX_FILE_SIZE } from "@/lib/finance-file-constants";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";

const USER_ID = "77777777-7777-4777-8777-777777777777";
const HAUS_ID = "55555555-5555-4555-8555-555555555555";
const WOHNUNG_ID = "66666666-6666-4666-8666-666666666666";
const MIETER_ID = "11111111-1111-4111-8111-111111111111";

describe("bereinigeBelegDateiname", () => {
  it.each([
    ["Rechnung Mai 2026.pdf", "Rechnung_Mai_2026.pdf"],
    ["Übergabeprotokoll Größe.pdf", "Übergabeprotokoll_Größe.pdf"],
    ["Beleg (Kopie) #2.PDF", "Beleg_Kopie_2.PDF"],
  ])("macht aus %j einen sicheren Namen %j", (eingabe, erwartet) => {
    expect(bereinigeBelegDateiname(eingabe)).toBe(erwartet);
  });

  it("entfernt Verzeichnisse beider Trennzeichen und lässt nur das letzte Segment", () => {
    expect(bereinigeBelegDateiname("../../etc/passwd")).toBe("passwd");
    expect(bereinigeBelegDateiname("C:\\Users\\Muster\\Beleg.pdf")).toBe("Beleg.pdf");
  });

  it("entfernt führende Punkte (keine versteckten Dateien, kein Verzeichnis '..')", () => {
    expect(bereinigeBelegDateiname("..hidden.pdf")).toBe("hidden.pdf");
    expect(bereinigeBelegDateiname("...")).toBe("Beleg");
  });

  it("entfernt Steuerzeichen", () => {
    expect(bereinigeBelegDateiname("Be\u0000leg\n.pdf")).toBe("Beleg.pdf");
  });

  it("begrenzt die Länge und die Endung", () => {
    const lang = bereinigeBelegDateiname(`${"a".repeat(300)}.pdf`);
    expect(lang.length).toBeLessThanOrEqual(120);
    expect(lang.endsWith(".pdf")).toBe(true);

    const langeEndung = bereinigeBelegDateiname("x.abcdefghijklmnopqrstuvwxyz");
    expect(langeEndung).toBe("x.abcdefghij");
  });

  it("liefert für fehlende oder unbrauchbare Eingaben einen festen Namen", () => {
    expect(bereinigeBelegDateiname(undefined)).toBe("Beleg");
    expect(bereinigeBelegDateiname(42)).toBe("Beleg");
    expect(bereinigeBelegDateiname("   ")).toBe("Beleg");
  });

  it("enthält nie einen Schrägstrich oder Backslash", () => {
    for (const eingabe of ["a/b/c.pdf", "a\\b\\c.pdf", "/abs/path.pdf", "..\\..\\x.pdf"]) {
      const ergebnis = bereinigeBelegDateiname(eingabe);
      expect(ergebnis).not.toMatch(/[\\/]/);
    }
  });
});

describe("erzeugeBelegDateiname und anzeigeNameAusDateiname", () => {
  it("setzt den Zeitstempel als Präfix davor (wie beim Finanz-Upload)", () => {
    expect(erzeugeBelegDateiname("Beleg.pdf", 1765000000000)).toBe("1765000000000_Beleg.pdf");
  });

  it("zeigt den Namen ohne Zeitstempel an", () => {
    expect(anzeigeNameAusDateiname("1765000000000_Beleg.pdf")).toBe("Beleg.pdf");
    expect(anzeigeNameAusDateiname("Beleg.pdf")).toBe("Beleg.pdf");
    expect(anzeigeNameAusDateiname("1765000000000_")).toBe("1765000000000_");
  });
});

describe("baueBelegOrdner und baueBelegPfad", () => {
  it("baut den Ordner user_<uid>/<haus>/<wohnung>/<mieter> aus den IDs", () => {
    expect(baueBelegOrdner({ userId: USER_ID, hausId: HAUS_ID, wohnungId: WOHNUNG_ID, mieterId: MIETER_ID })).toBe(
      `user_${USER_ID}/${HAUS_ID}/${WOHNUNG_ID}/${MIETER_ID}`
    );
  });

  it.each([
    ["eine fehlerhafte Haus-ID", { hausId: "../etc" }],
    ["eine fehlende Mieter-ID", { mieterId: "" }],
    ["eine Wohnungs-ID mit Pfadteil", { wohnungId: `${WOHNUNG_ID}/../x` }],
  ])("liefert null bei %s, damit kein Pfad aus unsicheren Werten entsteht", (_label, aenderung) => {
    const ids = { userId: USER_ID, hausId: HAUS_ID, wohnungId: WOHNUNG_ID, mieterId: MIETER_ID, ...aenderung };
    expect(baueBelegOrdner(ids)).toBeNull();
  });

  it("verbindet Ordner und Dateiname mit einem Schrägstrich (Speicherschlüssel)", () => {
    expect(baueBelegPfad("user_x/h/w/m", "1765000000000_Beleg.pdf")).toBe("user_x/h/w/m/1765000000000_Beleg.pdf");
  });

  it("hat eine Downloadgültigkeit von 300 Sekunden", () => {
    expect(BELEG_DOWNLOAD_GUELTIG_SEKUNDEN).toBe(300);
  });
});

describe("pruefeBelegDatei", () => {
  it("lehnt eine fehlende Datei ab (400)", () => {
    expect(pruefeBelegDatei(null)).toEqual({ ok: false, status: 400, message: "Bitte wählen Sie eine Datei aus." });
  });

  it("lehnt eine leere Datei ab (400)", () => {
    expect(pruefeBelegDatei({ size: 0, type: "application/pdf" })).toEqual({ ok: false, status: 400, message: "Die Datei ist leer." });
  });

  it("lehnt eine zu große Datei ab (413) und lässt die Grenze selbst zu", () => {
    expect(pruefeBelegDatei({ size: MAX_FILE_SIZE + 1, type: "application/pdf" })).toEqual({
      ok: false,
      status: 413,
      message: "Die Datei ist zu groß (max. 10MB).",
    });
    expect(pruefeBelegDatei({ size: MAX_FILE_SIZE, type: "application/pdf" })).toEqual({ ok: true });
  });

  it("lehnt einen nicht unterstützten Dateityp ab (400)", () => {
    expect(pruefeBelegDatei({ size: 10, type: "application/x-msdownload" })).toEqual({
      ok: false,
      status: 400,
      message: "Dieser Dateityp wird nicht unterstützt.",
    });
  });

  it("nimmt PDF, Bilder, Office-Dokumente, Text und CSV an", () => {
    for (const type of ["application/pdf", "image/png", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"]) {
      expect(pruefeBelegDatei({ size: 10, type })).toEqual({ ok: true });
    }
  });
});

describe("istBelegAnfrageZuGross", () => {
  it("prüft die Größe vor dem Lesen des Körpers, mit einem Zuschlag für die Felder", () => {
    expect(istBelegAnfrageZuGross(null)).toBe(false);
    expect(istBelegAnfrageZuGross("1000")).toBe(false);
    expect(istBelegAnfrageZuGross(String(MAX_FILE_SIZE + 1024 * 1024))).toBe(false);
    expect(istBelegAnfrageZuGross(String(MAX_FILE_SIZE + 1024 * 1024 + 1))).toBe(true);
    expect(istBelegAnfrageZuGross("keine-zahl")).toBe(false);
  });
});

describe("Fehler-Abbildung", () => {
  it.each([
    ["KA001", 401],
    ["42501", 403],
    ["KA002", 403],
    ["KA003", 404],
    ["KA004", 400],
    ["KA009", 409],
    ["55P03", 409],
    ["KA014", 500],
    ["XX000", 500],
    [undefined, 500],
  ])("ordnet den Code %s dem Status %s zu", (code, status) => {
    expect(belegFehlerStatus(code)).toBe(status);
  });

  it("bildet einen bekannten Fehler auf Status, Meldung und Code ab (ohne Rohdetails)", () => {
    const ergebnis = belegFehlerAntwort({ code: "KA003", message: "KAUT_NICHT_GEFUNDEN: Muster-Detail", details: "geheim" });

    expect(ergebnis.status).toBe(404);
    expect(ergebnis.unerwartet).toBe(false);
    expect(ergebnis.body).toEqual({
      error: { message: "Der Datensatz wurde nicht gefunden (evtl. bereits geändert oder gelöscht).", code: "KA003" },
    });
    expect(JSON.stringify(ergebnis.body)).not.toContain("Muster-Detail");
  });

  it("gibt bei unbekannten Fehlern nur die neutrale Meldung ohne Code zurück", () => {
    const ergebnis = belegFehlerAntwort({ code: "XX000", message: "interner Hinweis" });

    expect(ergebnis.status).toBe(500);
    expect(ergebnis.unerwartet).toBe(true);
    expect(ergebnis.body).toEqual({ error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } });
    expect(JSON.stringify(ergebnis.body)).not.toContain("XX000");
    expect(JSON.stringify(ergebnis.body)).not.toContain("interner Hinweis");
  });

  it("erkennt nur den Fehler 'nicht angemeldet' von ensureAuth als Anmeldeproblem", () => {
    expect(istNichtAngemeldetFehler(new Error("Nicht authentifiziert. Bitte melden Sie sich an."))).toBe(true);
    expect(istNichtAngemeldetFehler(new Error("connect ECONNREFUSED"))).toBe(false);
    expect(istNichtAngemeldetFehler("Nicht authentifiziert")).toBe(false);
  });

  it("liest die Meldung einer Fehlerantwort und fällt sonst auf die neutrale Meldung zurück", () => {
    expect(parseBelegFehler({ error: { message: "Die Datei ist leer.", code: "KA004" } })).toEqual({
      message: "Die Datei ist leer.",
      code: "KA004",
    });
    expect(parseBelegFehler({ error: { message: "Ohne Code." } })).toEqual({ message: "Ohne Code.", code: undefined });
    expect(parseBelegFehler(null)).toEqual({ message: KAUTION_FEHLER_FALLBACK_MESSAGE });
    expect(parseBelegFehler({ error: { message: "x".repeat(501) } })).toEqual({ message: KAUTION_FEHLER_FALLBACK_MESSAGE });
    expect(parseBelegFehler({ error: { message: 42 } })).toEqual({ message: KAUTION_FEHLER_FALLBACK_MESSAGE });
  });
});

describe("Anzeige von Typ und Größe", () => {
  it.each([
    ["application/pdf", "PDF"],
    ["image/jpeg", "JPEG-Bild"],
    ["application/msword", "Word-Dokument"],
    ["application/vnd.ms-excel", "Excel-Tabelle"],
    ["text/csv", "CSV-Datei"],
    ["application/x-unbekannt", "Datei"],
    [null, "Datei"],
  ])("zeigt für %s die Bezeichnung %s", (mime, label) => {
    expect(belegTypLabel(mime)).toBe(label);
  });

  it.each([
    [512, "512 B"],
    [2048, "2,0 KB"],
    [1572864, "1,5 MB"],
    [null, "–"],
    [-1, "–"],
  ])("formatiert %s Byte als %s", (bytes, text) => {
    expect(formatBelegGroesse(bytes)).toBe(text);
  });
});
