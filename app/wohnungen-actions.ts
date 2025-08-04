"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Define subscription plan limits
const SUBSCRIPTION_LIMITS = {
  free: 1,
  pro: 10,
  business: 50
} as const;

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
    
    // Get user's subscription
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .rpc('get_user_subscription', { user_id: user.id });
    
    // If subscription check fails, default to free tier
    const plan = subscriptionData?.plan_id || 'free';
    const limit = SUBSCRIPTION_LIMITS[plan as keyof typeof SUBSCRIPTION_LIMITS] || 1;
    
    // Only check limits when creating a new apartment
    if (!id) {
      // Get current apartment count for the user
      const { count, error: countError } = await supabase
        .from('Wohnungen')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (countError) throw countError;
      
      // Check if user has reached their limit
      if (count !== null && count >= limit) {
        return { 
          success: false, 
          error: { 
            message: `Ihr aktueller Tarif erlaubt nur ${limit} Wohnung${limit !== 1 ? 'en' : ''}.` 
          } 
        };
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
