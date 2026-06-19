// "use client" directive removed - this is now a Server Component file.

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { fetchWithRpcFallback } from "@/lib/data-fetching";
import { handleSubmit as mieterServerAction } from "../../../app/mieter-actions";
import MieterClientView from "./client-wrapper"; // Import the default export
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

import type { Tenant } from "@/types/Tenant";
import type { Wohnung } from "@/types/Wohnung";

export default async function MieterPage() {
  const { supabase } = await requireAuthenticatedUser();

  // Object-scope exception: if user can access specific houses, they can see their tenants.
  const [canView, canCreate, accessibleIdsResult] = await Promise.all([
    hasPermission('mieter', 'ansehen'),
    hasPermission('mieter', 'erstellen'),
    supabase.rpc('get_accessible_haeuser_ids'),
  ]);
  const accessibleIds = accessibleIdsResult.data;
  const hasObjectScopeAccess = accessibleIds === null || (Array.isArray(accessibleIds) && accessibleIds.length > 0);
  if (!canView && !hasObjectScopeAccess) {
    redirect('/unauthorized');
  }

  // Load data in parallel to eliminate waterfalls
  const [
    rawWohnungen,
    rawMieter
  ] = await Promise.all([
    fetchWithRpcFallback(
      supabase,
      'get_mieter_wohnungen_overview',
      {},
      async () => {
        let q = supabase.from('Wohnungen').select('id,name,groesse,miete,haus_id,Haeuser(name)');
        if (accessibleIds !== null && accessibleIds.length > 0) {
          q = q.in('haus_id', accessibleIds);
        }
        const { data, error } = await q;
        if (error) {
          console.error('Fehler beim Laden der Wohnungen:', error);
          throw error;
        }
        return data;
      },
      'mieter_wohnungen_overview'
    ),
    fetchWithRpcFallback(
      supabase,
      'get_mieter_details_overview',
      {},
      async () => {
        let q = supabase.from('Mieter').select('id,wohnung_id,einzug,auszug,name,nebenkosten,email,telefonnummer,notiz,kaution,status,bewerbung_score,bewerbung_metadaten,bewerbung_mail_id');
        if (accessibleIds !== null && accessibleIds.length > 0) {
          const { data: whgIds } = await supabase.from('Wohnungen').select('id').in('haus_id', accessibleIds);
          const ids = whgIds?.map(w => w.id) ?? [];
          q = ids.length > 0 ? q.in('wohnung_id', ids) : q;
        }
        const { data, error } = await q;
        if (error) {
          console.error('Fehler beim Laden der Mieter:', error);
          throw error;
        }
        return data;
      },
      'mieter_details_overview'
    )
  ]);

  const today = new Date();
  const wohnungen: Wohnung[] = rawWohnungen ? rawWohnungen.map((apt: any) => {
    // If the data comes from our enriched RPC, it already has status and tenant
    if (apt.status && apt.tenant != null) {
      return {
        ...apt,
        Haeuser: Array.isArray(apt.Haeuser) ? apt.Haeuser[0] : apt.Haeuser,
      } as Wohnung;
    }

    // Fallback mapping logic
    const tenant = rawMieter?.find((t: any) => t.wohnung_id === apt.id);
    let status: 'frei' | 'vermietet' = 'frei';
    if (tenant && (!tenant.auszug || new Date(tenant.auszug) > today)) {
      status = 'vermietet';
    }
    return {
      ...apt,
      Haeuser: Array.isArray(apt.Haeuser) ? apt.Haeuser[0] : apt.Haeuser,
      status,
      tenant: tenant ? { id: tenant.id, name: tenant.name, einzug: tenant.einzug as string, auszug: tenant.auszug as string } : undefined,
    } as Wohnung;
  }) : [];

  const mieter: Tenant[] = rawMieter ? rawMieter.map(m => ({ ...m })) : [];



  return (
    <MieterClientView
      initialTenants={mieter}
      initialWohnungen={wohnungen}
      serverAction={mieterServerAction}
      canCreate={canCreate}
    />
  );
}
