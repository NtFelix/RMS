// "use client" directive removed - this is now a Server Component file.

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { fetchWithRpcFallback } from "@/lib/data-fetching";
import { handleSubmit as mieterServerAction } from "../../../app/mieter-actions";
import MieterClientView from "./client-wrapper"; // Import the default export

import type { Tenant } from "@/types/Tenant";
import type { Wohnung } from "@/types/Wohnung";

export default async function MieterPage() {
  const { supabase } = await requireAuthenticatedUser();

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
        const { data, error } = await supabase.from('Wohnungen').select('id,name,groesse,miete,haus_id,Haeuser(name)');
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
        const { data, error } = await supabase.from('Mieter').select('id,wohnung_id,einzug,auszug,name,nebenkosten,email,telefonnummer,notiz,kaution,status,bewerbung_score,bewerbung_metadaten,bewerbung_mail_id');
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
    if (apt.status && (apt.tenant !== undefined)) {
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
    />
  );
}
