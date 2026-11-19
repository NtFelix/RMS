/** @jest-environment node */

import {
  CHECK_VERLETZT_MESSAGE,
  MIETVERHAELTNIS_FEHLER_FALLBACK_MESSAGE,
  ermittleWohnungswechselFehler,
  mapMietverhaeltnisError,
  mietverhaeltnisFehler,
} from "@/lib/mietverhaeltnis-errors";

describe("mapMietverhaeltnisError", () => {
  it.each([
    ["MV001", "Bitte melden Sie sich erneut an."],
    ["MV003", "Das Mietverhältnis oder der Eintrag wurde nicht gefunden."],
    ["MV004", "Die Eingabe ist ungültig."],
    ["MV005", "Die Miethistorie kann nicht vollständig entfernt werden."],
    ["MV006", "Das Mietverhältnis hat noch aktive Mieter. Die Änderung ist nicht möglich."],
    ["MV007", "Die Wohnung fehlt oder befindet sich im Papierkorb."],
    ["MV008", "Die Verknüpfung ist ungültig."],
    ["MV009", "Die Herkunft dieses Eintrags kann nicht geändert werden."],
    ["MV010", "Der Eintrag ist mit einem Dokument verknüpft und kann nicht entfernt werden."],
    ["42501", "Für diese Aktion fehlt die Berechtigung (Modul Mieter)."],
    ["23503", "Der Datensatz ist verknüpft und kann nicht geändert werden."],
    ["MV011", "Das Dokument wurde nicht gefunden oder Sie haben keinen Zugriff darauf."],
    ["MV012", "Der Mieter gehört bereits zu einem Mietverhältnis."],
    ["MV013", "Das Mietverhältnis hat weitere Mieter. Ein Umzug ist dafür noch nicht möglich."],
  ])("maps %s to a fixed German message with the same code", (code, message) => {
    expect(mapMietverhaeltnisError({ code, message: "MV004: interner Text mit Wert 1234" })).toEqual({ code, message });
  });

  it("maps a violated CHECK constraint (23514) to MV004 with the check message", () => {
    expect(mapMietverhaeltnisError({ code: "23514", message: 'new row violates check constraint "chk_vertragsende"' })).toEqual({
      code: "MV004",
      message: CHECK_VERLETZT_MESSAGE,
    });
    expect(CHECK_VERLETZT_MESSAGE).toBe("Die Angaben sind nicht zulässig. Bitte prüfen Sie die Daten.");
  });

  it("maps invalid and expired JWT errors to MV001", () => {
    expect(mapMietverhaeltnisError({ code: "PGRST301" })).toEqual({ code: "MV001", message: "Bitte melden Sie sich erneut an." });
    expect(mapMietverhaeltnisError({ code: "PGRST303" }).code).toBe("MV001");
  });

  it("never passes on database text, details or hints", () => {
    const result = mapMietverhaeltnisError({ code: "MV004", message: "Wert 1500,00 für Max Muster", details: "key=abc", hint: "x" });
    expect(result.message).not.toContain("1500");
    expect(result.message).not.toContain("Muster");
    expect(Object.keys(result).sort()).toEqual(["code", "message"]);
  });

  it.each([
    ["unknown code", { code: "P0001", message: "irgendwas" }],
    ["unassigned code", { code: "MV002", message: "irgendwas" }],
    ["missing code", { message: "ohne Code" }],
    ["non-string code", { code: 42 }],
    ["null", null],
    ["undefined", undefined],
    ["string", "MV004"],
  ])("falls back to UNBEKANNT for %s", (_label, error) => {
    expect(mapMietverhaeltnisError(error)).toEqual({ code: "UNBEKANNT", message: MIETVERHAELTNIS_FEHLER_FALLBACK_MESSAGE });
  });

  it("does not treat prototype keys as known codes", () => {
    expect(mapMietverhaeltnisError({ code: "constructor" }).code).toBe("UNBEKANNT");
    expect(mapMietverhaeltnisError({ code: "__proto__" }).code).toBe("UNBEKANNT");
  });
});

describe("mietverhaeltnisFehler", () => {
  it("returns the fixed message for a code", () => {
    expect(mietverhaeltnisFehler("MV004")).toEqual({ code: "MV004", message: "Die Eingabe ist ungültig." });
  });
});

describe("ermittleWohnungswechselFehler", () => {
  const meldung = "Die Wohnung kann hier nicht geändert werden, weil der Mieter zu einem Mietverhältnis gehört. Nutzen Sie im Abschnitt Mietverhältnis den Punkt „Umzug in eine andere Wohnung“.";

  it("maps 23503 with the constraint name in message to the apartment change text", () => {
    expect(
      ermittleWohnungswechselFehler({ code: "23503", message: 'update violates foreign key constraint "fk_mieter_mietverhaeltnis"' })
    ).toBe(meldung);
  });

  it("finds the constraint name in details too", () => {
    expect(ermittleWohnungswechselFehler({ code: "23503", message: "x", details: "fk_mieter_mietverhaeltnis" })).toBe(meldung);
  });

  it.each([
    ["other constraint", { code: "23503", message: 'violates constraint "fk_mieter_wohnung"' }],
    ["other code", { code: "23505", message: "fk_mieter_mietverhaeltnis" }],
    ["no code", { message: "fk_mieter_mietverhaeltnis" }],
    ["null", null],
  ])("returns null for %s", (_label, error) => {
    expect(ermittleWohnungswechselFehler(error)).toBeNull();
  });
});
