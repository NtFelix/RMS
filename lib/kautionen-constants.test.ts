/**
 * Tests for the constants of the deposit management (labels, thresholds, type guards).
 * The label records are exhaustive at compile time (`Record<Union, string>`), these tests guard the
 * values that must not drift: the neutral deadline wording and the guard behaviour for untrusted input.
 */

import {
  KAUTION_ABZUG_KATEGORIEN,
  KAUTION_ABZUG_KATEGORIE_LABELS,
  KAUTION_ARTEN,
  KAUTION_ARTEN_STANDARD,
  KAUTION_ARTEN_VERFUEGBAR,
  KAUTION_ART_LABELS,
  KAUTION_BEWEGUNGSARTEN,
  KAUTION_BEWEGUNGSARTEN_STANDARD,
  KAUTION_BEWEGUNGSARTEN_VERFUEGBAR,
  KAUTION_BEWEGUNGSART_LABELS,
  KAUTION_DOKUMENT_FELDER,
  KAUTION_FRIST_SCHWELLEN_MONATE,
  KAUTION_FRIST_STUFE_LABELS,
  KAUTION_FRIST_STUFE_TEXTE,
  KAUTION_KONTO_ARTEN,
  KAUTION_KONTO_FELDER,
  KAUTION_MIN_WERTSTELLUNG,
  KAUTION_TEXT_LIMITS,
  KAUTION_VEREINBARUNGSFELDER_JE_ART,
  KAUTION_ZINSMETHODEN,
  KAUTION_ZINSMETHODE_LABELS,
  KAUTION_ZINSMETHODE_STANDARD,
  KAUTION_ZINSSATZ_MAX_NACHKOMMASTELLEN,
  KAUTION_ZINSSTAFFEL_MAX_ZEILEN,
  KAUTION_ZUSTAND_LABELS,
  isKautionAbzugKategorie,
  isKautionArt,
  isKautionBewegungsArt,
  isKautionZinsmethode,
  kautionHatKonto,
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

  it("releases all deposit types and the interest credit for the RPCs (phase 3)", () => {
    expect([...KAUTION_ARTEN_VERFUEGBAR]).toEqual(["barkaution", "sparbuch", "buergschaft", "versicherung"]);
    expect([...KAUTION_BEWEGUNGSARTEN_VERFUEGBAR]).toEqual(["einzahlung", "zinsgutschrift", "auszahlung", "abzug"]);
    expect(KAUTION_ARTEN_VERFUEGBAR.every((art) => (KAUTION_ARTEN as readonly string[]).includes(art))).toBe(true);
    expect(KAUTION_BEWEGUNGSARTEN_VERFUEGBAR.every((art) => (KAUTION_BEWEGUNGSARTEN as readonly string[]).includes(art))).toBe(true);
  });

  it("keeps the phase 1 defaults for users without a flag payload (bar deposit, no interest credit)", () => {
    expect([...KAUTION_ARTEN_STANDARD]).toEqual(["barkaution"]);
    expect([...KAUTION_BEWEGUNGSARTEN_STANDARD]).toEqual(["einzahlung", "auszahlung", "abzug"]);
    expect(KAUTION_ARTEN_STANDARD.every((art) => KAUTION_ARTEN_VERFUEGBAR.includes(art))).toBe(true);
    expect(KAUTION_BEWEGUNGSARTEN_STANDARD.every((art) => KAUTION_BEWEGUNGSARTEN_VERFUEGBAR.includes(art))).toBe(true);
  });

  describe("accounts and agreement fields per deposit type", () => {
    it("only bar deposit and savings book have a bank account", () => {
      expect([...KAUTION_KONTO_ARTEN]).toEqual(["barkaution", "sparbuch"]);
      expect(kautionHatKonto("barkaution")).toBe(true);
      expect(kautionHatKonto("sparbuch")).toBe(true);
      expect(kautionHatKonto("buergschaft")).toBe(false);
      expect(kautionHatKonto("versicherung")).toBe(false);
    });

    it("assigns the bank fields to the account types and the document fields to guarantee and insurance", () => {
      expect([...KAUTION_KONTO_FELDER]).toEqual(["iban", "bank", "kontoinhaber", "getrennt_angelegt"]);
      expect([...KAUTION_DOKUMENT_FELDER]).toEqual(["buerge_versicherer", "urkundennummer"]);
      for (const art of ["barkaution", "sparbuch"] as const) {
        expect(KAUTION_VEREINBARUNGSFELDER_JE_ART[art]).toEqual(expect.arrayContaining([...KAUTION_KONTO_FELDER]));
        expect(KAUTION_VEREINBARUNGSFELDER_JE_ART[art]).not.toEqual(expect.arrayContaining([...KAUTION_DOKUMENT_FELDER]));
      }
      for (const art of ["buergschaft", "versicherung"] as const) {
        expect(KAUTION_VEREINBARUNGSFELDER_JE_ART[art]).toEqual(expect.arrayContaining([...KAUTION_DOKUMENT_FELDER]));
        expect(KAUTION_VEREINBARUNGSFELDER_JE_ART[art]).not.toEqual(expect.arrayContaining([...KAUTION_KONTO_FELDER]));
      }
    });

    it("allows the interest method for every type", () => {
      for (const art of KAUTION_ARTEN) expect(KAUTION_VEREINBARUNGSFELDER_JE_ART[art]).toContain("zinsmethode");
    });
  });

  describe("interest constants", () => {
    it("uses the three database day-count methods, act_365 as default", () => {
      expect([...KAUTION_ZINSMETHODEN]).toEqual(["act_365", "act_360", "30_360"]);
      expect(KAUTION_ZINSMETHODE_STANDARD).toBe("act_365");
      expect(KAUTION_ZINSMETHODE_LABELS).toEqual({ act_365: "act/365", act_360: "act/360", "30_360": "30/360" });
    });

    it("mirrors the limits of the interest schedule (20 rows, 4 decimal places)", () => {
      expect(KAUTION_ZINSSTAFFEL_MAX_ZEILEN).toBe(20);
      expect(KAUTION_ZINSSATZ_MAX_NACHKOMMASTELLEN).toBe(4);
    });
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

    it("mirrors the limits of the agreement texts (phase 3)", () => {
      expect(KAUTION_TEXT_LIMITS.iban.max).toBe(34);
      expect(KAUTION_TEXT_LIMITS.bank.max).toBe(200);
      expect(KAUTION_TEXT_LIMITS.kontoinhaber.max).toBe(200);
      expect(KAUTION_TEXT_LIMITS.buergeVersicherer.max).toBe(200);
      expect(KAUTION_TEXT_LIMITS.urkundennummer.max).toBe(100);
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

    it("accept exactly the three interest methods and reject the old spellings", () => {
      for (const methode of KAUTION_ZINSMETHODEN) expect(isKautionZinsmethode(methode)).toBe(true);
      for (const value of ["act/365", "act/360", "act/act", "ACT_365", "", null, 365, ["act_365"], "constructor"]) {
        expect(isKautionZinsmethode(value)).toBe(false);
      }
    });
  });
});
