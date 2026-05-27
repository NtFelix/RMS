// "use client" directive removed - this is now a Server Component file.

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { handleSubmit as mieterServerAction } from "../../../app/mieter-actions";
import { posthogLogger } from "@/lib/posthog-logger";
import MieterClientView from "./client-wrapper"; // Import the default export

import type { Tenant } from "@/types/Tenant";
import type { Wohnung } from "@/types/Wohnung";

export default async function MieterPage() {
  const { supabase, user } = await requireAuthenticatedUser();

  let rawWohnungen: any[] | null = null;
  let rawMieter: any[] | null = null;

  const startTime = Date.now();

  // 1. Try single aggregated RPC request
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_sidebar_insights_data');
    if (rpcError) throw rpcError;

    if (rpcData) {
      const duration = Date.now() - startTime;
      posthogLogger.info('MieterPage: Loaded data via RPC', {
        'action.name': 'MieterPage_fetch',
        'action.status': 'success',
        'action.duration_ms': duration,
        'action.user_id': user.id,
        'action.method': 'RPC'
      });

      // Construct nested Haeuser structure in memory
      rawWohnungen = (rpcData.apartments || []).map((apt: any) => {
        const house = (rpcData.houses || []).find((h: any) => h.id === apt.haus_id);
        return {
          ...apt,
          Haeuser: house ? { name: house.name } : null
        };
      });

      rawMieter = rpcData.tenants;
    }
  } catch (rpcErr) {
    const rpcDuration = Date.now() - startTime;
    posthogLogger.warn('MieterPage: RPC fetching failed, trying parallel selects fallback', {
      'action.name': 'MieterPage_fetch',
      'action.status': 'rpc_failed',
      'action.duration_ms': rpcDuration,
      'action.user_id': user.id,
      'action.error_message': rpcErr instanceof Error ? rpcErr.message : String(rpcErr)
    });

    // 2. Fallback: Parallel fetches
    const fallbackStartTime = Date.now();
    try {
      const [
        { data: wohnungenRes, error: wohnungenError },
        { data: mieterRes, error: mieterError }
      ] = await Promise.all([
        supabase.from('Wohnungen').select('id,name,groesse,miete,haus_id,Haeuser(name)'),
        supabase.from('Mieter').select('id,wohnung_id,einzug,auszug,name,nebenkosten,email,telefonnummer,notiz,kaution,status,bewerbung_score,bewerbung_metadaten,bewerbung_mail_id')
      ]);

      if (wohnungenError || mieterError) {
        throw new Error(JSON.stringify({ wohnungenError, mieterError }));
      }

      rawWohnungen = wohnungenRes;
      rawMieter = mieterRes;

      const fallbackDuration = Date.now() - fallbackStartTime;
      posthogLogger.info('MieterPage: Loaded data via fallback queries', {
        'action.name': 'MieterPage_fetch_fallback',
        'action.status': 'success',
        'action.duration_ms': fallbackDuration,
        'action.user_id': user.id
      });
    } catch (fallbackErr) {
      posthogLogger.error('MieterPage: Fallback queries failed', {
        'action.name': 'MieterPage_fetch_fallback',
        'action.status': 'error',
        'action.user_id': user.id,
        'action.error_message': fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
      });
    }
  }

  const today = new Date();
  const wohnungen: Wohnung[] = rawWohnungen ? rawWohnungen.map((apt: any) => {
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
