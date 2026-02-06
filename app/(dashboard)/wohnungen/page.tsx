// "use client" directive removed from the top of this file.
// This file now exports a Server Component by default.

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Removed Card, CardContent etc. as they are used in ClientView
import { createClient as createSupabaseClient } from '@/utils/supabase/server';
import { fetchUserProfile } from '@/lib/data-fetching';

import { getPlanDetails } from '@/lib/stripe-server';
import WohnungenClientView from './client'; // Import the default export from client.tsx
import type { Wohnung } from "@/types/Wohnung";

// Server Component: Fetches data and passes it to the Client Component
export default async function WohnungenPage() {
  const supabase = await createSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  let apartmentCount = 0;
  let userIsEligibleToAdd = false;
  let effectiveApartmentLimit: number | typeof Infinity = 0;
  let limitReason: 'trial' | 'subscription' | 'none' = 'none';

  if (user) {
    const userProfile = await fetchUserProfile();
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
              if (planDetails.limitWohnungen === null) effectiveApartmentLimit = Infinity;
              else if (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen > effectiveApartmentLimit) {
                effectiveApartmentLimit = planDetails.limitWohnungen;
              }
              if (effectiveApartmentLimit !== 5 || planDetails.limitWohnungen === null) limitReason = 'subscription';
            }
          } catch (error) { console.error('WohnungenPage: Error fetching plan details for active sub during trial:', error); }
        }
      } else if (isPaidActiveSub && userProfile.stripe_price_id) {
        userIsEligibleToAdd = true;
        limitReason = 'subscription';
        try {
          const planDetails = await getPlanDetails(userProfile.stripe_price_id);
          if (planDetails) {
            if (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen > 0) effectiveApartmentLimit = planDetails.limitWohnungen;
            else if (planDetails.limitWohnungen === null) effectiveApartmentLimit = Infinity;
            else { userIsEligibleToAdd = false; effectiveApartmentLimit = 0; limitReason = 'none'; }
          } else { userIsEligibleToAdd = false; effectiveApartmentLimit = 0; limitReason = 'none'; }
        } catch (error) { console.error('WohnungenPage: Error fetching plan details:', error); userIsEligibleToAdd = false; effectiveApartmentLimit = 0; limitReason = 'none'; }
      } else { userIsEligibleToAdd = false; effectiveApartmentLimit = 0; limitReason = 'none'; }
    } else { userIsEligibleToAdd = false; effectiveApartmentLimit = 0; limitReason = 'none'; }

    // Bypass limits for E2E tests in CI environment
    if (process.env.CI === 'true' || process.env.NODE_ENV === 'test') {
       userIsEligibleToAdd = true;
       effectiveApartmentLimit = 100;
       limitReason = 'subscription';
    }

    const { count, error: countError } = await supabase.from('Wohnungen').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    if (countError) console.error('Error fetching apartment count:', countError.message);
    else apartmentCount = count || 0;
  }

  const { data: rawApartments, error: apartmentsError } = await supabase.from('Wohnungen').select('id,name,groesse,miete,haus_id,Haeuser(name)');
  if (apartmentsError) console.error('Fehler beim Laden der Wohnungen:', apartmentsError);

  const { data: tenants, error: tenantsError } = await supabase.from('Mieter').select('id,wohnung_id,einzug,auszug,name');
  if (tenantsError) console.error('Fehler beim Laden der Mieter:', tenantsError);

  const today = new Date();

  type Tenant = NonNullable<typeof tenants>[number];
  const tenantMap = (tenants ?? []).reduce((map, t) => {
    if (t.wohnung_id && !map.has(t.wohnung_id)) {
      map.set(t.wohnung_id, t);
    }
    return map;
  }, new Map<string, Tenant>());

  const initialWohnungen: Wohnung[] = rawApartments ? rawApartments.map((apt) => {
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

  const { data: housesData, error: housesError } = await supabase.from('Haeuser').select('id,name');
  if (housesError) console.error('Fehler beim Laden der Häuser:', housesError);
  const houses = housesData || [];

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
