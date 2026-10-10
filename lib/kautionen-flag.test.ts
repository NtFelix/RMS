import { ermittleKautionFlagKonfig, KAUTION_FLAG_KEY, standardKautionFlagKonfig } from "@/lib/kautionen-flag";

const vollstaendig = {
  version: 1,
  arten: { barkaution: true, sparbuch: true, buergschaft: true, versicherung: true },
  bewegungsarten: ["einzahlung", "zinsgutschrift", "auszahlung", "abzug"],
  funktionen: { raten: true, dokumente: true, fristen: true, zinsen: true, abrechnung: true },
};

describe("ermittleKautionFlagKonfig", () => {
  it("uses the documented flag key", () => {
    expect(KAUTION_FLAG_KEY).toBe("advanced-kautionsmanagment");
  });

  it.each([undefined, null, 42, true, [], "kein json", '["x"]', {}, { version: 2, arten: { barkaution: true } }])(
    "falls back to the phase 1 defaults for an unusable payload (%p)",
    (payload) => {
      expect(ermittleKautionFlagKonfig(true, payload)).toEqual(standardKautionFlagKonfig(true));
    }
  );

  it("defaults to the bar deposit without extra functions", () => {
    const standard = standardKautionFlagKonfig(false);
    expect(standard.aktiv).toBe(false);
    expect(standard.arten).toEqual(["barkaution"]);
    expect(standard.bewegungsarten).toEqual(["einzahlung", "auszahlung", "abzug"]);
    expect(Object.values(standard.funktionen).every((an) => an === false)).toBe(true);
  });

  it("passes the flag state through", () => {
    expect(ermittleKautionFlagKonfig(false, vollstaendig).aktiv).toBe(false);
    expect(ermittleKautionFlagKonfig(true, vollstaendig).aktiv).toBe(true);
  });

  it("never offers more than the RPCs release, even if the payload enables everything", () => {
    const konfig = ermittleKautionFlagKonfig(true, vollstaendig);
    expect(konfig.arten).toEqual(["barkaution"]);
    expect(konfig.bewegungsarten).toEqual(["einzahlung", "auszahlung", "abzug"]);
  });

  it("takes the functions from the payload; a missing or non-true key counts as off", () => {
    const konfig = ermittleKautionFlagKonfig(true, {
      version: 1,
      funktionen: { raten: true, dokumente: "ja", fristen: 1 },
    });
    expect(konfig.funktionen).toEqual({ raten: true, dokumente: false, fristen: false, zinsen: false, abrechnung: false });
  });

  it("narrows the booking types to the ones listed in the payload (stable order)", () => {
    const konfig = ermittleKautionFlagKonfig(true, { version: 1, bewegungsarten: ["abzug", "einzahlung", "unbekannt"] });
    expect(konfig.bewegungsarten).toEqual(["einzahlung", "abzug"]);
  });

  it("uses the defaults when nothing usable is left for deposit or booking types", () => {
    const konfig = ermittleKautionFlagKonfig(true, {
      version: 1,
      arten: { barkaution: false, sparbuch: true },
      bewegungsarten: ["zinsgutschrift"],
    });
    expect(konfig.arten).toEqual(["barkaution"]);
    expect(konfig.bewegungsarten).toEqual(["einzahlung", "auszahlung", "abzug"]);
  });

  it("accepts a payload stored as a JSON string", () => {
    const konfig = ermittleKautionFlagKonfig(true, JSON.stringify({ version: 1, funktionen: { raten: true } }));
    expect(konfig.funktionen.raten).toBe(true);
  });
});
