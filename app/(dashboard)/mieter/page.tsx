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

  const startTime = Date.now();
  let rawWohnungen: any[] | null = null;
  let rawMieter: any[] | null = null;

  try {
    const [
      { data: wohnungenRes, error: wohnungenError },
      { data: mieterRes, error: mieterError }
    ] = await Promise.all([
      supabase.from('Wohnungen').select('id,name,groesse,miete,haus_id,Haeuser(name)').eq('user_id', user.id),
      supabase.from('Mieter').select('id,wohnung_id,einzug,auszug,name,nebenkosten,email,telefonnummer,notiz,kaution,status,bewerbung_score,bewerbung_metadaten,bewerbung_mail_id').eq('user_id', user.id)
    ]);

    if (wohnungenError || mieterError) {
      throw new Error(JSON.stringify({ wohnungenError, mieterError }));
    }

    rawWohnungen = wohnungenRes;
    rawMieter = mieterRes;

    const duration = Date.now() - startTime;
    posthogLogger.info('MieterPage: Loaded data', {
      'action.name': 'MieterPage_fetch',
      'action.status': 'success',
      'action.duration_ms': duration,
      'action.user_id': user.id
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    posthogLogger.error('MieterPage: Failed to load data', {
      'action.name': 'MieterPage_fetch',
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
