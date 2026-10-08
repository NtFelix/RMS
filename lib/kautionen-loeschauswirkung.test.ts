import { chunkIds, mergeLoeschauswirkung } from "@/lib/kautionen-loeschauswirkung";
import type { KautionLoeschauswirkung, KautionLoeschKautionen } from "@/types/Kaution";

function kautionen(overrides: Partial<KautionLoeschKautionen> = {}): KautionLoeschKautionen {
  return {
    anzahl: 2,
    ohne_buchungen: 1,
    mit_buchungen: 1,
    konto_noch_offen: 400.1,
    konto_verwahrt: 600.2,
    dokumentiert_anzahl: 1,
    dokumentiert_summe: 2000.05,
    mit_saldo_anzahl: 1,
    mit_buchungen_gekuerzt: false,
    mit_buchungen_liste: [{ mieter_id: "m1", name: "Muster A", kautionsart: "barkaution", kontostand: 600.2, anzahl_buchungen: 2 }],
    ...overrides,
  };
}

function teil(overrides: Partial<KautionLoeschauswirkung> = {}): KautionLoeschauswirkung {
  return {
    tabelle: "Haeuser",
    anzahl_haeuser: 1,
    anzahl_wohnungen: 2,
    anzahl_mieter: 3,
    kautionen_sichtbar: true,
    kautionen: kautionen(),
    pruefsumme: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    eintraege: [{ id: "h1", anzahl_mieter: 3, mit_buchungen: 1, pruefsumme: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }],
    ...overrides,
  };
}

describe("mergeLoeschauswirkung", () => {
  it("returns a single part unchanged (keeps the checksum)", () => {
    const einzel = teil();

    expect(mergeLoeschauswirkung([einzel])).toBe(einzel);
  });

  it("adds counts and amounts exactly to the cent and concatenates the entries", () => {
    const zusammen = mergeLoeschauswirkung([
      teil(),
      teil({ eintraege: [{ id: "h2", anzahl_mieter: 3, mit_buchungen: 1, pruefsumme: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }] }),
    ]);

    expect(zusammen.anzahl_haeuser).toBe(2);
    expect(zusammen.anzahl_wohnungen).toBe(4);
    expect(zusammen.anzahl_mieter).toBe(6);
    expect(zusammen.kautionen).toMatchObject({
      anzahl: 4,
      ohne_buchungen: 2,
      mit_buchungen: 2,
      konto_noch_offen: 800.2,
      konto_verwahrt: 1200.4,
      dokumentiert_anzahl: 2,
      dokumentiert_summe: 4000.1,
      mit_saldo_anzahl: 2,
    });
    expect(zusammen.eintraege.map((eintrag) => eintrag.id)).toEqual(["h1", "h2"]);
    // The checksum of the whole is not used: each entry carries its own.
    expect(zusammen.pruefsumme).toBeNull();
  });

  it("shortens the combined list to 100 deposits and marks it", () => {
    const viele = Array.from({ length: 60 }, (_, index) => ({
      mieter_id: `m${index}`,
      name: null,
      kautionsart: "barkaution" as const,
      kontostand: 0,
      anzahl_buchungen: 1,
    }));

    const zusammen = mergeLoeschauswirkung([
      teil({ kautionen: kautionen({ mit_buchungen_liste: viele }) }),
      teil({ kautionen: kautionen({ mit_buchungen_liste: viele }) }),
    ]);

    expect(zusammen.kautionen?.mit_buchungen_liste).toHaveLength(100);
    expect(zusammen.kautionen?.mit_buchungen_gekuerzt).toBe(true);
  });

  it("keeps the flag 'shortened' of a part", () => {
    const zusammen = mergeLoeschauswirkung([teil({ kautionen: kautionen({ mit_buchungen_gekuerzt: true }) }), teil()]);

    expect(zusammen.kautionen?.mit_buchungen_gekuerzt).toBe(true);
  });

  it("without the right to see deposits there is no statement about deposits", () => {
    const ohne = teil({ kautionen_sichtbar: false, kautionen: null, pruefsumme: null });

    const zusammen = mergeLoeschauswirkung([ohne, ohne]);

    expect(zusammen.kautionen_sichtbar).toBe(false);
    expect(zusammen.kautionen).toBeNull();
    expect(zusammen.anzahl_mieter).toBe(6);
  });
});

describe("chunkIds", () => {
  it("splits into chunks of the given size", () => {
    expect(chunkIds(["a", "b", "c", "d", "e"], 2)).toEqual([["a", "b"], ["c", "d"], ["e"]]);
  });

  it("returns one chunk for a short list and none for an empty one", () => {
    expect(chunkIds(["a"], 200)).toEqual([["a"]]);
    expect(chunkIds([], 200)).toEqual([]);
  });
});
