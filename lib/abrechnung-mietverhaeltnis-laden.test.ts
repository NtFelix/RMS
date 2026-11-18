/** @jest-environment node */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Mieter } from "@/lib/types";
import { wendeAbrechnungsmodusAn } from "@/lib/abrechnung-mietverhaeltnis-laden";

// Synthetic placeholder data only
const tenant = (id: string, einzug = "2024-01-01"): Mieter => ({
  id, wohnung_id: "apt-1", name: id, einzug, auszug: null, email: null, telefonnummer: null, notiz: null,
  nebenkosten: [{ id: `${id}-nk`, date: "2025-01-01", amount: "50" }], erstellt_von: "u",
});

type Antwort = { data: unknown; error: unknown };

/** Test double: answers per table; `in()` is the last call of both queries. */
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

const daten = () => ({ tenants: [tenant("a1"), tenant("a2")], rechnungen: [] });

describe("wendeAbrechnungsmodusAn", () => {
  it("merges the rows of a tenancy in mode gemeinsam", async () => {
    const { supabase } = client({
      Mieter: { data: [{ id: "a1", mietverhaeltnis_id: "mv-1" }, { id: "a2", mietverhaeltnis_id: "mv-1" }], error: null },
      Mieter_Mietverhaeltnisse: { data: [{ id: "mv-1", abrechnungsmodus: "gemeinsam" }], error: null },
    });
    const ergebnis = await wendeAbrechnungsmodusAn(supabase, daten());
    expect(ergebnis.tenants).toHaveLength(1);
    expect(ergebnis.tenants[0]).toMatchObject({ id: "a1", name: "a1, a2" });
    expect(ergebnis.tenants[0].nebenkosten?.[0].amount).toBe("100");
  });

  it("leaves mode je_mieter untouched (same object)", async () => {
    const { supabase } = client({
      Mieter: { data: [{ id: "a1", mietverhaeltnis_id: "mv-1" }, { id: "a2", mietverhaeltnis_id: "mv-1" }], error: null },
      Mieter_Mietverhaeltnisse: { data: [{ id: "mv-1", abrechnungsmodus: "je_mieter" }], error: null },
    });
    const eingabe = daten();
    expect(await wendeAbrechnungsmodusAn(supabase, eingabe)).toBe(eingabe);
  });

  it("skips the second query when no tenancy has two rows", async () => {
    const { supabase, aufrufe } = client({
      Mieter: { data: [{ id: "a1", mietverhaeltnis_id: "mv-1" }, { id: "a2", mietverhaeltnis_id: "mv-2" }], error: null },
    });
    const eingabe = daten();
    expect(await wendeAbrechnungsmodusAn(supabase, eingabe)).toBe(eingabe);
    expect(aufrufe).toEqual(["Mieter"]);
  });

  it("skips everything for fewer than two tenants", async () => {
    const { supabase, aufrufe } = client({});
    const eingabe = { tenants: [tenant("a1")], rechnungen: [] };
    expect(await wendeAbrechnungsmodusAn(supabase, eingabe)).toBe(eingabe);
    expect(aufrufe).toEqual([]);
  });

  it.each([
    ["error reading the tenants", { Mieter: { data: null, error: { code: "42501" } } }, "MIETVERHAELTNIS_NICHT_GELADEN"],
    [
      "error reading the tenancies",
      {
        Mieter: { data: [{ id: "a1", mietverhaeltnis_id: "mv-1" }, { id: "a2", mietverhaeltnis_id: "mv-1" }], error: null },
        Mieter_Mietverhaeltnisse: { data: null, error: { code: "42501" } },
      },
      "ABRECHNUNGSMODUS_NICHT_GELADEN",
    ],
    [
      "exception",
      {
        Mieter: () => {
          throw new Error("Netzwerkfehler mit Details, die nicht geloggt werden");
        },
      },
      "ABRECHNUNGSMODUS_FEHLER",
    ],
  ])("fail-soft on %s: data stays as it is, only the kind is logged", async (_name, antworten, code) => {
    const { supabase } = client(antworten as Record<string, Antwort | (() => never)>);
    const log = jest.fn();
    const eingabe = daten();
    expect(await wendeAbrechnungsmodusAn(supabase, eingabe, log)).toBe(eingabe);
    expect(log).toHaveBeenCalledWith(code);
  });
});
