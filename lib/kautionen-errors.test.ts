/**
 * Tests for the mapping of deposit RPC errors (SQLSTATE contract between database and app).
 * All texts are synthetic. The tests also check that nothing but the code and a German message leaves the mapper.
 */

import {
  KAUTION_FEHLER_FALLBACK_MESSAGE,
  getKautionFehlerVerhalten,
  mapKautionError,
} from "@/lib/kautionen-errors";

describe("kautionen-errors", () => {
  describe("fixed messages (the database text is ignored)", () => {
    it.each([
      ["KA001", "Bitte melden Sie sich erneut an.", "anmelden"],
      ["42501", "Für diese Aktion fehlt die Berechtigung (Modul Kautionen).", "berechtigung"],
      ["KA002", "Kein Zugriff auf dieses Objekt.", "dialog_schliessen"],
      ["KA003", "Der Datensatz wurde nicht gefunden (evtl. bereits geändert oder gelöscht).", "neu_laden"],
      ["KA006", "Die Buchung ist bereits storniert.", "neu_laden"],
      ["KA008", "Für diesen Mieter ist bereits eine Kaution angelegt.", "neu_laden"],
      ["23503", "Der Datensatz ist verknüpft und kann nicht gelöscht werden.", "toast"],
      ["55P03", "Die Kaution wird gerade bearbeitet. Bitte versuchen Sie es in einem Moment erneut.", "wiederholen"],
    ])("%s", (code, message, verhalten) => {
      const result = mapKautionError({ code, message: "KAUT_IRGENDWAS: Interner Text der Datenbank." });
      expect(result).toEqual({ code, message, verhalten });
    });

    it("does not leak the database text for permission errors raised by Postgres itself", () => {
      const result = mapKautionError({
        code: "42501",
        message: 'new row violates row-level security policy for table "Kautionen_Bewegungen"',
      });
      expect(result.message).not.toMatch(/Kautionen_Bewegungen|row-level/);
      expect(result.verhalten).toBe("berechtigung");
    });
  });

  describe("pass-through of the German database message", () => {
    it.each([
      ["KA004", "KAUT_EINGABE_UNGUELTIG: Ungültiger Betrag (p_betrag).", "Ungültiger Betrag (p_betrag).", "formular"],
      [
        "KA005",
        "KAUT_SALDO_NEGATIV: Der Kontostand würde am 15.03.2026 um 100,00 € unter 0 fallen.",
        "Der Kontostand würde am 15.03.2026 um 100,00 € unter 0 fallen.",
        "formular",
      ],
      ["KA007", "KAUT_ZINS_REIHENFOLGE: Die Zinsgutschrift liegt vor der letzten Gutschrift.", "Die Zinsgutschrift liegt vor der letzten Gutschrift.", "formular"],
      [
        "KA009",
        "KAUT_GESPERRT: Der Mieter hat eine hinterlegte Kaution und kann nicht gelöscht werden.",
        "Der Mieter hat eine hinterlegte Kaution und kann nicht gelöscht werden.",
        "toast",
      ],
      ["KA011", "KAUT_RATENPLAN_GESPERRT: Die Summe der Raten weicht vom Soll ab.", "Die Summe der Raten weicht vom Soll ab.", "formular"],
      ["KA013", "KAUT_DATUM_UNGUELTIG: Die Wertstellung darf nicht in der Zukunft liegen.", "Die Wertstellung darf nicht in der Zukunft liegen.", "formular"],
      ["KA014", "KAUT_ART_OHNE_KONTO: Diese Kautionsart führt kein Konto.", "Diese Kautionsart führt kein Konto.", "formular"],
      ["KA015", "KAUT_PHASE_NICHT_VERFUEGBAR: Zinsgutschriften sind noch nicht verfügbar.", "Zinsgutschriften sind noch nicht verfügbar.", "formular"],
    ])("%s", (code, message, expected, verhalten) => {
      expect(mapKautionError({ code, message })).toEqual({ code, message: expected, verhalten });
    });

    it("removes the prefix only at the start and keeps colons inside the text", () => {
      const result = mapKautionError({ code: "KA004", message: "KAUT_EINGABE_UNGUELTIG: Hinweis: Betrag prüfen." });
      expect(result.message).toBe("Hinweis: Betrag prüfen.");
    });

    it("passes on a message without prefix unchanged", () => {
      expect(mapKautionError({ code: "KA005", message: "Der Kontostand würde unter 0 fallen." }).message).toBe(
        "Der Kontostand würde unter 0 fallen."
      );
    });

    it("falls back to a code specific German text when the message is missing or empty", () => {
      for (const error of [{ code: "KA005" }, { code: "KA005", message: "" }, { code: "KA005", message: "KAUT_SALDO_NEGATIV:" }]) {
        const result = mapKautionError(error);
        expect(result.code).toBe("KA005");
        expect(result.message).toBe("Der Kontostand würde dadurch unter 0 fallen.");
        expect(result.verhalten).toBe("formular");
      }
    });

    it("limits the length of a passed on message", () => {
      const result = mapKautionError({ code: "KA004", message: `KAUT_EINGABE_UNGUELTIG: ${"x".repeat(2000)}` });
      expect(result.message).toHaveLength(500);
    });
  });

  describe("unique violation 23505", () => {
    it("maps the active deposit index to KA008", () => {
      const result = mapKautionError({
        code: "23505",
        message: 'duplicate key value violates unique constraint "idx_kautionen_mieter_id_aktiv"',
        details: "Key (mieter_id)=(00000000-0000-0000-0000-000000000000) already exists.",
      });
      expect(result).toEqual({
        code: "KA008",
        message: "Für diesen Mieter ist bereits eine Kaution angelegt.",
        verhalten: "neu_laden",
      });
    });

    it("never exposes the details with key values", () => {
      const result = mapKautionError({
        code: "23505",
        message: 'duplicate key value violates unique constraint "idx_kautionen_mieter_id_aktiv"',
        details: "Key (mieter_id)=(00000000-0000-0000-0000-000000000000) already exists.",
      });
      expect(JSON.stringify(result)).not.toContain("00000000-0000");
    });

    it("treats any other unique violation as a generic error", () => {
      const result = mapKautionError({
        code: "23505",
        message: 'duplicate key value violates unique constraint "some_other_index"',
      });
      expect(result).toEqual({ message: KAUTION_FEHLER_FALLBACK_MESSAGE, verhalten: "toast" });
    });
  });

  describe("generic fallback", () => {
    it("uses the generic German text for unknown codes and does not pass the raw code on", () => {
      const result = mapKautionError({ code: "XX000", message: "internal error with secret detail" });
      expect(result).toEqual({
        message: "Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut.",
        verhalten: "toast",
      });
      expect(result).not.toHaveProperty("code");
    });

    it("does not pass on raw PostgREST or SQLSTATE codes", () => {
      for (const code of ["PGRST116", "PGRST000", "PGRST302", "42P01", "23502", "XX000"]) {
        const result = mapKautionError({ code, message: "raw text" });
        expect(result.code).toBeUndefined();
        expect(result.message).toBe(KAUTION_FEHLER_FALLBACK_MESSAGE);
        expect(result.verhalten).toBe("toast");
      }
    });

    it.each(["PGRST301", "PGRST303"])("maps the JWT error %s to KA001 (sign in again)", (code) => {
      expect(mapKautionError({ code, message: "JWT expired" })).toEqual({
        code: "KA001",
        message: "Bitte melden Sie sich erneut an.",
        verhalten: "anmelden",
      });
    });

    it("does not pass on messages of unassigned or unknown KA codes", () => {
      for (const code of ["KA010", "KA012", "KA099", "KA000"]) {
        const result = mapKautionError({ code, message: "KAUT_X: should stay internal" });
        expect(result.message).toBe(KAUTION_FEHLER_FALLBACK_MESSAGE);
        expect(result.code).toBeUndefined();
      }
    });

    it("handles errors without a code", () => {
      expect(mapKautionError({ message: "fetch failed" })).toEqual({
        message: KAUTION_FEHLER_FALLBACK_MESSAGE,
        verhalten: "toast",
      });
      expect(mapKautionError({})).toEqual({ message: KAUTION_FEHLER_FALLBACK_MESSAGE, verhalten: "toast" });
    });

    it("never throws for missing or malformed errors", () => {
      for (const error of [null, undefined, "boom", 42, true, [], { code: 42 }, { code: null }, { message: 42 }]) {
        const result = mapKautionError(error as never);
        expect(result.message).toBe(KAUTION_FEHLER_FALLBACK_MESSAGE);
        expect(result.verhalten).toBe("toast");
      }
    });

    it("ignores prototype keys as codes", () => {
      for (const code of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
        const result = mapKautionError({ code, message: "x" });
        expect(result.message).toBe(KAUTION_FEHLER_FALLBACK_MESSAGE);
      }
    });

    it("is case sensitive (SQLSTATEs are upper case)", () => {
      expect(mapKautionError({ code: "ka001", message: "x" }).message).toBe(KAUTION_FEHLER_FALLBACK_MESSAGE);
      expect(mapKautionError({ code: "55p03", message: "x" }).message).toBe(KAUTION_FEHLER_FALLBACK_MESSAGE);
    });
  });

  describe("getKautionFehlerVerhalten", () => {
    it("returns the UI behaviour of mapped codes", () => {
      expect(getKautionFehlerVerhalten("KA001")).toBe("anmelden");
      expect(getKautionFehlerVerhalten("42501")).toBe("berechtigung");
      expect(getKautionFehlerVerhalten("KA002")).toBe("dialog_schliessen");
      expect(getKautionFehlerVerhalten("KA003")).toBe("neu_laden");
      expect(getKautionFehlerVerhalten("KA005")).toBe("formular");
      expect(getKautionFehlerVerhalten("KA008")).toBe("neu_laden");
      expect(getKautionFehlerVerhalten("KA009")).toBe("toast");
      expect(getKautionFehlerVerhalten("55P03")).toBe("wiederholen");
    });

    it("defaults to a toast for unknown or missing codes", () => {
      expect(getKautionFehlerVerhalten("XX000")).toBe("toast");
      expect(getKautionFehlerVerhalten("constructor")).toBe("toast");
      expect(getKautionFehlerVerhalten(undefined)).toBe("toast");
    });

    it("agrees with mapKautionError for every defined code", () => {
      const codes = ["KA001", "42501", "KA002", "KA003", "KA004", "KA005", "KA006", "KA007", "KA008", "KA009", "KA011", "KA013", "KA014", "KA015", "23503", "55P03"];
      for (const code of codes) {
        expect(getKautionFehlerVerhalten(code)).toBe(mapKautionError({ code, message: "x" }).verhalten);
      }
    });
  });
});
