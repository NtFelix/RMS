// "use client" directive removed. This file is now a pure Server Component.

export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server"; // For server-side data fetching
import HaeuserClientView from "./client-wrapper"; // Import the default export client view
import { formatNumber } from "@/utils/format";
import { House } from "@/components/tables/house-table"; // Type for enrichedHaeuser

export default async function HaeuserPage() {
  const supabase = await createClient();

  // Load houses
  const { data: housesData, error: housesError } = await supabase.from('Haeuser').select('*');
  if (housesError) {
    console.error('Fehler beim Laden der Häuser:', housesError);
    return <div>Fehler beim Laden der Häuser</div>; // Or a more user-friendly error component
  }
  const houses = housesData ?? [];

  // Load apartments for stats
  const { data: apartmentsData, error: apartmentsError } = await supabase.from('Wohnungen').select('*');
  if (apartmentsError) console.error('Fehler beim Laden der Wohnungen:', apartmentsError);
  const apartments = apartmentsData ?? [];

  // Load tenants for stats
  const { data: tenantsData, error: tenantsError } = await supabase.from('Mieter').select('wohnung_id,einzug,auszug');
  if (tenantsError) console.error('Fehler beim Laden der Mieter:', tenantsError);
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
