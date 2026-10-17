/**
 * Tests for the input validation helpers of the deposit management. All values are synthetic.
 */

import {
  isUuid,
  validateKautionArtFelder,
  validateKautionDatum,
  validateKautionGetrennt,
  validateKautionIban,
  validateKautionText,
  validateKautionZinsmethode,
  validateUuid,
  validateZinsstaffel,
  validateZinszeitraum,
} from "@/lib/kautionen-validation";

describe("kautionen-validation", () => {
  describe("isUuid / validateUuid", () => {
    it("accepts UUIDs in any case", () => {
      expect(isUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
      expect(isUuid("AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA")).toBe(true);
      expect(validateUuid("11111111-1111-4111-8111-111111111111", "Mieter-ID")).toEqual({
        ok: true,
        value: "11111111-1111-4111-8111-111111111111",
      });
    });

    it.each([undefined, null, 1, {}, [], "", "tenant-1", "11111111-1111-4111-8111-11111111111", "11111111-1111-4111-8111-1111111111111", " 11111111-1111-4111-8111-111111111111"])(
      "rejects %p",
      (value) => {
        expect(isUuid(value)).toBe(false);
        expect(validateUuid(value, "Mieter-ID")).toEqual({ ok: false, message: "Ungültige Mieter-ID." });
      }
    );
  });

  describe("validateKautionDatum", () => {
    it.each(["2025-09-01", "1990-01-01", "2024-02-29", "2026-12-31"])("accepts %s", (datum) => {
      expect(validateKautionDatum(datum)).toEqual({ ok: true, value: datum });
    });

    it("trims the input", () => {
      expect(validateKautionDatum(" 2025-09-01 ")).toEqual({ ok: true, value: "2025-09-01" });
    });

    it.each(["2026-02-31", "2025-02-29", "2025-13-01", "2025-00-10", "2025-04-31", "2025-01-00", "2025-9-1", "01.09.2025", "2025/09/01", "2025-09-01T00:00:00Z", "", "abc"])(
      "rejects the invalid date %p",
      (datum) => {
        const result = validateKautionDatum(datum);
        expect(result.ok).toBe(false);
      }
    );

    it("names the accepted format (JJJJ-MM-TT) in the message, not a format that is rejected", () => {
      for (const datum of ["01.09.2025", "2026-02-31"]) {
        expect(validateKautionDatum(datum)).toEqual({ ok: false, message: "Wertstellung: Bitte geben Sie ein gültiges Datum an (JJJJ-MM-TT)." });
      }
    });

    it("rejects non-strings", () => {
      for (const value of [undefined, null, 20250901, new Date(), {}]) {
        expect(validateKautionDatum(value).ok).toBe(false);
      }
    });

    it("rejects dates before 1990-01-01 (database limit)", () => {
      expect(validateKautionDatum("1989-12-31")).toEqual({ ok: false, message: "Wertstellung darf nicht vor dem 01.01.1990 liegen." });
    });

    it("uses the label in the message and never repeats the input", () => {
      const result = validateKautionDatum("2026-02-31", "Das Datum");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain("Das Datum");
        expect(result.message).not.toContain("2026-02-31");
      }
    });
  });

  describe("validateKautionText", () => {
    const optional = { label: "Die Notiz", max: 10 };
    const required = { label: "Der Grund", min: 3, max: 10, required: true };

    it("trims and returns the text", () => {
      expect(validateKautionText("  Muster  ", optional)).toEqual({ ok: true, value: "Muster" });
    });

    it.each([undefined, null, "", "   "])("optional: %p is null", (value) => {
      expect(validateKautionText(value, optional)).toEqual({ ok: true, value: null });
    });

    it.each([undefined, null, "", "   "])("required: %p is an error", (value) => {
      expect(validateKautionText(value, required)).toEqual({ ok: false, message: "Der Grund ist erforderlich." });
    });

    it.each([1, true, {}, ["a"]])("rejects the non-string %p", (value) => {
      expect(validateKautionText(value, optional)).toEqual({ ok: false, message: "Die Notiz ist ungültig." });
    });

    it("checks the minimum and maximum length after trimming", () => {
      expect(validateKautionText(" ab ", required)).toEqual({ ok: false, message: "Der Grund muss zwischen 3 und 10 Zeichen lang sein." });
      expect(validateKautionText("abc", required)).toEqual({ ok: true, value: "abc" });
      expect(validateKautionText("a".repeat(10), required)).toEqual({ ok: true, value: "a".repeat(10) });
      expect(validateKautionText("a".repeat(11), required)).toEqual({ ok: false, message: "Der Grund muss zwischen 3 und 10 Zeichen lang sein." });
      expect(validateKautionText("a".repeat(11), optional)).toEqual({ ok: false, message: "Die Notiz darf höchstens 10 Zeichen lang sein." });
    });

    it("counts characters (code points), not UTF-16 units", () => {
      // 10 emoji = 20 UTF-16 units, but 10 characters (like char_length in the database)
      expect(validateKautionText("😀".repeat(10), optional).ok).toBe(true);
      expect(validateKautionText("😀".repeat(11), optional).ok).toBe(false);
    });

    it("does not repeat the rejected text in the message", () => {
      const result = validateKautionText("Muster-Freitext-zu-lang", optional);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).not.toContain("Muster-Freitext");
    });
  });

  describe("validateKautionIban", () => {
    it("normalises a valid IBAN (no spaces, upper case)", () => {
      expect(validateKautionIban("de89 3704 0044 0532 0130 00")).toEqual({ ok: true, value: "DE89370400440532013000" });
    });

    it.each([undefined, null, "", "   "])("treats %p as not given", (value) => {
      expect(validateKautionIban(value)).toEqual({ ok: true, value: null });
    });

    it("rejects an invalid IBAN without repeating it", () => {
      const result = validateKautionIban("DE89370400440532013001");
      expect(result).toEqual({ ok: false, message: "Bitte geben Sie eine gültige IBAN an." });
    });

    it("rejects an IBAN that is longer than 34 characters", () => {
      expect(validateKautionIban("DE89" + "0".repeat(31))).toEqual({ ok: false, message: "Die IBAN darf höchstens 34 Zeichen lang sein." });
    });

    it.each([1, true, {}, ["DE89370400440532013000"]])("rejects the non-string %p", (value) => {
      expect(validateKautionIban(value)).toEqual({ ok: false, message: "Die IBAN ist ungültig." });
    });
  });

  describe("validateKautionZinsmethode and validateKautionGetrennt", () => {
    it("accepts the three database methods only", () => {
      for (const methode of ["act_365", "act_360", "30_360"]) expect(validateKautionZinsmethode(methode)).toEqual({ ok: true, value: methode });
      for (const value of ["act/365", "act/act", null, undefined, 365]) {
        expect(validateKautionZinsmethode(value)).toEqual({ ok: false, message: "Die Zinsmethode ist ungültig." });
      }
    });

    it("accepts a boolean or nothing for the separate-account confirmation", () => {
      expect(validateKautionGetrennt(true)).toEqual({ ok: true, value: true });
      expect(validateKautionGetrennt(false)).toEqual({ ok: true, value: false });
      expect(validateKautionGetrennt(null)).toEqual({ ok: true, value: null });
      expect(validateKautionGetrennt(undefined)).toEqual({ ok: true, value: null });
      expect(validateKautionGetrennt("ja")).toEqual({ ok: false, message: "Die Angabe zur getrennten Anlage ist ungültig." });
    });
  });

  describe("validateKautionArtFelder (field belongs to the deposit type)", () => {
    it("accepts the account fields for bank account types and the document fields for guarantee and insurance", () => {
      expect(validateKautionArtFelder("barkaution", ["iban", "bank", "kontoinhaber", "getrennt_angelegt", "zinsmethode"]).ok).toBe(true);
      expect(validateKautionArtFelder("sparbuch", ["iban"]).ok).toBe(true);
      expect(validateKautionArtFelder("buergschaft", ["buerge_versicherer", "urkundennummer", "zinsmethode"]).ok).toBe(true);
      expect(validateKautionArtFelder("versicherung", ["urkundennummer"]).ok).toBe(true);
    });

    it("rejects an account field for guarantee and insurance and a document field for accounts", () => {
      expect(validateKautionArtFelder("buergschaft", ["iban"]).ok).toBe(false);
      expect(validateKautionArtFelder("versicherung", ["bank"]).ok).toBe(false);
      expect(validateKautionArtFelder("barkaution", ["urkundennummer"]).ok).toBe(false);
      expect(validateKautionArtFelder("sparbuch", ["buerge_versicherer"]).ok).toBe(false);
    });

    it("accepts no fields at all", () => {
      expect(validateKautionArtFelder("buergschaft", [])).toEqual({ ok: true, value: null });
    });
  });

  describe("validateZinsstaffel", () => {
    const zeile = (gueltigAb: string, zinssatzProzent: string) => ({ gueltigAb, zinssatzProzent });

    it("returns the rows with the exact decimal rates for the RPC", () => {
      expect(validateZinsstaffel([zeile("2025-01-01", "1,5"), zeile("2025-07-01", "2.0125")])).toEqual({
        ok: true,
        value: [
          { gueltig_ab: "2025-01-01", zinssatz_prozent: "1.5" },
          { gueltig_ab: "2025-07-01", zinssatz_prozent: "2.0125" },
        ],
      });
    });

    it("accepts an empty list (removes the schedule)", () => {
      expect(validateZinsstaffel([])).toEqual({ ok: true, value: [] });
    });

    it("rejects more than 20 rows", () => {
      const zuViele = Array.from({ length: 21 }, (_, i) => zeile(`${2000 + i}-01-01`, "1"));
      expect(validateZinsstaffel(zuViele)).toEqual({ ok: false, message: "Eine Zinsstaffel hat höchstens 20 Zeilen." });
    });

    it("requires strictly ascending dates", () => {
      const erwartet = { ok: false, message: "Die Gültigkeitsdaten der Zinsstaffel müssen in aufsteigender Reihenfolge liegen." };
      expect(validateZinsstaffel([zeile("2025-07-01", "1"), zeile("2025-01-01", "1")])).toEqual(erwartet);
      expect(validateZinsstaffel([zeile("2025-01-01", "1"), zeile("2025-01-01", "2")])).toEqual(erwartet);
    });

    it("checks each date (real calendar day, not before 1990) and each rate", () => {
      expect(validateZinsstaffel([zeile("2025-02-29", "1")]).ok).toBe(false);
      expect(validateZinsstaffel([zeile("1989-12-31", "1")])).toEqual({ ok: false, message: "Das Gültigkeitsdatum darf nicht vor dem 01.01.1990 liegen." });
      expect(validateZinsstaffel([zeile("2025-01-01", "100,5")])).toEqual({
        ok: false,
        message: "Der Zinssatz muss zwischen 0 und 100 liegen und höchstens 4 Nachkommastellen haben.",
      });
    });

    it("rejects a list that is not a list and rows that are not objects", () => {
      expect(validateZinsstaffel("Muster").ok).toBe(false);
      expect(validateZinsstaffel([null]).ok).toBe(false);
      expect(validateZinsstaffel([["2025-01-01", "1"]]).ok).toBe(false);
    });

    it("never repeats the rejected rate or date in the message", () => {
      const result = validateZinsstaffel([zeile("2025-02-31", "9,9999999")]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).not.toContain("2025-02-31");
        expect(result.message).not.toContain("9,9999999");
      }
    });
  });

  describe("validateZinszeitraum", () => {
    it("accepts a period with the start before the end", () => {
      expect(validateZinszeitraum("2025-01-01", "2026-01-01")).toEqual({ ok: true, value: { von: "2025-01-01", bis: "2026-01-01" } });
    });

    it("rejects an empty or inverted period", () => {
      const erwartet = { ok: false, message: "Das Ende des Zinszeitraums muss nach dem Beginn liegen." };
      expect(validateZinszeitraum("2025-01-01", "2025-01-01")).toEqual(erwartet);
      expect(validateZinszeitraum("2026-01-01", "2025-01-01")).toEqual(erwartet);
    });

    it("requires both dates to be valid", () => {
      expect(validateZinszeitraum(undefined, "2026-01-01").ok).toBe(false);
      expect(validateZinszeitraum("2025-01-01", "01.01.2026").ok).toBe(false);
    });
  });
});
