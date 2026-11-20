/** @jest-environment node */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Mieter } from "@/lib/types";
import { gruppiereNachMietverhaeltnisImZeitraum } from "@/lib/abrechnung-mietverhaeltnis-laden";

// Synthetic placeholder data only
const tenant = (id: string, einzug = "2024-01-01", auszug: string | null = null): Mieter => ({
  id, wohnung_id: "apt-1", name: id, einzug, auszug, email: null, telefonnummer: null, notiz: null,
  nebenkosten: [{ id: `${id}-nk`, date: "2025-01-01", amount: "50" }], erstellt_von: "u",
});

type Antwort = { data: unknown; error: unknown };
type Zeile = { mieter_id: string; mietverhaeltnis_id: string; gueltig_ab: string; gueltig_bis: string | null };

/** Test double: answers per table; `in()` is the last call of the query. */
function client(antworten: Record<string, Antwort | (() => never)>) {
  const aufrufe: string[] = [];
  const supabase = {
    from: (table: string) => ({
      select: () => ({
        in: async () => {
          aufrufe.push(table);
          const antwort = antworten[table];
          if (typeof antwort === "function") return antwort();
          return antwort ?? { data: [], error: null };
        },
      }),
    }),
  } as unknown as SupabaseClient;
  return { supabase, aufrufe };
}

const zuordnungen = (data: Zeile[]) => client({ Mieter_Mietverhaeltnis_Zuordnungen: { data, error: null } });
const JAHR_2025 = { startdatum: "2025-01-01", enddatum: "2025-12-31" };
const JAHR_2026 = { startdatum: "2026-01-01", enddatum: "2026-12-31" };
const daten = () => ({ tenants: [tenant("a1"), tenant("a2")], rechnungen: [] });

