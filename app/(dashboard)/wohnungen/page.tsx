export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from '@/utils/supabase/server'; // For getting user and counting
import { fetchUserProfile } from '@/lib/data-fetching'; // For subscription status
import { getPlanDetails } from '@/lib/stripe-server'; // Import for fetching plan details
import { WohnungenClient } from './client';
// Assuming fetchWohnungen and fetchHaeuser might be used or adapted later,
// but current implementation fetches directly.
// import { fetchWohnungen, fetchHaeuser } from '@/lib/data-fetching';

// Define Wohnung type
export interface Wohnung {
  id: string
  name: string
  groesse: number | string
  miete: number | string
  haus_id?: string
  status?: 'frei' | 'vermietet'
  tenant?: {
    id: string
    name: string
    einzug: string
    auszug: string
  }
  Haeuser: {
    name: string
  }
}

export default async function WohnungenPage() {
  const supabase = await createClient(); // Server-side client

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  let apartmentCount = 0;
  let userIsEligibleToAdd = false; // Renamed from isActiveSubscription for clarity
  let effectiveApartmentLimit: number | typeof Infinity = 0;
  let limitReason: 'trial' | 'subscription' | 'none' = 'none';

  if (user) {
    const userProfile = await fetchUserProfile();

    if (userProfile) {
      const isCustomTrial = isUserInActiveTrial(userProfile.trial_starts_at, userProfile.trial_ends_at);
      const isStripeTrial = userProfile.stripe_subscription_status === 'trialing';
      const isEffectivelyInTrial = isCustomTrial || isStripeTrial;
      const isPaidActiveSub = userProfile.stripe_subscription_status === 'active' && !!userProfile.stripe_price_id;

      if (isEffectivelyInTrial) {
        userIsEligibleToAdd = true;
        effectiveApartmentLimit = 5;
        limitReason = 'trial';

        if (isPaidActiveSub && userProfile.stripe_price_id) {
          try {
            const planDetails = await getPlanDetails(userProfile.stripe_price_id);
            if (planDetails) {
              if (planDetails.limitWohnungen === null) {
                effectiveApartmentLimit = Infinity;
                limitReason = 'subscription'; // Overridden by unlimited plan
              } else if (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen > effectiveApartmentLimit) {
                effectiveApartmentLimit = planDetails.limitWohnungen;
                limitReason = 'subscription'; // Overridden by higher plan limit
              }
            } else {
              console.warn(`WohnungenPage: Plan details not found for active sub (${userProfile.stripe_price_id}) during trial. Using trial limit.`);
            }
          } catch (error) {
            console.error('WohnungenPage: Error fetching plan details for active sub during trial:', error);
            // Stick with trial limit
          }
        }
      } else if (isPaidActiveSub && userProfile.stripe_price_id) {
        userIsEligibleToAdd = true;
        limitReason = 'subscription';
        try {
          const planDetails = await getPlanDetails(userProfile.stripe_price_id);
          if (planDetails) {
            if (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen > 0) {
              effectiveApartmentLimit = planDetails.limitWohnungen;
            } else if (planDetails.limitWohnungen === null) {
              effectiveApartmentLimit = Infinity;
            } else {
              console.warn('WohnungenPage: Invalid limitWohnungen in plan:', planDetails.limitWohnungen);
              userIsEligibleToAdd = false; // Cannot determine limit, disable adding
              effectiveApartmentLimit = 0;
              limitReason = 'none';
            }
          } else {
            console.warn('WohnungenPage: Plan details not found for price ID:', userProfile.stripe_price_id);
            userIsEligibleToAdd = false; // Plan details missing, disable adding
            effectiveApartmentLimit = 0;
            limitReason = 'none';
          }
        } catch (error) {
          console.error('WohnungenPage: Error fetching plan details:', error);
          userIsEligibleToAdd = false; // Error fetching, disable adding
          effectiveApartmentLimit = 0;
          limitReason = 'none';
        }
      } else {
        // Not in trial and no active paid subscription
        userIsEligibleToAdd = false;
        effectiveApartmentLimit = 0;
        limitReason = 'none';
      }
    } else {
      // No user profile found
      userIsEligibleToAdd = false;
      effectiveApartmentLimit = 0;
      limitReason = 'none';
    }

    // Fetch apartment count for the user (existing logic)
    const { count, error: countError } = await supabase
      .from('Wohnungen')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (countError) {
      console.error('Error fetching apartment count:', countError.message);
      // Decide on error handling, maybe default to 0 or show an error state
    } else {
      apartmentCount = count || 0;
    }

    // Handle case where there is no user (e.g., redirect or show login message)
    // isActiveSubscription and effectiveApartmentLimit will remain at their initial defaults (false, 0)
    // For now, props will reflect a non-subscribed, zero-apartment state if no user.
  }

  // Fetch existing data (ensure these are correctly scoped or RLS handles it)
  // The existing logic for fetching apartments and houses is preserved below.
  // These might need to be made user-specific if not already handled by RLS.

  // Wohnungen mit Haeuser-Daten laden
  const { data: apartments, error: apartmentsError } = await supabase
    .from('Wohnungen')
    .select('id,name,groesse,miete,haus_id,Haeuser(name)')
    // If RLS is not fully user-specific for Wohnungen, you might need:
    // .eq('user_id', user ? user.id : 'some-non-existent-id')
  if (apartmentsError) {
    console.error('Fehler beim Laden der Wohnungen:', apartmentsError)
    // Consider returning an error display or handling it gracefully
  }

  // Mieter für Status laden
  const { data: tenants, error: tenantsError } = await supabase
    .from('Mieter')
    .select('id,wohnung_id,einzug,auszug,name')
    // Mieter might also need user_id scoping if not handled by RLS or if Wohnungen are not filtered by user
  if (tenantsError) {
    console.error('Fehler beim Laden der Mieter:', tenantsError)
  }

  const today = new Date()
  const initialWohnungen = apartments ? apartments.map((apt) => {
    const tenant = tenants?.find((t) => t.wohnung_id === apt.id)
    let status: 'frei' | 'vermietet' = 'frei'
    if (tenant && (!tenant.auszug || new Date(tenant.auszug) > today)) {
      status = 'vermietet'
    }
    return {
      ...apt,
      Haeuser: Array.isArray(apt.Haeuser) ? apt.Haeuser[0] : apt.Haeuser, // Ensure Haeuser is an object
      status,
      tenant: tenant
        ? { id: tenant.id, name: tenant.name, einzug: tenant.einzug as string, auszug: tenant.auszug as string }
        : null,
    }
  }) : []

  // Häuser für Dropdown laden
  const { data: housesData, error: housesError } = await supabase
    .from('Haeuser')
    .select('id,name')
    // If RLS is not user-specific for Haeuser, you might need:
    // .eq('user_id', user ? user.id : 'some-non-existent-id')
  if (housesError) {
    console.error('Fehler beim Laden der Häuser:', housesError)
  }
  const houses = housesData || []

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wohnungen</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Wohnungen und Apartments</p>
        </div>
      </div>

      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <CardTitle>Wohnungsverwaltung</CardTitle>
          <CardDescription>Hier können Sie Ihre Wohnungen verwalten und filtern</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <WohnungenClient
            initialWohnungen={initialWohnungen}
            houses={houses}
            apartmentCount={apartmentCount}
            apartmentLimit={effectiveApartmentLimit}
            userIsEligibleToAdd={userIsEligibleToAdd} // Pass the corrected prop
            limitReason={limitReason} // Pass the new prop
          />
        </CardContent>
      </Card>
    </div>
  )
}
