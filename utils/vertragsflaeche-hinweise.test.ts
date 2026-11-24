/**
 * Notes on contract areas (GH-17). Synthetic data only.
 */
import { flaechenHinweise, flaechenHinweisText, wgVerteilungHinweise, type VertragMitFlaeche } from "./vertragsflaeche-hinweise";

const v = (id: string, flaeche: number | null, beginn = "2024-01-01", ende: string | null = null): VertragMitFlaeche => ({ id, flaeche, beginn, ende });

describe("flaechenHinweise", () => {
  it("says nothing when no tenancy involved has an area", () => {
    expect(flaechenHinweise("a", [v("a", null), v("b", null)], 70, false)).toEqual([]);
  });

  it("counts only tenancies running at the same time (a future or ended contract never adds up)", () => {
    // a 50 m² from 2024; b 40 m² only 2020-2023; c 40 m² from 2027 after a ends on 2026-12-31
    const vertraege = [v("a", 50, "2024-01-01", "2026-12-31"), v("b", 40, "2020-01-01", "2023-12-31"), v("c", 40, "2027-01-01")];
    expect(flaechenHinweise("a", vertraege, 70, false)).toEqual([{ art: "leerstand", flaeche: 50, wohnungsgroesse: 70 }]);
  });

  it("uses the largest sum on one day, not the sum of all overlapping contracts", () => {
    // a 30 m² all the time; b 30 m² 2024; c 30 m² 2025: never more than 60 m² at the same time
    const nacheinander = [v("a", 30, "2024-01-01"), v("b", 30, "2024-01-01", "2024-12-31"), v("c", 30, "2025-01-01")];
    expect(flaechenHinweise("a", nacheinander, 70, false)).toEqual([]);
    // c starts while b still runs: 90 m² from 2024-06-01
    const gleichzeitig = [v("a", 30, "2024-01-01"), v("b", 30, "2024-01-01", "2024-12-31"), v("c", 30, "2024-06-01")];
    expect(flaechenHinweise("a", gleichzeitig, 70, false)).toEqual([{ art: "summe_zu_gross", summe: 90, wohnungsgroesse: 70 }]);
  });

  it("warns about vacancy for a single contract smaller than the apartment (65 of 70 m²)", () => {
    expect(flaechenHinweise("a", [v("a", 65)], 70, false)).toEqual([{ art: "leerstand", flaeche: 65, wohnungsgroesse: 70 }]);
    expect(flaechenHinweise("a", [v("a", 70)], 70, false)).toEqual([]);
  });

  it("reports missing areas, with the state of the remaining area option", () => {
    const vertraege = [v("a", 50), v("b", null), v("c", null)];
    expect(flaechenHinweise("a", vertraege, 70, false)).toEqual([
      { art: "leerstand", flaeche: 50, wohnungsgroesse: 70 },
      { art: "flaeche_fehlt", ohneFlaeche: 2, restflaecheVerteilen: false },
    ]);
    expect(flaechenHinweise("b", vertraege, 70, true)).toEqual([{ art: "flaeche_fehlt", ohneFlaeche: 2, restflaecheVerteilen: true }]);
  });

  it("reports a missing apartment size only, and nothing for an unknown tenancy", () => {
    expect(flaechenHinweise("a", [v("a", 50), v("b", 20)], null, false)).toEqual([{ art: "wohnungsgroesse_fehlt" }]);
    expect(flaechenHinweise("x", [v("a", 50)], 70, false)).toEqual([]);
  });

  it("has a German text for every note", () => {
    expect(flaechenHinweisText({ art: "leerstand", flaeche: 65, wohnungsgroesse: 70 })).toContain("65 m² von 70 m²");
    expect(flaechenHinweisText({ art: "summe_zu_gross", summe: 90.5, wohnungsgroesse: 70 })).toContain("90,5 m²");
    expect(flaechenHinweisText({ art: "flaeche_fehlt", ohneFlaeche: 1, restflaecheVerteilen: false })).toContain("gleich je Mitbewohner");
    expect(flaechenHinweisText({ art: "flaeche_fehlt", ohneFlaeche: 2, restflaecheVerteilen: true })).toContain("Restfläche");
    expect(flaechenHinweisText({ art: "wohnungsgroesse_fehlt" })).toContain("keine Größe");
  });
});

describe("wgVerteilungHinweise", () => {
  it("explains only the special days, with day or Rechentag counts", () => {
    expect(wgVerteilungHinweise({ gleich: 365 }, false)).toEqual([]);
    expect(wgVerteilungHinweise({ flaeche: 365 }, false)).toEqual([]);
    expect(wgVerteilungHinweise(undefined, false)).toEqual([]);
    const texte = wgVerteilungHinweise({ gleich_flaeche_fehlt: 181, flaeche_leerstand: 1 }, false);
    expect(texte).toHaveLength(2);
    expect(texte[0]).toContain("An 181 Tagen");
    expect(texte[1]).toContain("An 1 Tag ");
    expect(wgVerteilungHinweise({ restflaeche: 360 }, true)[0]).toContain("An 360 Rechentagen");
    expect(wgVerteilungHinweise({ restflaeche: 360 }, true)[0]).toContain("rechtlich zu klären");
  });
});
