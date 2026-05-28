// "use client" directive removed. This file is now a pure Server Component.

export const runtime = 'edge';
import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { posthogLogger } from "@/lib/posthog-logger";
import HaeuserClientView from "./client-wrapper"; // Import the default export client view
import { formatNumber } from "@/utils/format";
import { House } from "@/components/tables/house-table"; // Type for enrichedHaeuser

export default async function HaeuserPage() {
  const { supabase, user } = await requireAuthenticatedUser();

  let housesData: any[] | null = null;
  let apartmentsData: any[] | null = null;
  let tenantsData: any[] | null = null;

  const startTime = Date.now();

  // 1. Try single aggregated RPC request
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_sidebar_insights_data');
    if (rpcError) throw rpcError;
    if (!rpcData) throw new Error('No data returned from RPC');

    const duration = Date.now() - startTime;
    posthogLogger.info('HaeuserPage: Loaded data via RPC', {
      'action.name': 'HaeuserPage_fetch',
      'action.status': 'success',
      'action.duration_ms': duration,
      'action.user_id': user.id,
      'action.method': 'RPC'
    });
    housesData = rpcData.houses;
    apartmentsData = rpcData.apartments;
    tenantsData = rpcData.tenants;
  } catch (rpcErr) {
    const rpcDuration = Date.now() - startTime;
    posthogLogger.warn('HaeuserPage: RPC fetching failed, trying parallel selects fallback', {
      'action.name': 'HaeuserPage_fetch',
      'action.status': 'rpc_failed',
      'action.duration_ms': rpcDuration,
      'action.user_id': user.id,
      'action.error_message': rpcErr instanceof Error ? rpcErr.message : String(rpcErr)
    });

    // 2. Fallback: Load data in parallel
    const fallbackStartTime = Date.now();
    try {
      const [
        { data: rawHouses, error: housesError },
        { data: rawApartments, error: apartmentsError },
        { data: rawTenants, error: tenantsError }
      ] = await Promise.all([
        supabase.from('Haeuser').select('*').eq('user_id', user.id),
        supabase.from('Wohnungen').select('*').eq('user_id', user.id),
        supabase.from('Mieter').select('wohnung_id,einzug,auszug').eq('user_id', user.id)
      ]);

      if (housesError || apartmentsError || tenantsError) {
        throw new Error(JSON.stringify({ housesError, apartmentsError, tenantsError }));
      }

      housesData = rawHouses;
      apartmentsData = rawApartments;
      tenantsData = rawTenants;

      const fallbackDuration = Date.now() - fallbackStartTime;
      posthogLogger.info('HaeuserPage: Loaded data via fallback queries', {
        'action.name': 'HaeuserPage_fetch_fallback',
        'action.status': 'success',
        'action.duration_ms': fallbackDuration,
        'action.user_id': user.id
      });
    } catch (fallbackErr) {
      posthogLogger.error('HaeuserPage: Fallback queries failed', {
        'action.name': 'HaeuserPage_fetch_fallback',
        'action.status': 'error',
        'action.user_id': user.id,
        'action.error_message': fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
      });
      return <div>Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.</div>;
    }
  }

  const houses = housesData ?? [];
  const apartments = apartmentsData ?? [];
  const tenants = tenantsData ?? [];

  // Enrich houses with stats
  const enrichedHaeuser: House[] = houses.map(house => {
    const apts = apartments.filter(a => a.haus_id === house.id);
    const totalApartments = apts.length;
    const freeApartments = apts.reduce((acc, apt) => {
      const tenant = tenants.find(t => t.wohnung_id === apt.id);
      const occupied = tenant && (!tenant.auszug || new Date(tenant.auszug) > new Date());
      return acc + (occupied ? 0 : 1);
    }, 0);

    let displaySize;
    if (typeof house.groesse === 'number') {
      displaySize = house.groesse.toString();
    } else {
      const calculatedSize = apts.reduce((sum, apt) => sum + Number(apt.groesse), 0);
      displaySize = calculatedSize.toString();
    }

    const totalRent = apts.reduce((sum, apt) => sum + Number(apt.miete), 0);
    const sumOfApartmentSizes = apts.reduce((sum, apt) => sum + Number(apt.groesse), 0);
    const avgRentPerSqm = sumOfApartmentSizes > 0
      ? totalRent / sumOfApartmentSizes
      : 0;

    return {
      ...house,
      totalApartments,
      freeApartments,
      size: displaySize,
      rent: formatNumber(totalRent),
      pricePerSqm: formatNumber(avgRentPerSqm),
    };
  });

  return <HaeuserClientView enrichedHaeuser={enrichedHaeuser} />;
}
