/**
 * Tests for the strict money helpers of the deposit management.
 * Amounts are synthetic. No silent rounding, no ambiguous input.
 */

import {
  KAUTION_MAX_BETRAG_CENTS,
  centsToDecimalString,
  getMoneyInputError,
  isValidMoneyInput,
  parseMoneyInput,
  parseMoneyToCents,
} from "@/lib/kautionen-money";

describe("kautionen-money", () => {
  describe("parseMoneyToCents: accepted strings", () => {
    it.each([
      ["1500", 150000],
      ["1500,5", 150050],
      ["1500,50", 150050],
      ["1.500,50", 150050],
      ["1.234,56", 123456],
      ["1234,56", 123456],
      ["1234.56", 123456],
      ["1500.5", 150050],
      ["1500.50", 150050],
      ["0,01", 1],
      ["0.01", 1],
      ["0,5", 50],
      ["0", 0],
      ["0,00", 0],
      ["1", 100],
      ["650,10", 65010],
      ["  1500,00  ", 150000],
      ["007,5", 750],
      ["1.000.000,00", 100000000],
    ])("parses %j to %d cents", (input, cents) => {
      expect(parseMoneyToCents(input)).toBe(cents);
    });

    it("keeps the sum of 0,1 and 0,2 exact (no float noise)", () => {
      const sum = (parseMoneyToCents("0,1") as number) + (parseMoneyToCents("0,2") as number);
      expect(sum).toBe(30);
      expect(centsToDecimalString(sum)).toBe("0.30");
    });
  });

  describe("parseMoneyToCents: rejected strings", () => {
    it.each([
      // ambiguous: thousands separator or decimals?
      ["1.500"],
      ["1,500"],
      ["1.005"],
      ["123.456"],
      ["1.234.567"],
      // more than two decimal places (never rounded)
      ["1500,005"],
      ["1500.505"],
      ["1.0055"],
      ["12345.678"],
      ["0,001"],
      // negative, empty, not a number
      ["-5"],
      ["-0,50"],
      ["-1.500,00"],
      [""],
      ["   "],
      ["abc"],
      ["12abc"],
      ["1e3"],
      ["+5"],
      ["Infinity"],
      ["NaN"],
      // malformed
      ["1 500,00"],
      ["1500 €"],
      ["€ 1500"],
      ["1,5,3"],
      ["1,234,567"],
      ["2,550.00"],
      ["1500,"],
      ["1500."],
      [".5"],
      [",50"],
      [","],
      ["."],
      ["1.50,00"],
      ["12.34,56"],
      ["1500.5,00"],
    ])("rejects %j", (input) => {
      expect(parseMoneyToCents(input)).toBeNull();
    });
  });

  describe("parseMoneyToCents: limits", () => {
    it("accepts the maximum 99.999.999,99 in every notation", () => {
      expect(parseMoneyToCents("99.999.999,99")).toBe(KAUTION_MAX_BETRAG_CENTS);
      expect(parseMoneyToCents("99999999,99")).toBe(KAUTION_MAX_BETRAG_CENTS);
      expect(parseMoneyToCents("99999999.99")).toBe(KAUTION_MAX_BETRAG_CENTS);
      expect(parseMoneyToCents(99999999.99)).toBe(KAUTION_MAX_BETRAG_CENTS);
    });

    it("rejects the maximum plus one cent and above", () => {
      expect(parseMoneyToCents("100.000.000,00")).toBeNull();
      expect(parseMoneyToCents("100000000")).toBeNull();
      expect(parseMoneyToCents("100000000,00")).toBeNull();
      expect(parseMoneyToCents("99999999,995")).toBeNull();
      expect(parseMoneyToCents("99999999.999")).toBeNull();
      expect(parseMoneyToCents("123456789012345678901234567890")).toBeNull();
      expect(parseMoneyToCents(100000000)).toBeNull();
      expect(parseMoneyToCents(1e21)).toBeNull();
      expect(parseMoneyToCents(1e308)).toBeNull();
    });

    it("reports 'zu_gross' for values above the limit", () => {
      expect(parseMoneyInput("100.000.000,00")).toEqual({ ok: false, fehler: "zu_gross" });
      expect(parseMoneyInput(100000000)).toEqual({ ok: false, fehler: "zu_gross" });
    });
  });

  describe("parseMoneyToCents: numbers", () => {
    it("accepts numbers that are exact to the cent", () => {
      expect(parseMoneyToCents(12.5)).toBe(1250);
      expect(parseMoneyToCents(1500)).toBe(150000);
      expect(parseMoneyToCents(0.01)).toBe(1);
      expect(parseMoneyToCents(0)).toBe(0);
      expect(parseMoneyToCents(-0)).toBe(0);
    });

    it("tolerates float noise but not real extra decimals", () => {
      expect(parseMoneyToCents(1500.3000000000002)).toBe(150030);
      expect(parseMoneyToCents(0.1 + 0.2)).toBe(30);
      expect(parseMoneyToCents(4.35)).toBe(435);
      expect(parseMoneyToCents(1.005)).toBeNull();
      expect(parseMoneyToCents(0.001)).toBeNull();
      expect(parseMoneyToCents(0.005)).toBeNull();
    });

    it("rejects non-finite and negative numbers", () => {
      expect(parseMoneyToCents(NaN)).toBeNull();
      expect(parseMoneyToCents(Infinity)).toBeNull();
      expect(parseMoneyToCents(-Infinity)).toBeNull();
      expect(parseMoneyToCents(-1)).toBeNull();
      expect(parseMoneyToCents(-0.01)).toBeNull();
    });

    it("parses cent values from both ends of the range exactly when passed as a number", () => {
      const mismatches: number[] = [];
      const check = (cents: number) => {
        if (parseMoneyToCents(cents / 100) !== cents) mismatches.push(cents);
      };
      for (let cents = 0; cents <= 2_000_000; cents += 7) check(cents);
      for (let cents = KAUTION_MAX_BETRAG_CENTS - 2_000_000; cents <= KAUTION_MAX_BETRAG_CENTS; cents += 7) check(cents);
      expect(mismatches).toEqual([]);
    });
  });

  describe("parseMoneyToCents: untrusted runtime types", () => {
    it.each([[null], [undefined], [{}], [[]], [true], [BigInt(5)]])("rejects %p", (input) => {
      expect(parseMoneyToCents(input as unknown as string)).toBeNull();
    });
  });

  describe("parseMoneyInput reasons", () => {
    it.each([
      ["", "leer"],
      ["   ", "leer"],
      ["abc", "ungueltig"],
      ["1500,", "ungueltig"],
      ["-5", "negativ"],
      ["1.500", "mehrdeutig"],
      ["1.234.567", "mehrdeutig"],
      ["1.005", "mehrdeutig"],
      ["1,500", "nachkommastellen"],
      ["1500,005", "nachkommastellen"],
      ["1500.505", "nachkommastellen"],
      ["100.000.000,00", "zu_gross"],
    ] as const)("%j -> %s", (input, fehler) => {
      expect(parseMoneyInput(input)).toEqual({ ok: false, fehler });
    });

    it("returns the cents on success", () => {
      expect(parseMoneyInput("1.500,00")).toEqual({ ok: true, cents: 150000 });
    });
  });

  describe("isValidMoneyInput", () => {
    it("accepts positive amounts", () => {
      expect(isValidMoneyInput("0,01")).toBe(true);
      expect(isValidMoneyInput("1.500,00")).toBe(true);
      expect(isValidMoneyInput("1500.50")).toBe(true);
      expect(isValidMoneyInput(650.1)).toBe(true);
    });

    it("rejects zero by default and accepts it with allowZero", () => {
      expect(isValidMoneyInput("0")).toBe(false);
      expect(isValidMoneyInput("0,00")).toBe(false);
      expect(isValidMoneyInput(0)).toBe(false);
      expect(isValidMoneyInput("0,00", { allowZero: true })).toBe(true);
      expect(isValidMoneyInput(0, { allowZero: true })).toBe(true);
    });

    it("rejects ambiguous, negative, empty and too precise input", () => {
      expect(isValidMoneyInput("1.500")).toBe(false);
      expect(isValidMoneyInput("-5")).toBe(false);
      expect(isValidMoneyInput("")).toBe(false);
      expect(isValidMoneyInput("1,005")).toBe(false);
      expect(isValidMoneyInput("1,005", { allowZero: true })).toBe(false);
    });
  });

  describe("getMoneyInputError", () => {
    it("returns null for valid amounts", () => {
      expect(getMoneyInputError("1.500,00")).toBeNull();
      expect(getMoneyInputError("0", { allowZero: true })).toBeNull();
    });

    it("asks for a decimal comma for ambiguous input", () => {
      expect(getMoneyInputError("1.500")).toBe("Bitte den Betrag mit Komma angeben, z. B. 1500,00.");
    });

    it("returns distinct German messages per reason", () => {
      const messages = [
        getMoneyInputError(""),
        getMoneyInputError("abc"),
        getMoneyInputError("-5"),
        getMoneyInputError("1.500"),
        getMoneyInputError("1,005"),
        getMoneyInputError("100.000.000,00"),
        getMoneyInputError("0"),
      ];
      expect(messages.every((m) => typeof m === "string" && m.length > 0)).toBe(true);
      expect(new Set(messages).size).toBe(messages.length);
      expect(getMoneyInputError("1,005")).toBe("Beträge dürfen höchstens zwei Nachkommastellen haben.");
      expect(getMoneyInputError("100.000.000,00")).toBe("Der Betrag darf höchstens 99.999.999,99 € betragen.");
      expect(getMoneyInputError("0")).toBe("Der Betrag muss größer als 0 sein.");
    });
  });

  describe("centsToDecimalString", () => {
    it.each([
      [12345, "123.45"],
      [0, "0.00"],
      [1, "0.01"],
      [5, "0.05"],
      [10, "0.10"],
      [100, "1.00"],
      [150030, "1500.30"],
      [KAUTION_MAX_BETRAG_CENTS, "99999999.99"],
      [-150, "-1.50"],
      [-5, "-0.05"],
    ])("formats %d cents as %j", (cents, expected) => {
      expect(centsToDecimalString(cents)).toBe(expected);
    });

    it("formats negative zero as 0.00", () => {
      expect(centsToDecimalString(-0)).toBe("0.00");
    });

    it("throws instead of rounding for anything that is not whole cents", () => {
      expect(() => centsToDecimalString(1.5)).toThrow(RangeError);
      expect(() => centsToDecimalString(0.1 + 0.2)).toThrow(RangeError);
      expect(() => centsToDecimalString(NaN)).toThrow(RangeError);
      expect(() => centsToDecimalString(Infinity)).toThrow(RangeError);
      expect(() => centsToDecimalString(2 ** 53)).toThrow(RangeError);
    });

    it("round-trips with parseMoneyToCents", () => {
      for (const cents of [0, 1, 9, 10, 99, 100, 101, 65010, 150030, 123456, 9_999_999_998, KAUTION_MAX_BETRAG_CENTS]) {
        expect(parseMoneyToCents(centsToDecimalString(cents))).toBe(cents);
      }
      expect(centsToDecimalString(parseMoneyToCents("1.234,56") as number)).toBe("1234.56");
    });

    it("always sends a decimal point string with exactly two decimals", () => {
      expect(centsToDecimalString(parseMoneyToCents("1500,5") as number)).toMatch(/^\d+\.\d{2}$/);
    });
  });
});
