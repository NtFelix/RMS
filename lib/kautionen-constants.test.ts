/**
 * Tests for the constants of the deposit management (labels, thresholds, type guards).
 * The label records are exhaustive at compile time (`Record<Union, string>`), these tests guard the
 * values that must not drift: the neutral deadline wording and the guard behaviour for untrusted input.
 */

import {
  KAUTION_ABZUG_KATEGORIEN,
  KAUTION_ABZUG_KATEGORIE_LABELS,
  KAUTION_ARTEN,
  KAUTION_ARTEN_VERFUEGBAR,
  KAUTION_ART_LABELS,
  KAUTION_BEWEGUNGSARTEN,
  KAUTION_BEWEGUNGSARTEN_VERFUEGBAR,
  KAUTION_BEWEGUNGSART_LABELS,
  KAUTION_FRIST_SCHWELLEN_MONATE,
  KAUTION_FRIST_STUFE_LABELS,
  KAUTION_FRIST_STUFE_TEXTE,
  KAUTION_MIN_WERTSTELLUNG,
  KAUTION_TEXT_LIMITS,
  KAUTION_ZUSTAND_LABELS,
  isKautionAbzugKategorie,
  isKautionArt,
  isKautionBewegungsArt,
} from "@/lib/kautionen-constants";

describe("kautionen-constants", () => {
  it("lists the values that the database CHECK constraints allow", () => {
    expect([...KAUTION_ARTEN]).toEqual(["barkaution", "sparbuch", "buergschaft", "versicherung"]);
    expect([...KAUTION_BEWEGUNGSARTEN]).toEqual(["einzahlung", "zinsgutschrift", "auszahlung", "abzug"]);
    expect([...KAUTION_ABZUG_KATEGORIEN]).toEqual(["schaden", "mietrueckstand", "nebenkosten", "sonstiges"]);
  });

  it("has a non-empty German label for every value", () => {
    for (const art of KAUTION_ARTEN) expect(KAUTION_ART_LABELS[art]).toBeTruthy();
    for (const art of KAUTION_BEWEGUNGSARTEN) expect(KAUTION_BEWEGUNGSART_LABELS[art]).toBeTruthy();
    for (const kategorie of KAUTION_ABZUG_KATEGORIEN) expect(KAUTION_ABZUG_KATEGORIE_LABELS[kategorie]).toBeTruthy();
    expect(Object.keys(KAUTION_ZUSTAND_LABELS).sort()).toEqual(
      ["abgeschlossen", "dokumentiert", "in_rueckzahlung", "offen", "teilweise", "verwahrt"]
    );
    expect(KAUTION_ZUSTAND_LABELS.teilweise).toBe("Teilweise eingegangen");
    expect(KAUTION_ZUSTAND_LABELS.in_rueckzahlung).toBe("In Rückzahlung");
  });

  it("releases only phase 1 values for the RPCs (deposit type bar deposit, no interest credit)", () => {
    expect([...KAUTION_ARTEN_VERFUEGBAR]).toEqual(["barkaution"]);
    expect([...KAUTION_BEWEGUNGSARTEN_VERFUEGBAR]).toEqual(["einzahlung", "auszahlung", "abzug"]);
    expect(KAUTION_ARTEN_VERFUEGBAR.every((art) => (KAUTION_ARTEN as readonly string[]).includes(art))).toBe(true);
    expect(KAUTION_BEWEGUNGSARTEN_VERFUEGBAR.every((art) => (KAUTION_BEWEGUNGSARTEN as readonly string[]).includes(art))).toBe(true);
  });

  describe("deadline thresholds and texts", () => {
    it("uses the fixed thresholds of 3 and 6 months", () => {
      expect(KAUTION_FRIST_SCHWELLEN_MONATE).toEqual({ zeitnah: 3, richtwert: 6 });
    });

    it("derives the texts from the thresholds and uses neutral wording (LEGAL-1/3)", () => {
      expect(KAUTION_FRIST_STUFE_TEXTE.zeitnah).toBe(
        "Zeitnah auszahlen – das Mietverhältnis ist seit mehr als 3 Monaten beendet."
      );
      expect(KAUTION_FRIST_STUFE_TEXTE.richtwert_ueberschritten).toBe(
        "Richtwert überschritten – das Mietverhältnis ist seit mehr als 6 Monaten beendet."
      );
      const allTexts = [...Object.values(KAUTION_FRIST_STUFE_TEXTE), ...Object.values(KAUTION_FRIST_STUFE_LABELS)];
      for (const text of allTexts) expect(text.toLowerCase()).not.toContain("überfällig");
      expect(KAUTION_FRIST_STUFE_LABELS.richtwert_ueberschritten).toBe("Richtwert überschritten");
    });
  });

  describe("limits", () => {
    it("mirrors the database text limits", () => {
      expect(KAUTION_TEXT_LIMITS.grund).toEqual({ min: 3, max: 500 });
      expect(KAUTION_TEXT_LIMITS.stornoGrund).toEqual({ min: 3, max: 500 });
      expect(KAUTION_TEXT_LIMITS.interneNotiz.max).toBe(2000);
      expect(KAUTION_TEXT_LIMITS.empfaenger.max).toBe(200);
    });

    it("uses 1990-01-01 as earliest value date", () => {
      expect(KAUTION_MIN_WERTSTELLUNG).toBe("1990-01-01");
    });
  });

  describe("type guards", () => {
    it("accept exactly the defined values", () => {
      for (const art of KAUTION_ARTEN) expect(isKautionArt(art)).toBe(true);
      for (const art of KAUTION_BEWEGUNGSARTEN) expect(isKautionBewegungsArt(art)).toBe(true);
      for (const kategorie of KAUTION_ABZUG_KATEGORIEN) expect(isKautionAbzugKategorie(kategorie)).toBe(true);
    });

    it("reject unknown, differently cased and non-string values", () => {
      const invalid = ["", "Barkaution", "bar", "zins", "Schaden", "constructor", "__proto__", "toString", null, undefined, 1, {}, [], ["barkaution"]];
      for (const value of invalid) {
        expect(isKautionArt(value)).toBe(false);
        expect(isKautionBewegungsArt(value)).toBe(false);
        expect(isKautionAbzugKategorie(value)).toBe(false);
      }
    });

    it("do not mix up the three value sets", () => {
      expect(isKautionArt("einzahlung")).toBe(false);
      expect(isKautionBewegungsArt("barkaution")).toBe(false);
      expect(isKautionAbzugKategorie("abzug")).toBe(false);
    });
  });
});
