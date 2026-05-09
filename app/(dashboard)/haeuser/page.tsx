// "use client" directive removed. This file is now a pure Server Component.

export const runtime = 'edge';
import { requireAuthenticatedUser } from "@/lib/server/route-access";
import HaeuserClientView from "./client-wrapper"; // Import the default export client view
import { formatNumber } from "@/utils/format";
import { House } from "@/components/tables/house-table"; // Type for enrichedHaeuser

export default async function HaeuserPage() {
  const { supabase, user } = await requireAuthenticatedUser();

  // Load data in parallel
  const [
    { data: housesData, error: housesError },
    { data: apartmentsData, error: apartmentsError },
    { data: tenantsData, error: tenantsError }
  ] = await Promise.all([
    supabase.from('Haeuser').select('*').eq('user_id', user.id),
    supabase.from('Wohnungen').select('*').eq('user_id', user.id),
    supabase.from('Mieter').select('wohnung_id,einzug,auszug').eq('user_id', user.id)
  ]);

  if (housesError || apartmentsError || tenantsError) {
    console.error('Fehler beim Laden der Daten:', { housesError, apartmentsError, tenantsError });
    return <div>Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.</div>;
  }

  const houses = housesData ?? [];
  const apartments = apartmentsData ?? [];
  const tenants = tenantsData ?? [];

  // Create a map for faster tenant lookup by wohnung_id
  // We only care if there is ANY active tenant for the apartment
  const activeTenantsByWohnung = new Set<string>();
  const now = new Date();
  
  tenants.forEach(tenant => {
    if (tenant.wohnung_id && (!tenant.auszug || new Date(tenant.auszug) > now)) {
      activeTenantsByWohnung.add(tenant.wohnung_id);
    }
  });

  // Enrich houses with stats
  const enrichedHaeuser: House[] = houses.map(house => {
    const apts = apartments.filter(a => a.haus_id === house.id);
    const totalApartments = apts.length;
    const freeApartments = apts.reduce((acc, apt) => {
      const occupied = activeTenantsByWohnung.has(apt.id);
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
