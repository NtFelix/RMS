/**
 * Tests for the input validation helpers of the deposit management. All values are synthetic.
 */

import { isUuid, validateKautionDatum, validateKautionText, validateUuid } from "@/lib/kautionen-validation";

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
});
