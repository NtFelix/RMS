/**
 * Tests of the instalment helpers (GH-6, phase 2): equal split in cents with the remainder on the last rate, monthly due
 * dates with month-end clamping and leap years, and the sum deviation. All amounts are synthetic.
 */

import { berechneRatenVorschlag, ratenSummeAbweichung, type RatenAnzahl } from "@/lib/kautionen-raten";

describe("berechneRatenVorschlag: Betrag", () => {
  it("splits 1.000,00 € into three rates with the remainder on the last rate (333,33 / 333,33 / 333,34)", () => {
    expect(berechneRatenVorschlag(100000, "2027-01-15", 3)).toEqual([
      { faelligkeitsdatum: "2027-01-15", sollCents: 33333 },
      { faelligkeitsdatum: "2027-02-15", sollCents: 33333 },
      { faelligkeitsdatum: "2027-03-15", sollCents: 33334 },
    ]);
  });

  it("gives the remainder of two cents to the last rate (100,01 € / 3 -> 33,33 / 33,33 / 33,35)", () => {
    const vorschlag = berechneRatenVorschlag(10001, "2027-01-15", 3);

    expect(vorschlag?.map((rate) => rate.sollCents)).toEqual([3333, 3333, 3335]);
  });

  it("splits evenly when the amount divides without remainder", () => {
    expect(berechneRatenVorschlag(90000, "2027-01-01", 3)?.map((rate) => rate.sollCents)).toEqual([30000, 30000, 30000]);
    expect(berechneRatenVorschlag(10000, "2027-01-01", 2)?.map((rate) => rate.sollCents)).toEqual([5000, 5000]);
  });

  it("returns the whole amount and the given date for a single rate", () => {
    expect(berechneRatenVorschlag(150000, "2027-05-20", 1)).toEqual([{ faelligkeitsdatum: "2027-05-20", sollCents: 150000 }]);
  });

  it("returns null if any rate would be below one cent (0,02 € in three rates)", () => {
    expect(berechneRatenVorschlag(2, "2027-01-15", 3)).toBeNull();
    expect(berechneRatenVorschlag(1, "2027-01-15", 2)).toBeNull();
  });

  it("accepts the smallest possible split (0,03 € in three rates = one cent each)", () => {
    expect(berechneRatenVorschlag(3, "2027-01-15", 3)?.map((rate) => rate.sollCents)).toEqual([1, 1, 1]);
  });

  it("sums to the target amount for every count and a range of amounts (no cent lost or invented)", () => {
    for (const anzahl of [1, 2, 3] as RatenAnzahl[]) {
      for (let sollCents = 3; sollCents <= 2000; sollCents += 7) {
        const vorschlag = berechneRatenVorschlag(sollCents, "2027-01-31", anzahl);
        expect(vorschlag).not.toBeNull();
        expect(vorschlag?.reduce((summe, rate) => summe + rate.sollCents, 0)).toBe(sollCents);
        expect(vorschlag?.every((rate) => Number.isSafeInteger(rate.sollCents) && rate.sollCents >= 1)).toBe(true);
      }
    }
  });
});

describe("berechneRatenVorschlag: Fälligkeitsdaten", () => {
  it("keeps the first due date and adds whole months on the same day", () => {
    const vorschlag = berechneRatenVorschlag(90000, "2026-08-15", 3);

    expect(vorschlag?.map((rate) => rate.faelligkeitsdatum)).toEqual(["2026-08-15", "2026-09-15", "2026-10-15"]);
  });

  it("clamps the 31st to the last day of shorter months and returns to the 31st where possible", () => {
    const vorschlag = berechneRatenVorschlag(90000, "2027-01-31", 3);

    expect(vorschlag?.map((rate) => rate.faelligkeitsdatum)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
  });

  it("keeps the 30th where the target month has one, across the year end", () => {
    const vorschlag = berechneRatenVorschlag(90000, "2026-11-30", 3);

    expect(vorschlag?.map((rate) => rate.faelligkeitsdatum)).toEqual(["2026-11-30", "2026-12-30", "2027-01-30"]);
  });

  it("uses 29 February in a leap year and 28 February in a common year", () => {
    expect(berechneRatenVorschlag(90000, "2028-01-31", 3)?.map((rate) => rate.faelligkeitsdatum)).toEqual([
      "2028-01-31",
      "2028-02-29",
      "2028-03-31",
    ]);
    expect(berechneRatenVorschlag(90000, "2027-01-31", 2)?.map((rate) => rate.faelligkeitsdatum)[1]).toBe("2027-02-28");
  });

  it("treats the century years correctly (2100 is no leap year, 2000 is)", () => {
    expect(berechneRatenVorschlag(20000, "2100-01-31", 2)?.map((rate) => rate.faelligkeitsdatum)[1]).toBe("2100-02-28");
    expect(berechneRatenVorschlag(20000, "2000-01-31", 2)?.map((rate) => rate.faelligkeitsdatum)[1]).toBe("2000-02-29");
  });

  it("rolls the year over", () => {
    expect(berechneRatenVorschlag(90000, "2026-12-15", 3)?.map((rate) => rate.faelligkeitsdatum)).toEqual([
      "2026-12-15",
      "2027-01-15",
      "2027-02-15",
    ]);
  });

  it("is free of time zone effects: the dates are the given calendar days, whatever the process time zone", () => {
    const vorschlag = berechneRatenVorschlag(90000, "2027-03-01", 2);

    expect(vorschlag?.map((rate) => rate.faelligkeitsdatum)).toEqual(["2027-03-01", "2027-04-01"]);
  });
});

describe("berechneRatenVorschlag: ungültige Eingaben", () => {
  it.each([
    ["zero", 0],
    ["a negative amount", -100],
    ["a fractional cent value", 10.5],
    ["NaN", Number.NaN],
    ["an amount above the safe integer range", Number.MAX_SAFE_INTEGER + 2],
  ])("returns null for %s", (_label, sollCents) => {
    expect(berechneRatenVorschlag(sollCents, "2027-01-15", 3)).toBeNull();
  });

  it.each([
    ["an impossible day", "2027-02-31"],
    ["a month above 12", "2027-13-01"],
    ["German notation", "31.01.2027"],
    ["a short year", "27-01-31"],
    ["an empty string", ""],
    ["a timestamp", "2027-01-31T10:00:00"],
  ])("returns null for the date %s (%s)", (_label, datum) => {
    expect(berechneRatenVorschlag(90000, datum, 3)).toBeNull();
  });

  it("returns null for a count other than 1 to 3", () => {
    expect(berechneRatenVorschlag(90000, "2027-01-15", 0 as RatenAnzahl)).toBeNull();
    expect(berechneRatenVorschlag(90000, "2027-01-15", 4 as RatenAnzahl)).toBeNull();
  });
});

describe("ratenSummeAbweichung", () => {
  const raten = [{ sollCents: 33333 }, { sollCents: 33333 }, { sollCents: 33334 }];

  it("is 0 when the rates add up to the target amount", () => {
    expect(ratenSummeAbweichung(raten, 100000)).toBe(0);
  });

  it("is positive when the rates are higher and negative when they are lower", () => {
    expect(ratenSummeAbweichung(raten, 99999)).toBe(1);
    expect(ratenSummeAbweichung(raten, 100001)).toBe(-1);
  });

  it("compares a plan without rates with the target amount", () => {
    expect(ratenSummeAbweichung([], 100000)).toBe(-100000);
    expect(ratenSummeAbweichung([], 0)).toBe(0);
  });
});
