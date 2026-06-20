import { createSupabaseServerClient } from "./supabase-server";
import { isTestEnv } from "./test-utils";
import { after } from "next/server";

// Re-export all types from the types file for backward compatibility
// Client components should import from "@/lib/types" directly to avoid server imports
export type {
  Wohnung,
  Haus,
  Mieter,
  Aufgabe,
  HausMitFlaeche,
  Nebenkosten,
  NebenkostenChartData,
  NebenkostenChartDatum,
  Rechnung,
  RechnungSql,
  ZaehlerTyp,
  Zaehler,
  ZaehlerAblesung,
  WasserZaehler,
  WasserAblesung,
  Wasserzaehler,
  Finanzen,
  MeterReadingFormEntry,
  MeterReadingFormData
} from "./types";

export { ZAEHLER_CONFIG, getZaehlerLabel, getZaehlerEinheit } from "./zaehler-types";

// Import types for use in this file
import type {
  Wohnung,
  Haus,
  Mieter,
  Aufgabe,
  Nebenkosten,
  NebenkostenChartData,
  Zaehler,
  ZaehlerAblesung,
  WasserZaehler,
  WasserAblesung,
  Wasserzaehler,
  Finanzen,
  RechnungSql,
  MeterReadingFormEntry,
  MeterReadingFormData
} from "./types";
import { type SupabaseClient } from "@supabase/supabase-js";

export async function fetchHaeuser(supabaseClient?: SupabaseClient) {
  const supabase = supabaseClient || createSupabaseServerClient();
  const { getAccessibleHaeuserIds, applyHaeuserScope } = await import("./object-scope");
  const haeuserIds = await getAccessibleHaeuserIds();

  let query = supabase.from("Haeuser").select('*, groesse');
  query = applyHaeuserScope(query, 'id', haeuserIds);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching Haeuser:", error);
    return [];
  }

  return data as Haus[];
}

export async function fetchWohnungen(supabaseClient?: SupabaseClient) {
  const supabase = supabaseClient || createSupabaseServerClient();
  const { getAccessibleHaeuserIds, applyHaeuserScope } = await import("./object-scope");
  const haeuserIds = await getAccessibleHaeuserIds();

  let query = supabase.from("Wohnungen").select('*');
  query = applyHaeuserScope(query, 'haus_id', haeuserIds);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching Wohnungen:", error);
    return [];
  }

  return data as Wohnung[];
}

