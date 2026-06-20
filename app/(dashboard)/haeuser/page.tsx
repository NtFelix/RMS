// "use client" directive removed. This file is now a pure Server Component.

export const runtime = 'edge';
import { requireAuthenticatedUser } from "@/lib/server/route-access";
import HaeuserClientView from "./client-wrapper"; // Import the default export client view
import { formatNumber } from "@/utils/format";
import { House } from "@/components/tables/house-table"; // Type for enrichedHaeuser
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function HaeuserPage() {
  const { supabase, user } = await requireAuthenticatedUser();

  const [canView, canCreate, canEdit, canDelete, accessibleIdsResult] = await Promise.all([
    hasPermission('haeuser', 'ansehen'),
    hasPermission('haeuser', 'erstellen'),
    hasPermission('haeuser', 'bearbeiten'),
    hasPermission('haeuser', 'loeschen'),
    supabase.rpc('get_accessible_haeuser_ids'),
  ]);
  const accessibleIds = accessibleIdsResult.data;
  const hasObjectScopeAccess = accessibleIds === null || (Array.isArray(accessibleIds) && accessibleIds.length > 0);
  if (!canView && !hasObjectScopeAccess) {
    redirect('/unauthorized');
  }

  // Load data in parallel with object-scope filtering.
  // Direct queries are used instead of RPCs because the overview RPCs
  // (get_haeuser_overview etc.) do not apply get_accessible_haeuser_ids().
  // Using direct queries with scope filtering ensures restricted employees
  // only see data they have object-level access to.
  const fetchScopedHouses = async () => {
    try {
      let q = supabase.from('Haeuser').select('*');
      if (accessibleIds !== null) q = q.in('id', accessibleIds);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Error fetching Haeuser with scope:', e);
      return null;
    }
  };

  const fetchScopedApartments = async () => {
    try {
      let q = supabase.from('Wohnungen').select('*');
      if (accessibleIds !== null) q = q.in('haus_id', accessibleIds);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Error fetching Wohnungen with scope:', e);
      return null;
    }
  };

  const fetchScopedTenants = async () => {
    try {
      const { data, error } = await supabase.from('Mieter').select('wohnung_id,einzug,auszug');
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Error fetching Mieter:', e);
      return null;
    }
  };

  const [
    housesData,
    apartmentsData,
    tenantsData
  ] = await Promise.all([
    fetchScopedHouses(),
    fetchScopedApartments(),
    fetchScopedTenants(),
  ]);

  if (housesData === null) {
    return <div role="alert" className="p-8 text-center text-muted-foreground">Fehler beim Laden der Häuser. Bitte versuchen Sie es später erneut.</div>;
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

  return <HaeuserClientView enrichedHaeuser={enrichedHaeuser} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />;
}