describe("gruppiereNachMietverhaeltnisImZeitraum", () => {
  it("merges the rows that shared a tenancy in the period", async () => {
    const { supabase, aufrufe } = zuordnungen([
      { mieter_id: "a1", mietverhaeltnis_id: "mv-1", gueltig_ab: "2023-01-01", gueltig_bis: null },
      { mieter_id: "a2", mietverhaeltnis_id: "mv-1", gueltig_ab: "2023-01-01", gueltig_bis: null },
    ]);
    const ergebnis = await gruppiereNachMietverhaeltnisImZeitraum(supabase, daten(), JAHR_2025);
    expect(ergebnis.tenants).toHaveLength(1);
    expect(ergebnis.tenants[0]).toMatchObject({ id: "a1", name: "a1, a2", mietverhaeltnis_id: "mv-1" });
    expect(ergebnis.tenants[0].nebenkosten?.[0].amount).toBe("100");
    expect(aufrufe).toEqual(["Mieter_Mietverhaeltnis_Zuordnungen", "Mieter_Mietverhaeltnisse"]);
  });

  it("leaves rows with their own tenancy untouched (same object, as before)", async () => {
    const { supabase } = zuordnungen([
      { mieter_id: "a1", mietverhaeltnis_id: "mv-1", gueltig_ab: "2023-01-01", gueltig_bis: null },
      { mieter_id: "a2", mietverhaeltnis_id: "mv-2", gueltig_ab: "2023-01-01", gueltig_bis: null },
    ]);
    const eingabe = daten();
    expect(await gruppiereNachMietverhaeltnisImZeitraum(supabase, eingabe, JAHR_2025)).toBe(eingabe);
  });

  describe("2025 settled, merged on 01.03.2026", () => {
    // a2 had its own tenancy mv-2 until 28.02.2026 and belongs to mv-1 (of a1) from 01.03.2026.
    const historie: Zeile[] = [
      { mieter_id: "a1", mietverhaeltnis_id: "mv-1", gueltig_ab: "2023-01-01", gueltig_bis: null },
      { mieter_id: "a2", mietverhaeltnis_id: "mv-2", gueltig_ab: "2023-01-01", gueltig_bis: "2026-02-28" },
      { mieter_id: "a2", mietverhaeltnis_id: "mv-1", gueltig_ab: "2026-03-01", gueltig_bis: null },
    ];

    it("2025 stays exactly as it was (two settlements, same data object)", async () => {
      const { supabase } = zuordnungen(historie);
      const eingabe = daten();
      expect(await gruppiereNachMietverhaeltnisImZeitraum(supabase, eingabe, JAHR_2025)).toBe(eingabe);
    });

    it("2026 is settled together (tenancy on the reference day 31.12.2026)", async () => {
      const { supabase } = zuordnungen(historie);
      const ergebnis = await gruppiereNachMietverhaeltnisImZeitraum(supabase, daten(), JAHR_2026);
      expect(ergebnis.tenants.map(t => t.id)).toEqual(["a1"]);
      expect(ergebnis.tenants[0].mietverhaeltnis_id).toBe("mv-1");
    });
  });

  it("uses the tenancy on the move-out day for a tenant who left inside the period", async () => {
    // a2 left on 30.06.2025 while still in mv-1; afterwards it was moved to another tenancy (history only)
    const { supabase } = zuordnungen([
      { mieter_id: "a1", mietverhaeltnis_id: "mv-1", gueltig_ab: "2023-01-01", gueltig_bis: null },
      { mieter_id: "a2", mietverhaeltnis_id: "mv-1", gueltig_ab: "2023-01-01", gueltig_bis: "2025-08-31" },
      { mieter_id: "a2", mietverhaeltnis_id: "mv-9", gueltig_ab: "2025-09-01", gueltig_bis: null },
    ]);
    const eingabe = { tenants: [tenant("a1"), tenant("a2", "2024-01-01", "2025-06-30")], rechnungen: [] };
    const ergebnis = await gruppiereNachMietverhaeltnisImZeitraum(supabase, eingabe, JAHR_2025);
    expect(ergebnis.tenants.map(t => t.id)).toEqual(["a1"]);
  });

  it("settles a tenant without assignment on its own", async () => {
    const { supabase } = zuordnungen([{ mieter_id: "a1", mietverhaeltnis_id: "mv-1", gueltig_ab: "2023-01-01", gueltig_bis: null }]);
    const eingabe = daten();
    expect(await gruppiereNachMietverhaeltnisImZeitraum(supabase, eingabe, JAHR_2025)).toBe(eingabe);
  });

  it("skips everything without tenants", async () => {
    const { supabase, aufrufe } = client({});
    const eingabe = { tenants: [] as Mieter[], rechnungen: [] };
    expect(await gruppiereNachMietverhaeltnisImZeitraum(supabase, eingabe, JAHR_2025)).toBe(eingabe);
    expect(aufrufe).toEqual([]);
  });

  describe("contract area (flat share with single contracts)", () => {
    const zuordnung = (mieter: string, mv: string): Zeile => ({ mieter_id: mieter, mietverhaeltnis_id: mv, gueltig_ab: "2023-01-01", gueltig_bis: null });

    it("adds the area of the tenancy in the period to every tenant, also to a single one", async () => {
      const { supabase } = client({
        Mieter_Mietverhaeltnis_Zuordnungen: { data: [zuordnung("a1", "mv-1"), zuordnung("a2", "mv-2")], error: null },
        Mieter_Mietverhaeltnisse: { data: [{ id: "mv-1", flaeche: 50 }, { id: "mv-2", flaeche: "20.00" }], error: null },
      });
      const ergebnis = await gruppiereNachMietverhaeltnisImZeitraum(supabase, daten(), JAHR_2025);
      expect(ergebnis.tenants.map(t => [t.id, t.vertragsflaeche])).toEqual([["a1", 50], ["a2", 20]]);

      const einzeln = await gruppiereNachMietverhaeltnisImZeitraum(supabase, { tenants: [tenant("a1")], rechnungen: [] }, JAHR_2025);
      expect(einzeln.tenants[0].vertragsflaeche).toBe(50);
    });

    it("keeps the data object when no tenancy has an area", async () => {
      const { supabase } = client({
        Mieter_Mietverhaeltnis_Zuordnungen: { data: [zuordnung("a1", "mv-1"), zuordnung("a2", "mv-2")], error: null },
        Mieter_Mietverhaeltnisse: { data: [{ id: "mv-1", flaeche: null }, { id: "mv-2", flaeche: 0 }], error: null },
      });
      const eingabe = daten();
      expect(await gruppiereNachMietverhaeltnisImZeitraum(supabase, eingabe, JAHR_2025)).toBe(eingabe);
    });

    it("gives a merged tenancy the area of that tenancy", async () => {
      const { supabase } = client({
        Mieter_Mietverhaeltnis_Zuordnungen: { data: [zuordnung("a1", "mv-1"), zuordnung("a2", "mv-1")], error: null },
        Mieter_Mietverhaeltnisse: { data: [{ id: "mv-1", flaeche: 45 }], error: null },
      });
      const ergebnis = await gruppiereNachMietverhaeltnisImZeitraum(supabase, daten(), JAHR_2025);
      expect(ergebnis.tenants).toHaveLength(1);
      expect(ergebnis.tenants[0].vertragsflaeche).toBe(45);
    });

    it("drops the areas (equal split as before) when they cannot be read, and logs only the kind", async () => {
      const { supabase } = client({
        Mieter_Mietverhaeltnis_Zuordnungen: { data: [zuordnung("a1", "mv-1"), zuordnung("a2", "mv-2")], error: null },
        Mieter_Mietverhaeltnisse: { data: null, error: { code: "42703" } },
      });
      const log = jest.fn();
      const eingabe = daten();
      expect(await gruppiereNachMietverhaeltnisImZeitraum(supabase, eingabe, JAHR_2025, log)).toBe(eingabe);
      expect(log).toHaveBeenCalledWith("FLAECHE_NICHT_GELADEN");
    });

    describe("remaining area option of the apartment", () => {
      const mitWohnung = (id: string): Mieter => ({ ...tenant(id), Wohnungen: { name: "W", groesse: 70 } });
      const flaechen = { data: [{ id: "mv-1", flaeche: 50 }], error: null };
      const zuordnungenAB = { data: [zuordnung("a1", "mv-1"), zuordnung("a2", "mv-2")], error: null };

      it("sets the option on the apartment of every tenant when it is switched on", async () => {
        const { supabase, aufrufe } = client({
          Mieter_Mietverhaeltnis_Zuordnungen: zuordnungenAB,
          Mieter_Mietverhaeltnisse: flaechen,
          Wohnungen: { data: [{ id: "apt-1", restflaeche_verteilen: true }], error: null },
        });
        const ergebnis = await gruppiereNachMietverhaeltnisImZeitraum(supabase, { tenants: [mitWohnung("a1"), mitWohnung("a2")], rechnungen: [] }, JAHR_2025);
        expect(ergebnis.tenants.map(t => t.Wohnungen?.restflaeche_verteilen)).toEqual([true, true]);
        expect(ergebnis.tenants[0].Wohnungen?.groesse).toBe(70);
        expect(aufrufe).toEqual(["Mieter_Mietverhaeltnis_Zuordnungen", "Mieter_Mietverhaeltnisse", "Wohnungen"]);
      });

      it("leaves the option off when it is off or cannot be read (logs only the kind)", async () => {
        for (const [antwort, code] of [
          [{ data: [{ id: "apt-1", restflaeche_verteilen: false }], error: null }, null],
          [{ data: null, error: { code: "42703" } }, "RESTFLAECHE_NICHT_GELADEN"],
        ] as const) {
          const { supabase } = client({ Mieter_Mietverhaeltnis_Zuordnungen: zuordnungenAB, Mieter_Mietverhaeltnisse: flaechen, Wohnungen: antwort });
          const log = jest.fn();
          const ergebnis = await gruppiereNachMietverhaeltnisImZeitraum(supabase, { tenants: [mitWohnung("a1"), mitWohnung("a2")], rechnungen: [] }, JAHR_2025, log);
          expect(ergebnis.tenants.map(t => t.Wohnungen?.restflaeche_verteilen)).toEqual([undefined, undefined]);
          expect(ergebnis.tenants[0].vertragsflaeche).toBe(50);
          if (code) expect(log).toHaveBeenCalledWith(code);
          else expect(log).not.toHaveBeenCalled();
        }
      });

      it("does not read the option when no tenancy has an area", async () => {
        const { supabase, aufrufe } = client({ Mieter_Mietverhaeltnis_Zuordnungen: zuordnungenAB, Mieter_Mietverhaeltnisse: { data: [], error: null } });
        await gruppiereNachMietverhaeltnisImZeitraum(supabase, { tenants: [mitWohnung("a1"), mitWohnung("a2")], rechnungen: [] }, JAHR_2025);
        expect(aufrufe).not.toContain("Wohnungen");
      });
    });
  });

  it.each([
    ["missing period", {}, { startdatum: undefined, enddatum: "2025-12-31" }, "ZEITRAUM_UNGUELTIG"],
    ["period end before start", {}, { startdatum: "2025-12-31", enddatum: "2025-01-01" }, "ZEITRAUM_UNGUELTIG"],
    [
      "error reading the history (e.g. migration not yet live)",
      { Mieter_Mietverhaeltnis_Zuordnungen: { data: null, error: { code: "42P01" } } },
      JAHR_2025,
      "ZUORDNUNG_NICHT_GELADEN",
    ],
    [
      "exception",
      {
        Mieter_Mietverhaeltnis_Zuordnungen: () => {
          throw new Error("Netzwerkfehler mit Details, die nicht geloggt werden");
        },
      },
      JAHR_2025,
      "GRUPPIERUNG_FEHLER",
    ],
  ])("fail-soft on %s: data stays as it is, only the kind is logged", async (_name, antworten, zeitraum, code) => {
    const { supabase } = client(antworten as Record<string, Antwort | (() => never)>);
    const log = jest.fn();
    const eingabe = daten();
    expect(await gruppiereNachMietverhaeltnisImZeitraum(supabase, eingabe, zeitraum, log)).toBe(eingabe);
    expect(log).toHaveBeenCalledWith(code);
  });
});