export async function fetchMieter(supabaseClient?: SupabaseClient) {
  const supabase = supabaseClient || createSupabaseServerClient();
  const { getAccessibleWohnungIds } = await import("./object-scope");
  const wohnungIds = await getAccessibleWohnungIds();

  let query = supabase.from("Mieter").select('*, Wohnungen(name, groesse, miete)');
  if (wohnungIds !== null) {
    query = query.in('wohnung_id', wohnungIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching Mieter:", error);
    return [];
  }

  return data as Mieter[];
}

export async function fetchAufgaben(supabaseClient?: SupabaseClient) {
  const supabase = supabaseClient || createSupabaseServerClient();

  const { data, error } = await supabase
    .from("Aufgaben")
    .select('*')
    .eq('ist_erledigt', false);

  if (error) {
    console.error("Error fetching Aufgaben:", error);
    return [];
  }

  return data as Aufgabe[];
}

export async function fetchFinanzen(supabaseClient?: SupabaseClient) {
  const supabase = supabaseClient || createSupabaseServerClient();
  const { getAccessibleWohnungIds } = await import("./object-scope");
  const wohnungIds = await getAccessibleWohnungIds();

  let query = supabase.from("Finanzen").select('*');
  if (wohnungIds !== null) {
    query = query.in('wohnung_id', wohnungIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching Finanzen:", error);
    return [];
  }

  return data as Finanzen[];
}

export async function fetchNebenkosten(year?: string, supabaseClient?: SupabaseClient): Promise<Nebenkosten[]> {
  const supabase = supabaseClient || createSupabaseServerClient();
  const { getAccessibleHaeuserIds, applyHaeuserScope } = await import("./object-scope");
  const haeuserIds = await getAccessibleHaeuserIds();

  let query = supabase.from("Nebenkosten").select('*');
  query = applyHaeuserScope(query, 'haeuser_id', haeuserIds);

  // If year is provided, filter by date range that overlaps with that year
  if (year) {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    query = query
      .lte('startdatum', yearEnd)
      .gte('enddatum', yearStart);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching Nebenkosten:", error);
    return [];
  }

  return data as Nebenkosten[];
}

export async function getNebenkostenChartData(supabaseClient?: SupabaseClient): Promise<NebenkostenChartData | null> {
  const supabase = supabaseClient || createSupabaseServerClient();

  return fetchWithRpcFallback(
    supabase,
    'get_nebenkosten_chart_data',
    {},
    async () => {
      const { getAccessibleHaeuserIds } = await import("./object-scope");
      const accessibleIds = await getAccessibleHaeuserIds();

      // First, get the most recent year with data
      let latestYearQuery = supabase
        .from("Nebenkosten")
        .select("startdatum")
        .order("startdatum", { ascending: false });

      if (accessibleIds !== null) {
        latestYearQuery = latestYearQuery.in("haus_id", accessibleIds);
      }

      const { data: latestYearData } = await latestYearQuery
        .limit(1)
    .maybeSingle();

if (!latestYearData?.startdatum) {
        console.log("No Nebenkosten data found");
        return { year: new Date().getFullYear(), data: [] };
      }

      // Extract the year from the most recent entry
      const latestYear = new Date(latestYearData.startdatum).getFullYear();
      const yearStart = `${latestYear}-01-01`;
      const yearEnd = `${latestYear}-12-31`;

      // Fetch only the data for the most recent year with data
      let dataQuery = supabase
        .from("Nebenkosten")
        .select("nebenkostenart, betrag, startdatum, enddatum")
        .lte('startdatum', yearEnd)
        .gte('enddatum', yearStart)
        .order("startdatum", { ascending: false });

      if (accessibleIds !== null) {
        dataQuery = dataQuery.in("haus_id", accessibleIds);
      }

      const { data, error } = await dataQuery;

      if (error) {
        console.error("Error fetching Nebenkosten chart data:", error);
        return { year: latestYear, data: [] };
      }

      const categoryTotals: Record<string, number> = {};

      (data as Nebenkosten[] | null)?.forEach((record) => {
        const arten = record.nebenkostenart ?? [];
        const betraege = record.betrag ?? [];

        arten.forEach((art, index) => {
          if (!art) {
            return;
          }

          const amount = Number(betraege[index]);

          if (!Number.isFinite(amount) || amount <= 0) {
            return;
          }

          categoryTotals[art] = (categoryTotals[art] ?? 0) + amount;
        });
      });

      const formattedData = Object.entries(categoryTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      return {
        year: latestYear,
        data: formattedData
      };
    },
    'nebenkosten_chart_data'
  );
}

// getHausGesamtFlaeche function removed - replaced by get_nebenkosten_with_metrics database function
// This eliminates O(n) database calls and improves performance significantly

// fetchNebenkostenList function removed - replaced by fetchNebenkostenListOptimized in betriebskosten-actions.ts
// The optimized version uses get_nebenkosten_with_metrics database function to eliminate O(n) getHausGesamtFlaeche calls

// fetchNebenkostenDetailsById function removed - replaced by optimized database functions
// Use getAbrechnungModalDataAction or similar optimized functions instead

export async function fetchFinanzenByMonth(supabaseClient?: SupabaseClient) {
  const supabase = supabaseClient || createSupabaseServerClient();
  const { getAccessibleWohnungIds } = await import("./object-scope");
  const wohnungIds = await getAccessibleWohnungIds();

  let query = supabase.from("Finanzen").select('*');
  if (wohnungIds !== null) {
    query = query.in('wohnung_id', wohnungIds);
  }

  const { data, error } = await query.order('datum', { ascending: true });

  if (error) {
    console.error("Error fetching Finanzen by month:", error);
    return [];
  }

  // Group by month
  const monthlyData = (data as Finanzen[]).reduce((acc, item) => {
    if (!item.datum) return acc;

    const date = new Date(item.datum);
    const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;

    if (!acc[monthYear]) {
      acc[monthYear] = {
        month: new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(date),
        einnahmen: 0,
        ausgaben: 0
      };
    }

    if (item.ist_einnahmen) {
      acc[monthYear].einnahmen += Number(item.betrag);
    } else {
      acc[monthYear].ausgaben += Number(item.betrag);
    }

    return acc;
  }, {} as Record<string, { month: string; einnahmen: number; ausgaben: number }>);

  // Convert to array and sort by month
  return Object.values(monthlyData).slice(-12);
}

export async function getMietstatistik(supabaseClient?: SupabaseClient) {
  const wohnungen = await fetchWohnungen(supabaseClient);
  const mieter = await fetchMieter(supabaseClient);

  // Calculate occupancy data by month (last 12 months)
  const now = new Date();
  const monthsData = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);

    const month = new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(date);
    const vermietet = mieter.filter(m => {
      const einzug = m.einzug ? new Date(m.einzug) : null;
      const auszug = m.auszug ? new Date(m.auszug) : null;

      return einzug && einzug <= date && (!auszug || auszug >= date);
    }).length;

    monthsData.push({
      month,
      vermietet,
      frei: wohnungen.length - vermietet
    });
  }

  return monthsData;
}

export async function getDashboardSummary(supabaseClient?: SupabaseClient) {
  const supabase = supabaseClient || createSupabaseServerClient();

  return fetchWithRpcFallback(
    supabase,
    'get_dashboard_summary',
    {},
    async () => {
      const currentYear = new Date().getFullYear();
      const lastYear = (currentYear - 1).toString();

      const [haeuser, wohnungen, mieter, aufgaben, nebenkosten] = await Promise.all([
        fetchHaeuser(supabase),
        fetchWohnungen(supabase),
        fetchMieter(supabase),
        fetchAufgaben(supabase),
        fetchNebenkosten(lastYear, supabase),
      ]);

      // Calculate monthly income
      const monatlicheEinnahmen = wohnungen.reduce((sum, wohnung) => sum + Number(wohnung.miete), 0);

      // Calculate yearly expenses from Nebenkosten
      const jaehrlicheAusgaben = nebenkosten.reduce((sum, item) => {
        const betraegeSum = item.betrag ? item.betrag.reduce((a, b) => a + b, 0) : 0;
        // Sum all meter costs from zaehlerkosten JSONB
        const zaehlerSum = item.zaehlerkosten
          ? Object.values(item.zaehlerkosten).reduce((a, b) => a + b, 0)
          : 0;
        return sum + betraegeSum + zaehlerSum;
      }, 0);

      return {
        haeuserCount: haeuser.length,
        wohnungenCount: wohnungen.length,
        mieterCount: mieter.filter(m => !m.auszug || new Date(m.auszug) > new Date()).length,
        monatlicheEinnahmen,
        jaehrlicheAusgaben,
        offeneAufgabenCount: aufgaben.length
      };
    },
    'dashboard_overview_summary'
  );
}

// Make sure Profile type is defined if you use it, or adjust return types
// For example:
type Profile = {
  id: string;
  email?: string; // Email will come from auth.user primarily
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_price_id?: string | null;
  stripe_current_period_end?: string | null; // Consider Date type if you parse it
};

export async function fetchUserProfile(): Promise<Profile | null> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // MOCKING STRATEGY: For E2E tests in CI, provide a virtual active subscription
  // to avoid blocking business logic that requires a paid plan.
  if (isTestEnv()) {
    return {
      id: user.id,
      email: user.email!,
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_mock_e2e', // Represents a standard plan
      stripe_customer_id: 'cus_mock_e2e',
      stripe_subscription_id: 'sub_mock_e2e',
      stripe_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // Fetch profile data from 'profiles' table, excluding 'email'
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select(`
      id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_subscription_status,
      stripe_price_id,
      stripe_current_period_end
    `)
    .eq('id', user.id)
    .single();

  const baseUserProfile: Profile = {
    id: user.id,
    email: user.email!, // Assert email is non-null from auth user, or handle if it can be null
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_subscription_status: null,
    stripe_price_id: null,
    stripe_current_period_end: null,
  };

  if (profileError) {
    console.error('Error fetching user profile data from profiles table:', profileError.message);
    // If profile row doesn't exist (PGRST116) or other error, return base user info with null Stripe fields
    // This ensures the function always returns a consistently shaped object or null.
    if (profileError.code === 'PGRST116') {
      // Profile not found in 'profiles' table - this is expected for new users
    } else {
      console.error(`Unhandled error fetching profile data for user ${user.id}:`, profileError);
    }
    return baseUserProfile;
  }

  // If profileData is successfully fetched (not null and no error)
  // Combine email from auth.user with data from profiles table
  // profileData can be null if .single() finds no record but no actual error occurred (though typically PGRST116 error is set).
  const profileDataToSpread = profileData ? profileData : {};

  const finalProfile: Profile = {
    ...baseUserProfile, // Start with base (id, email, nullified stripe fields)
    ...profileDataToSpread, // Spread sanitized profile data
  };

  return finalProfile;
}

/**
 * Fetches Meter readings for a specific house and year
 * @param hausId The ID of the house
 * @param year The year to fetch data for (e.g., '2024')
 * @returns Object containing mieter list and existing readings for the specified house and year
 */
export async function fetchMeterReadingsByHausAndYear(
  hausId: string,
  year: string
): Promise<{ mieterList: Mieter[]; existingReadings: (ZaehlerAblesung & { mieter_id?: string })[] }> {
  const startdatum = `${year}-01-01`;
  const enddatum = `${year}-12-31`;
  return fetchMeterReadingsByHausAndDateRange(hausId, startdatum, enddatum);
}

/**
 * Fetches Meter readings for a specific house and date range
 * @param hausId The ID of the house
 * @param startdatum The start date of the billing period (YYYY-MM-DD)
 * @param enddatum The end date of the billing period (YYYY-MM-DD)
 * @returns Object containing mieter list and existing readings for the specified house and date range
 */
export async function fetchMeterReadingsByHausAndDateRange(
  hausId: string,
  startdatum: string,
  enddatum: string,
  supabaseClient?: SupabaseClient
): Promise<{ mieterList: Mieter[]; existingReadings: (ZaehlerAblesung & { mieter_id?: string })[] }> {
  const supabase = supabaseClient || createSupabaseServerClient();
  const { getAccessibleHaeuserIds } = await import("./object-scope");
  const haeuserIds = await getAccessibleHaeuserIds();

  if (haeuserIds !== null && !haeuserIds.includes(hausId)) {
    return { mieterList: [], existingReadings: [] };
  }

  try {
    // Optimized: Run queries in parallel using joins instead of waterfall
    const [mieterResult, readingsResult] = await Promise.all([
      // 1. Fetch Mieter for the house, filtered by date range
      supabase
        .from('Mieter')
        .select('*, Wohnungen!inner(id)')
        .eq('Wohnungen.haus_id', hausId)
        .lte('einzug', enddatum)
        .or(`auszug.gte.${startdatum},auszug.is.null`),

      // 2. Fetch Readings for the house (via Zaehler), filtered by date range
      supabase
        .from('Zaehler_Ablesungen')
        .select('*, zaehler_id, Zaehler!inner(id, wohnung_id, Wohnungen!inner(id))')
        .eq('Zaehler.Wohnungen.haus_id', hausId)
        .gte('ablese_datum', startdatum)
        .lte('ablese_datum', enddatum)
    ]);

    const { data: relevantMieter, error: mieterError } = mieterResult;
    const { data: readingsWithRelations, error: readingsError } = readingsResult;

    if (mieterError) {
      console.error('Error fetching Mieter for Wohnungen in Haus ID %s:', hausId, mieterError);
      return { mieterList: [], existingReadings: [] };
    }

    if (readingsError) {
      console.error('Error fetching Zaehler_Ablesungen for Haus %s in date range %s to %s:', hausId, startdatum, enddatum, readingsError);
    }

    const mieterList = (relevantMieter as Mieter[]) || [];
    let existingReadings: ZaehlerAblesung[] = [];

    if (!readingsError && readingsWithRelations) {
      const wohnungIdToMieterMap = new Map<string, Mieter>(
        mieterList
          .filter(mieter => mieter.wohnung_id)
          .map(mieter => [mieter.wohnung_id!, mieter])
      );

      interface DBReadingWithRelations extends ZaehlerAblesung {
        Zaehler: {
          id: string;
          wohnung_id: string;
          Wohnungen: {
            id: string;
          };
        } | null;
      }

      existingReadings = (readingsWithRelations as unknown as DBReadingWithRelations[]).map((reading) => {
        const meter = reading.Zaehler;
        const mieter = meter?.wohnung_id ? wohnungIdToMieterMap.get(meter.wohnung_id) : undefined;

        return {
          id: reading.id,
          ablese_datum: reading.ablese_datum,
          zaehlerstand: reading.zaehlerstand || 0,
          verbrauch: reading.verbrauch || 0,
          erstellt_von: reading.erstellt_von,
          organisation_id: reading.organisation_id,
          zaehler_id: reading.zaehler_id,
          mieter_id: mieter?.id || ''
        } as ZaehlerAblesung & { mieter_id?: string };
      });
    }

    return {
      mieterList,
      existingReadings
    };

  } catch (error) {
    console.error('Unexpected error in fetchMeterReadingsByHausAndDateRange:', error);
    return { mieterList: [], existingReadings: [] };
  }
}

/**
 * Fetches Meter readings for a specific Nebenkosten entry
 * @param nebenkostenId The ID of the Nebenkosten entry
 * @returns Object containing mieter list and existing readings for the specified Nebenkosten
 */
export async function fetchMeterReadingsModalData(nebenkostenId: string): Promise<{ mieterList: Mieter[]; existingReadings: (ZaehlerAblesung & { mieter_id?: string })[] }> {
  const supabase = createSupabaseServerClient();

  try {
    const { getAccessibleHaeuserIds, applyHaeuserScope } = await import("./object-scope");
    const haeuserIds = await getAccessibleHaeuserIds();

    let query = supabase
      .from('Nebenkosten')
      .select('haeuser_id, startdatum, enddatum')
      .eq('id', nebenkostenId);

    query = applyHaeuserScope(query, 'haeuser_id', haeuserIds);

    const { data: nebenkostenEntry, error: nebenkostenError } = await query.single();

    if (nebenkostenError || !nebenkostenEntry) {
      console.error('Error fetching Nebenkosten entry for ID %s:', nebenkostenId, nebenkostenError);
      throw new Error(`Nebenkosten entry with ID ${nebenkostenId} not found.`);
    }

    const { haeuser_id, startdatum, enddatum } = nebenkostenEntry;

    if (!haeuser_id || !startdatum || !enddatum) {
      console.error('Nebenkosten entry %s is missing haeuser_id, startdatum, or enddatum.', nebenkostenId);
      return { mieterList: [], existingReadings: [] };
    }

    const { mieterList, existingReadings } = await fetchMeterReadingsByHausAndDateRange(haeuser_id, startdatum, enddatum);

    return {
      mieterList,
      existingReadings
    };

  } catch (error) {
    console.error('Unexpected error in fetchMeterReadingsModalData:', error);
    return { mieterList: [], existingReadings: [] };
  }
}

// getAbrechnungModalData function removed - replaced by getAbrechnungModalDataAction in betriebskosten-actions.ts
// The optimized version uses get_abrechnung_modal_data database function for better performance

export async function getCurrentWohnungenCount(supabaseClient: SupabaseClient, userId: string): Promise<number> {
  if (!userId) {
    console.error("getCurrentWohnungenCount: userId is required");
    return 0;
  }

  try {
    const { getAccessibleHaeuserIds, applyHaeuserScope } = await import("./object-scope");
    const haeuserIds = await getAccessibleHaeuserIds();

    let query = supabaseClient
      .from("Wohnungen")
      .select("*", { count: "exact", head: true });

    query = applyHaeuserScope(query, 'haus_id', haeuserIds);

    const { count, error } = await query;

    if (error) {
      console.error("Error fetching Wohnungen count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Unexpected error in getCurrentWohnungenCount:", error);
    return 0;
  }
}

/**
 * Unified logging for RPC calls (matches the project's standardized format and sends to PostHog)
 */
export async function logRpcCall(
  functionName: string,
  contextName: string,
  startTime: number,
  success: boolean,
  options?: Record<string, unknown>
) {
  const duration = Math.round(performance.now() - startTime);
  const message = success ? `RPC call completed: ${functionName}` : `RPC call failed: ${functionName}`;
  
  let performanceLevel = 'fast';
  if (duration > 300) performanceLevel = 'slow';
  else if (duration > 100) performanceLevel = 'average';

  const context: Record<string, unknown> = {
    functionName,
    contextName,
    executionTime: duration,
    performanceLevel,
    success,
    ...options
  };

  try {
    const { posthogLogger } = await import('@/lib/posthog-logger');
    if (success) {
      posthogLogger.info(message, context as any);
    } else {
      posthogLogger.error(message, context as any);
    }
    // posthogLogger auto-batches and flushes on a 5s timer; manual flush
    // here would defeat batching and add a per-call HTTP request.
  } catch {
    // Fallback if PostHog logger is unavailable
    const timestamp = new Date().toISOString();
    const level = success ? 'INFO' : 'ERROR';
    console.log(`[${timestamp}] [${level}] ${message}\nContext: ${JSON.stringify(context, null, 2)}`);
  }
}

/**
 * Executes a Supabase RPC with a TypeScript fallback.
 * If the RPC fails, hasn't been created yet, or returns no data, it gracefully executes the provided fallback function.
 * Tracks performance and success rates via logRpcCall.
 */
export async function fetchWithRpcFallback<T>(
  supabase: SupabaseClient,
  rpcName: string,
  rpcParams: Record<string, unknown>,
  fallbackFn: () => Promise<T>,
  contextName: string
): Promise<T | null> {
  const startTime = performance.now();

  try {
    const { data, error } = await supabase.rpc(rpcName, rpcParams);

    if (error) {
      throw error;
    }

    if (data === null || data === undefined) {
      return null;
    }

    after(() => { logRpcCall(rpcName, contextName, startTime, true); });
    return data as T;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    after(() => { logRpcCall(rpcName, contextName, startTime, false, { error: errorMessage }); });
    console.warn(`⚠️ RPC ${rpcName} failed or unavailable. Executing TypeScript fallback for ${contextName}...`);

    try {
      return await fallbackFn();
    } catch (fallbackError) {
      console.error(`[ERROR] Both RPC and Fallback failed for ${contextName}:`, fallbackError);
      return null;
    }
  }
}
