export const runtime = 'edge';

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import HaeuserClientWrapper from "./client-wrapper"
import { handleSubmit } from "./actions";

export default async function HaeuserPage() {
  const supabase = await createClient();
  // Load houses
  const { data: housesData, error: housesError } = await supabase.from('Haeuser').select('*');
  if (housesError) {
    console.error('Fehler beim Laden der Häuser:', housesError);
    return <div>Fehler beim Laden der Häuser</div>;
  }
  const houses = housesData ?? [];
  // Load apartments
  const { data: apartmentsData, error: apartmentsError } = await supabase.from('Wohnungen').select('*');
  if (apartmentsError) console.error('Fehler beim Laden der Wohnungen:', apartmentsError);
  const apartments = apartmentsData ?? [];
  // Load tenants
  const { data: tenantsData, error: tenantsError } = await supabase.from('Mieter').select('wohnung_id,einzug,auszug');
  if (tenantsError) console.error('Fehler beim Laden der Mieter:', tenantsError);
  const tenants = tenantsData ?? [];
  // Enrich houses with stats
  const enrichedHaeuser = houses.map(house => {
    const apts = apartments.filter(a => a.haus_id === house.id);
    const totalApartments = apts.length;
    const freeApartments = apts.reduce((acc, apt) => {
      const tenant = tenants.find(t => t.wohnung_id === apt.id);
      const occupied = tenant && (!tenant.auszug || new Date(tenant.auszug) > new Date());
      return acc + (occupied ? 0 : 1);
    }, 0);

    let displaySize;
    // Assuming 'house.groesse' is the field from the database which can be number or null
    // The 'Haus' type in lib/data-fetching.ts defines groesse as `groesse?: number | null;`
    // The fetchHaeuser in lib/data-fetching.ts selects '*, groesse', so it should be available.
    if (typeof house.groesse === 'number') {
      displaySize = house.groesse.toString();
    } else {
      const calculatedSize = apts.reduce((sum, apt) => sum + Number(apt.groesse), 0);
      displaySize = calculatedSize.toString();
    }

    const totalRent = apts.reduce((sum, apt) => sum + Number(apt.miete), 0);
    // avgRentPerSqm should use the sum of actual apartment sizes for financial accuracy.
    const sumOfApartmentSizes = apts.reduce((sum, apt) => sum + Number(apt.groesse), 0);
    const avgRentPerSqm = sumOfApartmentSizes > 0
      ? totalRent / sumOfApartmentSizes
      : 0;

    return {
      ...house, // This includes original house.id, name, ort, and potentially house.groesse
      totalApartments,
      freeApartments,
      size: displaySize, // Corrected size for display
      rent: totalRent.toString(),
      pricePerSqm: avgRentPerSqm.toFixed(2),
    };
  });
  return <HaeuserClientWrapper haeuser={enrichedHaeuser} />;
}
