// "use client" directive removed from the top of this file.
// This file now exports a Server Component by default.

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { fetchUserProfile } from '@/lib/data-fetching';

import { posthogLogger } from "@/lib/posthog-logger";
import { getPlanDetails } from '@/lib/stripe-server';
import { isTestEnv } from '@/lib/test-utils';
import WohnungenClientView from './client'; // Import the default export from client.tsx
import type { Wohnung } from "@/types/Wohnung";

// Server Component: Fetches data and passes it to the Client Component
export default async function WohnungenPage() {
  const { supabase, user } = await requireAuthenticatedUser();

  let apartmentCount = 0;
  let userIsEligibleToAdd = false;
  let effectiveApartmentLimit: number | typeof Infinity = 0;
  let limitReason: 'trial' | 'subscription' | 'none' = 'none';

  let userProfile: any = null;
  let countResult: any = { count: 0, error: null };
  let rawApartmentsResult: any = { data: null, error: null };
  let tenantsResult: any = { data: null, error: null };
  let housesResult: any = { data: null, error: null };

  const startTime = Date.now();

  try {
    const [
      profileRes,
      rawCount,
      rawApts,
      rawTenants,
      rawHouses
    ] = await Promise.all([
      fetchUserProfile(),
      supabase.from('Wohnungen').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('Wohnungen').select('id,name,groesse,miete,haus_id,Haeuser(name)').eq('user_id', user.id),
      supabase.from('Mieter').select('id,wohnung_id,einzug,auszug,name').eq('user_id', user.id),
      supabase.from('Haeuser').select('id,name').eq('user_id', user.id)
    ]);

    userProfile = profileRes;
    countResult = rawCount;
    rawApartmentsResult = rawApts;
    tenantsResult = rawTenants;
    housesResult = rawHouses;

    if (rawCount.error || rawApts.error || rawTenants.error || rawHouses.error) {
      throw new Error(JSON.stringify({
        countError: rawCount.error,
        aptsError: rawApts.error,
        tenantsError: rawTenants.error,
        housesError: rawHouses.error
      }));
    }

    const duration = Date.now() - startTime;
    posthogLogger.info('WohnungenPage: Loaded data', {
      'action.name': 'WohnungenPage_fetch',
      'action.status': 'success',
      'action.duration_ms': duration,
      'action.user_id': user.id
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    posthogLogger.error('WohnungenPage: Failed to load data', {
      'action.name': 'WohnungenPage_fetch',
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

  if (userProfile) {
    const isStripeTrial = userProfile.stripe_subscription_status === 'trialing';
    const isEffectivelyInTrial = isStripeTrial;
    const isPaidActiveSub = userProfile.stripe_subscription_status === 'active' && !!userProfile.stripe_price_id;

    if (isEffectivelyInTrial) {
      userIsEligibleToAdd = true;
      effectiveApartmentLimit = 5;
      limitReason = 'trial';
      if (isPaidActiveSub && userProfile.stripe_price_id) {
        try {
          const planDetails = await getPlanDetails(userProfile.stripe_price_id);
          if (planDetails) {
            if (planDetails.limit_wohnungen === null) effectiveApartmentLimit = Infinity;
            else if (typeof planDetails.limit_wohnungen === 'number' && planDetails.limit_wohnungen > effectiveApartmentLimit) {
              effectiveApartmentLimit = planDetails.limit_wohnungen;
            }
            if (effectiveApartmentLimit !== 5 || planDetails.limit_wohnungen === null) limitReason = 'subscription';
          }
        } catch (error) { console.error('WohnungenPage: Error fetching plan details for active sub during trial:', error); }
      }
    } else if (isPaidActiveSub && userProfile.stripe_price_id) {
      userIsEligibleToAdd = true;
      limitReason = 'subscription';
      try {
        const planDetails = await getPlanDetails(userProfile.stripe_price_id);
        if (planDetails) {
          if (typeof planDetails.limit_wohnungen === 'number' && planDetails.limit_wohnungen > 0) effectiveApartmentLimit = planDetails.limit_wohnungen;
          else if (planDetails.limit_wohnungen === null) effectiveApartmentLimit = Infinity;
          else { userIsEligibleToAdd = false; effectiveApartmentLimit = 0; limitReason = 'none'; }
        } else { userIsEligibleToAdd = false; effectiveApartmentLimit = 0; limitReason = 'none'; }
      } catch (error) { console.error('WohnungenPage: Error fetching plan details:', error); userIsEligibleToAdd = false; effectiveApartmentLimit = 0; limitReason = 'none'; }
    } else { userIsEligibleToAdd = false; effectiveApartmentLimit = 0; limitReason = 'none'; }
  } else { userIsEligibleToAdd = false; effectiveApartmentLimit = 0; limitReason = 'none'; }

  // Handle count result
  if (countResult.error) console.error('Error fetching apartment count:', countResult.error.message);
  else apartmentCount = countResult.count || 0;

  // Handle data results
  const { data: rawApartments, error: apartmentsError } = rawApartmentsResult;
  if (apartmentsError) console.error('Fehler beim Laden der Wohnungen:', apartmentsError);

  const { data: tenants, error: tenantsError } = tenantsResult;
  if (tenantsError) console.error('Fehler beim Laden der Mieter:', tenantsError);

  const { data: housesData, error: housesError } = housesResult;
  if (housesError) console.error('Fehler beim Laden der Häuser:', housesError);
  const houses = housesData || [];

  const today = new Date();

  const tenantMap = (tenants ?? []).reduce((map: Map<string, any>, t: any) => {
    if (t.wohnung_id && !map.has(t.wohnung_id)) {
      map.set(t.wohnung_id, t);
    }
    return map;
  }, new Map<string, any>());

  const initialWohnungen: Wohnung[] = rawApartments ? rawApartments.map((apt: any) => {
    const tenant = tenantMap.get(apt.id);
    let status: 'frei' | 'vermietet' = 'frei';
    if (tenant && (!tenant.auszug || new Date(tenant.auszug) > today)) {
      status = 'vermietet';
    }
    return {
      ...apt,
      Haeuser: Array.isArray(apt.Haeuser) ? apt.Haeuser[0] : apt.Haeuser,
      status,
      tenant: tenant ? { id: tenant.id, name: tenant.name, einzug: tenant.einzug as string, auszug: tenant.auszug as string } : undefined,
    } as Wohnung; // Ensure the mapped object conforms to Wohnung type
  }) : [];

  return (
    <WohnungenClientView
      initialWohnungenData={initialWohnungen}
      housesData={houses}
      serverApartmentCount={apartmentCount}
      serverApartmentLimit={effectiveApartmentLimit}
      serverUserIsEligibleToAdd={userIsEligibleToAdd}
      serverLimitReason={limitReason}
    />
  );
}
