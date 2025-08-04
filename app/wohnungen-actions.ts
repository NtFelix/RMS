"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { fetchUserProfile } from '@/lib/data-fetching';
import { getPlanDetails } from '@/lib/stripe-server';

interface WohnungPayload {
  name: string;
  groesse: string | number; // Can come as string from FormData
  miete: string | number;   // Can come as string from FormData
  haus_id?: string | null;
}

interface WohnungDbRecord {
  id: string;
  name: string;
  groesse: number;
  miete: number;
  haus_id?: string | null;
  created_at: string;
}

export async function wohnungServerAction(id: string | null, data: WohnungPayload): Promise<{ success: boolean; error?: any; data?: WohnungDbRecord }> {
  const supabase = await createClient();

  const payload = {
    name: data.name,
    groesse: Number(data.groesse), // Ensure conversion to number
    miete: Number(data.miete),     // Ensure conversion to number
    haus_id: data.haus_id || null,
  };

  // Basic validation
  if (!payload.name || payload.name.trim() === "") {
    return { success: false, error: { message: "Name ist erforderlich." } };
  }
  if (isNaN(payload.groesse) || payload.groesse <= 0) {
    return { success: false, error: { message: "Größe muss eine positive Zahl sein." } };
  }
  if (isNaN(payload.miete) || payload.miete < 0) { // Miete can be 0
    return { success: false, error: { message: "Miete muss eine Zahl sein." } };
  }
  // haus_id is optional for a Wohnung, so we don't strictly require it here.
  // However, the form/modal might enforce it.
  // if (!payload.haus_id) { 
  //   return { success: false, error: { message: "Haus-ID ist erforderlich." } };
  // }

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) {
      return { 
        success: false, 
        error: { message: "Benutzer nicht gefunden. Bitte melden Sie sich erneut an." } 
      };
    }
    
    // Only check limits when creating a new apartment
    if (!id) {
      // Get user profile for subscription details
      const userProfile = await fetchUserProfile();
      if (!userProfile) {
        return { 
          success: false, 
          error: { message: "Benutzerprofil nicht gefunden." } 
        };
      }

      const isStripeTrial = userProfile.stripe_subscription_status === 'trialing';
      const isPaidActiveSub = userProfile.stripe_subscription_status === 'active' && !!userProfile.stripe_price_id;

      let userIsEligibleToAdd = false;
      let effectiveApartmentLimit: number | typeof Infinity = 0;

      if (isStripeTrial) {
        userIsEligibleToAdd = true;
        effectiveApartmentLimit = 5;
        if (isPaidActiveSub && userProfile.stripe_price_id) {
          try {
            const planDetails = await getPlanDetails(userProfile.stripe_price_id);
            if (planDetails) {
              if (planDetails.limitWohnungen === null) effectiveApartmentLimit = Infinity;
              else if (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen > effectiveApartmentLimit) {
                effectiveApartmentLimit = planDetails.limitWohnungen;
              }
            }
          } catch (error) { 
            console.error('Error fetching plan details for active sub during trial:', error); 
          }
        }
      } else if (isPaidActiveSub && userProfile.stripe_price_id) {
        userIsEligibleToAdd = true;
        try {
          const planDetails = await getPlanDetails(userProfile.stripe_price_id);
          if (planDetails) {
            if (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen > 0) effectiveApartmentLimit = planDetails.limitWohnungen;
            else if (planDetails.limitWohnungen === null) effectiveApartmentLimit = Infinity;
            else { userIsEligibleToAdd = false; effectiveApartmentLimit = 0; }
          } else { userIsEligibleToAdd = false; effectiveApartmentLimit = 0; }
        } catch (error) { 
          console.error('Error fetching plan details:', error); 
          userIsEligibleToAdd = false; 
          effectiveApartmentLimit = 0; 
        }
      } else { 
        userIsEligibleToAdd = false; 
        effectiveApartmentLimit = 0; 
      }

      if (!userIsEligibleToAdd) {
        return { 
          success: false, 
          error: { message: "Ein aktives Abonnement oder eine gültige Testphase ist erforderlich, um Wohnungen hinzuzufügen." } 
        };
      }

      // Get current apartment count for the user
      const { count, error: countError } = await supabase
        .from('Wohnungen')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (countError) throw countError;
      
      // Check if user has reached their limit
      if (effectiveApartmentLimit !== Infinity && count !== null && count >= effectiveApartmentLimit) {
        if (isStripeTrial && effectiveApartmentLimit === 5) {
          return { 
            success: false, 
            error: { message: `Maximale Anzahl an Wohnungen (${effectiveApartmentLimit}) für Ihre Testphase erreicht.` } 
          };
        } else {
          return { 
            success: false, 
            error: { message: `Sie haben die maximale Anzahl an Wohnungen (${effectiveApartmentLimit}) für Ihr aktuelles Abonnement erreicht.` } 
          };
        }
      }
    }
    
    // Add user_id to the payload for new records
    const fullPayload = { ...payload, user_id: user.id };
    
    let dbResponse;
    if (id) {
      // Update existing record
      dbResponse = await supabase
        .from("Wohnungen")
        .update(fullPayload)
        .eq("id", id)
        .select()
        .single();
    } else {
      // Create new record
      dbResponse = await supabase
        .from("Wohnungen")
        .insert(fullPayload)
        .select()
        .single();
    }
    
    if (dbResponse.error) throw dbResponse.error;

    revalidatePath('/wohnungen');
    revalidatePath('/'); 
    if (payload.haus_id) {
        revalidatePath(`/haeuser/${payload.haus_id}`);
    }

    return { success: true, data: dbResponse.data as WohnungDbRecord };
  } catch (error: any) {
    console.error("Error in wohnungServerAction:", error); // Existing log, kept it
    return { success: false, error: { message: error.message || "Ein unbekannter Fehler ist aufgetreten." } };
  }
}
