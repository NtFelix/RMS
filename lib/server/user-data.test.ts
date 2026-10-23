/** @jest-environment node */

/**
 * Tests für getSidebarUserData: Die Wohnungsanzahl wird nur über RLS (organisation_id) eingegrenzt.
 * Ein Filter auf die umbenannte Spalte `user_id` (heute `erstellt_von`) lässt die Abfrage mit
 * "column Wohnungen.user_id does not exist" scheitern und die Anzahl stillschweigend auf 0 fallen.
 * Alle Daten sind synthetische Platzhalter.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSidebarUserData } from "./user-data";

jest.mock("@/lib/stripe-server", () => ({ getPlanDetails: jest.fn() }));
jest.mock("@/lib/permissions-core", () => ({ evaluatePermission: jest.fn(async () => true) }));

const USER = { id: "user-1", email: "test@example.com", user_metadata: {} } as unknown as User;
const PROFILE = { stripe_subscription_status: "active", stripe_price_id: null };

/** Minimaler Supabase-Fake: zeichnet pro Tabelle alle Filter-Aufrufe auf und liefert das vorgegebene Zählergebnis. */
function createSupabaseFake(countResult: { count: number | null; error: unknown }) {
  const filterCalls: string[] = [];
  const wohnungenQuery: {
    select: jest.Mock;
    eq: jest.Mock;
    then: (resolve: (value: typeof countResult) => unknown) => unknown;
  } = {
    select: jest.fn(() => wohnungenQuery),
    eq: jest.fn((column: string) => {
      filterCalls.push(column);
      return wohnungenQuery;
    }),
    then: (resolve: (value: typeof countResult) => unknown) => resolve(countResult),
  };
  const supabase = {
    from: jest.fn((table: string) => {
      if (table === "Wohnungen") return wohnungenQuery;
      throw new Error(`Unexpected table ${table}`);
    }),
    rpc: jest.fn(async () => ({ data: null })),
  } as unknown as SupabaseClient;
  return { supabase, wohnungenQuery, filterCalls };
}

describe("getSidebarUserData apartment count", () => {
  afterEach(() => jest.restoreAllMocks());

  it("counts apartments without filtering on a user column", async () => {
    const { supabase, wohnungenQuery, filterCalls } = createSupabaseFake({ count: 3, error: null });

    const result = await getSidebarUserData(supabase, USER, PROFILE);

    expect(wohnungenQuery.select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(filterCalls).toEqual([]);
    expect(result.apartmentCount).toBe(3);
  });

  it("logs a failed count and falls back to 0", async () => {
    const error = { code: "42703", message: "column Wohnungen.example does not exist" };
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { supabase } = createSupabaseFake({ count: null, error });

    const result = await getSidebarUserData(supabase, USER, PROFILE);

    expect(result.apartmentCount).toBe(0);
    expect(errorSpy).toHaveBeenCalledWith("[getSidebarUserData] Failed to count apartments:", error);
  });
});
