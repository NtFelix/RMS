"use server";
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import HaeuserClientWrapper from "./client-wrapper"
import { handleSubmit } from "./actions";

export default async function HaeuserPage() {
  const supabase = await createClient();
  // Load houses
  const { data: housesData, error: housesError } = await supabase.from('haeuser').select('*');
  if (housesError) {
    console.error('Fehler beim Laden der Häuser:', housesError);
    return <div>Fehler beim Laden der Häuser</div>;
  }
  const houses = housesData ?? [];
  // Load apartments
  const { data: apartmentsData, error: apartmentsError } = await supabase.from('wohnungen').select('*');
  if (apartmentsError) console.error('Fehler beim Laden der Wohnungen:', apartmentsError);
  const apartments = apartmentsData ?? [];
  // Load tenants
  const { data: tenantsData, error: tenantsError } = await supabase.from('mieter').select('wohnung_id,einzug,auszug');
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
    const totalSize = apts.reduce((sum, apt) => sum + Number(apt.groesse), 0);
    const totalRent = apts.reduce((sum, apt) => sum + Number(apt.miete), 0);
    const avgRentPerSqm = apts.length > 0
      ? apts.reduce((sum, apt) => sum + Number(apt.miete) / Number(apt.groesse), 0) / apts.length
      : 0;
    return {
      ...house,
      totalApartments,
      freeApartments,
      size: totalSize.toString(),
      rent: totalRent.toString(),
      pricePerSqm: avgRentPerSqm.toFixed(2),
    };
  });
  return <HaeuserClientWrapper haeuser={enrichedHaeuser} />;
}
