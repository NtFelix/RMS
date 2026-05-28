// "use client" directive removed. This file is now a pure Server Component.

export const runtime = 'edge';
import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { posthogLogger } from "@/lib/posthog-logger";
import HaeuserClientView from "./client-wrapper"; // Import the default export client view
import { formatNumber } from "@/utils/format";
import { House } from "@/components/tables/house-table"; // Type for enrichedHaeuser

export default async function HaeuserPage() {
  const { supabase, user } = await requireAuthenticatedUser();

  const startTime = Date.now();
  let housesData: any[] | null = null;
  let apartmentsData: any[] | null = null;
  let tenantsData: any[] | null = null;

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

    const duration = Date.now() - startTime;
    posthogLogger.info('HaeuserPage: Loaded data', {
      'action.name': 'HaeuserPage_fetch',
      'action.status': 'success',
      'action.duration_ms': duration,
      'action.user_id': user.id
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    posthogLogger.error('HaeuserPage: Failed to load data', {
      'action.name': 'HaeuserPage_fetch',
      'action.status': 'error',
      'action.duration_ms': duration,
      'action.user_id': user.id,
      'action.error_message': err instanceof Error ? err.message : String(err)
    });
    return (
      <div className="p-8 text-center text-red-500 font-medium bg-red-50 dark:bg-red-950/20 border border-red-200/50 rounded-2xl">
        Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.
      </div>
    );
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
