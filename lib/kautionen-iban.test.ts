/**
 * Tests for the IBAN helpers of the deposit management. Only the official example IBANs of the ISO/SWIFT
 * documentation and synthetic values are used.
 */

import { istGueltigeIban, normalisiereIban } from "@/lib/kautionen-iban";

describe("kautionen-iban", () => {
  describe("normalisiereIban", () => {
    it("removes all whitespace and upper-cases the text", () => {
      expect(normalisiereIban("de89 3704 0044 0532 0130 00")).toBe("DE89370400440532013000");
      expect(normalisiereIban("  gb82west12345698765432 ")).toBe("GB82WEST12345698765432");
      expect(normalisiereIban("DE89\t3704\n0044")).toBe("DE8937040044");
    });

    it.each([null, undefined, 123, {}, ["DE89"]])("returns an empty string for the non-string %p", (value) => {
      expect(normalisiereIban(value)).toBe("");
    });
  });

  describe("istGueltigeIban", () => {
    it.each([
      "DE89370400440532013000",
      "GB82WEST12345698765432",
      "de89 3704 0044 0532 0130 00",
      "gb82 west 1234 5698 7654 32",
    ])("accepts the valid example IBAN %p", (iban) => {
      expect(istGueltigeIban(iban)).toBe(true);
    });

    it("rejects an IBAN with one changed digit (mod-97 check)", () => {
      expect(istGueltigeIban("DE89370400440532013001")).toBe(false);
      expect(istGueltigeIban("GB82WEST12345698765431")).toBe(false);
    });

    it("rejects an IBAN with two swapped characters", () => {
      expect(istGueltigeIban("DE89370400440532013000".replace("37", "73"))).toBe(false);
    });

    it("rejects an IBAN that is too short or too long", () => {
      expect(istGueltigeIban("DE893704004405320130")).toBe(false);
      expect(istGueltigeIban("DE89370400440532013000" + "0".repeat(13))).toBe(false);
      expect(istGueltigeIban("DE")).toBe(false);
    });

    it.each([
      ["an empty text", ""],
      ["only spaces", "   "],
      ["letters only", "ABCDEFGHIJKLMNOPQRS"],
      ["letters in the check digit position", "DEXX370400440532013000"],
      ["a non-alphanumeric character", "DE89-3704-0044-0532-0130-00"],
    ])("rejects %s", (_label, iban) => {
      expect(istGueltigeIban(iban)).toBe(false);
    });

    it.each([null, undefined, 42, {}, ["DE89370400440532013000"]])("rejects the non-string %p", (value) => {
      expect(istGueltigeIban(value)).toBe(false);
    });
  });
});
