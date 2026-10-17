/**
 * Tests of the interest period helpers (GH-6, phase 3): calendar arithmetic without time zone shifts, month, year and
 * leap-year boundaries, and the conversion between the exclusive end of the database and the inclusive end of the form.
 * All dates are synthetic.
 */

import { addiereTage, endeEinschliessend, endeEinschliessendSicher, endeExklusiv, istIsoDatum } from "@/lib/kautionen-zinsen";

describe("addiereTage", () => {
  it.each([
    ["2026-01-31", 1, "2026-02-01"],
    ["2025-12-31", 1, "2026-01-01"],
    ["2026-01-01", -1, "2025-12-31"],
    ["2026-03-01", -1, "2026-02-28"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2028-03-01", -1, "2028-02-29"],
    ["2027-02-28", 1, "2027-03-01"],
    ["2100-02-28", 1, "2100-03-01"],
    ["2000-02-28", 1, "2000-02-29"],
    ["2026-10-17", 0, "2026-10-17"],
    ["2026-03-28", 1, "2026-03-29"],
    ["2026-03-29", 1, "2026-03-30"],
    ["2026-10-24", -7, "2026-10-17"],
  ])("addiert %s + %i Tage = %s", (iso, n, erwartet) => {
    expect(addiereTage(iso, n)).toBe(erwartet);
  });

  it("zählt ein volles Jahr ohne Schaltjahr genau 365 Tage", () => {
    expect(addiereTage("2025-01-01", 365)).toBe("2026-01-01");
  });

  it("zählt ein Schaltjahr mit 366 Tagen", () => {
    expect(addiereTage("2028-01-01", 366)).toBe("2029-01-01");
  });

  it("wirft für ein Datum, das es nicht gibt", () => {
    expect(() => addiereTage("2026-02-31", 1)).toThrow(RangeError);
  });

  it("wirft für ein Format, das kein ISO-Datum ist", () => {
    expect(() => addiereTage("01.01.2026", 1)).toThrow(RangeError);
    expect(() => addiereTage("", 1)).toThrow(RangeError);
  });

  it("wirft für eine nicht ganzzahlige Anzahl Tage", () => {
    expect(() => addiereTage("2026-01-01", 1.5)).toThrow(RangeError);
  });
});

describe("endeEinschliessend und endeExklusiv", () => {
  it("zeigt das exklusive Ende der Datenbank als letzten Tag des Zeitraums", () => {
    expect(endeEinschliessend("2026-01-01")).toBe("2025-12-31");
  });

  it("gibt dem einschließlichen Ende den Tag danach für die Datenbank", () => {
    expect(endeExklusiv("2025-12-31")).toBe("2026-01-01");
  });

  it("ist mit der Umkehrung konsistent", () => {
    expect(endeExklusiv(endeEinschliessend("2027-03-01"))).toBe("2027-03-01");
  });

  it("liefert für ungültige Werte im Anzeige-Gegenstück null statt einer Ausnahme", () => {
    expect(endeEinschliessendSicher("2026-02-31")).toBeNull();
    expect(endeEinschliessendSicher(undefined)).toBeNull();
    expect(endeEinschliessendSicher("2026-01-01")).toBe("2025-12-31");
  });
});

describe("istIsoDatum", () => {
  it("akzeptiert nur echte Kalendertage im Format JJJJ-MM-TT", () => {
    expect(istIsoDatum("2028-02-29")).toBe(true);
    expect(istIsoDatum("2026-02-29")).toBe(false);
    expect(istIsoDatum("2026-1-01")).toBe(false);
    expect(istIsoDatum(null)).toBe(false);
  });
});
