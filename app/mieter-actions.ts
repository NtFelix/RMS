"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { Mieter } from "../lib/data-fetching";
import { KautionData, KautionStatus, TenantStatus } from "@/types/Tenant";
import { logAction } from '@/lib/logging-middleware';
import { getPostHogServer } from '@/app/posthog-server.mjs';
import { logger } from '@/utils/logger';
import { posthogLogger } from '@/lib/posthog-logger';

export async function handleSubmit(formData: FormData): Promise<{ success: boolean; error?: { message: string } }> {
  const id = formData.get('id');
  const actionName = id ? 'updateTenant' : 'createTenant';
  const tenantName = formData.get('name') as string;
  logAction(actionName, 'start', { tenant_id: id as string | null, tenant_name: tenantName });

  const supabase = await createClient();

  try {
    const payload: any = {
      wohnung_id: formData.get('wohnung_id') || null,
      name: formData.get('name'),
      einzug: formData.get('einzug') || null,
      auszug: formData.get('auszug') || null,
      email: formData.get('email') || null,
      telefonnummer: formData.get('telefonnummer') || null,
      notiz: formData.get('notiz') || null,
      status: (formData.get('status') as TenantStatus) || 'mieter',
      nebenkosten: (() => {
        const nebenkostenRaw = formData.get('nebenkosten');
        if (nebenkostenRaw && typeof nebenkostenRaw === 'string' && nebenkostenRaw.length > 0) {
          try {
            return JSON.parse(nebenkostenRaw);
          } catch (error) {
            console.error("Failed to parse nebenkosten JSON:", error);
            throw new Error("Ungültiges JSON-Format für Nebenkosten. Bitte überprüfen Sie die Eingabe.");
          }
        }
        return null;
      })(),
    };
    const id = formData.get('id');

    let finalTenantId = id as string | null;

    if (id) {
      const { error } = await supabase.from('Mieter').update(payload).eq('id', id as string);
      if (error) {
        return { success: false, error: { message: error.message } };
      }
    } else {
      const { data: newTenant, error } = await supabase.from('Mieter').insert(payload).select('id').single();
      if (error) {
        return { success: false, error: { message: error.message } };
      }
      if (newTenant) {
        finalTenantId = newTenant.id;
      }
    }
    revalidatePath('/mieter');
    logAction(actionName, 'success', { tenant_name: tenantName, operation: id ? 'update' : 'create' });

    try {
      const posthog = getPostHogServer();
      const eventName = id ? 'tenant_updated' : 'tenant_added';
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        posthog.capture({
          distinctId: user.id,
          event: eventName,
          properties: {
            tenant_id: finalTenantId || 'unknown',
            tenant_name: tenantName,
            has_property: !!payload.wohnung_id,
            property_id: payload.wohnung_id,
            has_email: !!payload.email,
            status: payload.status,
            source: 'server_action'
          }
        });
        await posthog.flush();
        await posthogLogger.flush();
        logger.info(`[PostHog] Capturing tenant event: ${eventName} for user: ${user.id}`);
      }
    } catch (phError) {
      logger.error('Failed to capture PostHog event:', phError instanceof Error ? phError : new Error(String(phError)));
    }

    return { success: true };
  } catch (e) {
    logAction(actionName, 'error', { tenant_name: tenantName, error_message: (e as Error).message });
    return { success: false, error: { message: (e as Error).message } };
  }
}

export async function deleteTenantAction(tenantId: string): Promise<{ success: boolean; error?: { message: string } }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("Mieter")
      .delete()
      .eq("id", tenantId);

    if (error) {
      console.error("Error deleting tenant from Supabase:", error);
      return { success: false, error: { message: error.message } };
    }

    revalidatePath('/mieter');
    // Revalidate related apartment details if a tenant was unlinked from an apartment.
    // This is a general revalidation; specific apartment revalidation might be too complex here
    // without knowing which apartment was affected.
    revalidatePath('/wohnungen');
    // Also consider revalidating the dashboard if it summarizes tenant counts or related info.
    // revalidatePath('/'); 

    return { success: true };

  } catch (e: unknown) { // Using unknown for better type safety with instanceof
    console.error("Unexpected error in deleteTenantAction:", e);
    if (e instanceof Error) {
      return { success: false, error: { message: e.message } };
    }
    return { success: false, error: { message: "An unknown server error occurred" } };
  }
}

export async function getMieterByHausIdAction(
  hausId: string,
  startdatum?: string,
  enddatum?: string
): Promise<{ success: boolean; data?: Mieter[] | null; error?: string | null; }> {
  if (!hausId) {
    return { success: false, error: "Haus ID is required.", data: null };
  }

  const supabase = await createClient();

  // Validate date parameters if provided
  if (startdatum && enddatum) {
    const startDate = new Date(startdatum);
    const endDate = new Date(enddatum);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        success: false,
        error: 'Ungültiges Datumsformat. Verwenden Sie YYYY-MM-DD.',
        data: null
      };
    }

    if (startDate >= endDate) {
      return {
        success: false,
        error: 'Enddatum muss nach dem Startdatum liegen.',
        data: null
      };
    }
  }

  try {
    // Step 1: Fetch Wohnungen associated with the hausId
    const { data: wohnungenInHaus, error: wohnungenError } = await supabase
      .from("Wohnungen")
      .select("id")
      .eq("haus_id", hausId);

    if (wohnungenError) {
      console.error(`Error fetching Wohnungen for Haus ${hausId}:`, wohnungenError.message);
      return { success: false, error: wohnungenError.message, data: null };
    }

    if (!wohnungenInHaus || wohnungenInHaus.length === 0) {
      // No Wohnungen in this Haus, so no Mieter. This is a successful query with no results.
      return { success: true, data: [] };
    }

    const wohnungIds = wohnungenInHaus.map(w => w.id);

    // Step 2: Fetch Mieter who are in these Wohnungen
    // Including Wohnungen details as per the original fetchMieter and potential needs
    let query = supabase
      .from("Mieter")
      .select("*, Wohnungen(name, groesse, miete)")
      .in("wohnung_id", wohnungIds);

    // If date range is provided, filter tenants based on overlap with billing period
    if (startdatum && enddatum) {
      // Get tenants who have any overlap with the billing period
      // Tenant overlaps if: tenant_start <= billing_end AND (tenant_end >= billing_start OR tenant_end is null)
      query = query
        .or(`and(einzug.lte.${enddatum},or(auszug.is.null,auszug.gte.${startdatum}))`);
    }

    const { data: mieterData, error: mieterError } = await query;

    if (mieterError) {
      console.error(`Error fetching Mieter for Haus ${hausId} (Wohnung IDs: ${wohnungIds.join(', ')}):`, mieterError.message);
      return { success: false, error: mieterError.message, data: null };
    }

    // If mieterData is null (though no error), it means no tenants found for those wohnung_ids.
    // This is also a successful query with no results.
    return { success: true, data: mieterData || [] };

  } catch (e: any) {
    console.error("Unexpected error in getMieterByHausIdAction:", e.message);
    return { success: false, error: e.message || "An unexpected error occurred.", data: null };
  }
}

export async function updateKautionAction(formData: FormData): Promise<{ success: boolean; error?: { message: string } }> {
  const supabase = await createClient();

  try {
    // Extract form data
    const tenantId = formData.get('tenantId') as string;
    const amount = formData.get('amount') as string;
    const paymentDate = formData.get('paymentDate') as string;
    const status = formData.get('status') as KautionStatus;

    // Validation
    if (!tenantId) {
      return { success: false, error: { message: "Mieter ID ist erforderlich" } };
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return { success: false, error: { message: "Betrag muss eine positive Zahl sein" } };
    }

    const validStatuses: KautionStatus[] = ['Erhalten', 'Ausstehend', 'Zurückgezahlt'];
    if (!status || !validStatuses.includes(status)) {
      return { success: false, error: { message: "Ungültiger Status" } };
    }

    // Validate payment date if provided
    if (paymentDate && paymentDate.trim() !== '') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(paymentDate) || isNaN(Date.parse(paymentDate))) {
        return { success: false, error: { message: "Ungültiges Datum" } };
      }
    }

    // Create kaution data structure
    const now = new Date().toISOString();
    const kautionData: KautionData = {
      amount: parseFloat(amount),
      paymentDate: paymentDate && paymentDate.trim() !== '' ? paymentDate : '',
      status,
      createdAt: now,
      updatedAt: now
    };

    // Check if tenant already has kaution data to preserve createdAt
    const { data: existingTenant, error: fetchError } = await supabase
      .from('Mieter')
      .select('kaution')
      .eq('id', tenantId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error("Error fetching existing tenant data:", fetchError);
      return { success: false, error: { message: "Fehler beim Laden der Mieterdaten" } };
    }

    // If tenant has existing kaution data, preserve the createdAt timestamp
    if (existingTenant?.kaution) {
      kautionData.createdAt = existingTenant.kaution.createdAt || now;
    }

    // Update tenant with kaution data
    const { error: updateError } = await supabase
      .from('Mieter')
      .update({ kaution: kautionData })
      .eq('id', tenantId);

    if (updateError) {
      console.error("Error updating kaution data:", updateError);
      return { success: false, error: { message: updateError.message } };
    }

    // Revalidate the mieter page to reflect changes
    revalidatePath('/mieter');

    return { success: true };

  } catch (e) {
    console.error("Unexpected error in updateKautionAction:", e);
    return { success: false, error: { message: (e as Error).message } };
  }
}

export async function updateTenantApartment(tenantId: string, apartmentId: string): Promise<{ success: boolean; error?: { message: string } }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('Mieter')
      .update({ wohnung_id: apartmentId || null })
      .eq('id', tenantId);

    if (error) {
      console.error('Error updating tenant apartment:', error);
      return { success: false, error: { message: error.message } };
    }

    revalidatePath('/mieter');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating tenant apartment:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      }
    };
  }
}

export async function getSuggestedKautionAmount(tenantId: string): Promise<{ success: boolean; suggestedAmount?: number; error?: { message: string } }> {
  const supabase = await createClient();

  try {
    // Fetch tenant with associated apartment data
    const { data: tenant, error: tenantError } = await supabase
      .from('Mieter')
      .select('wohnung_id, Wohnungen(miete)')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      console.error("Error fetching tenant data:", tenantError);
      return { success: false, error: { message: "Fehler beim Laden der Mieterdaten" } };
    }

    // Handle the joined data - Supabase returns an array for joins
    const wohnungen = tenant.Wohnungen as { miete: number }[] | null;
    const wohnung = Array.isArray(wohnungen) && wohnungen.length > 0 ? wohnungen[0] : null;

    // If tenant has no associated apartment or apartment has no rent data
    if (!tenant.wohnung_id || !wohnung || !wohnung.miete) {
      return { success: true, suggestedAmount: undefined };
    }

    // Calculate suggested amount (3x rent)
    const suggestedAmount = wohnung.miete * 3;

    return { success: true, suggestedAmount };
  } catch (e) {
    console.error("Unexpected error in getSuggestedKautionAmount:", e);
    return { success: false, error: { message: (e as Error).message } };
  }
}

export async function deleteAllApplicantsAction(): Promise<{ success: boolean; error?: { message: string } }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('Mieter')
      .delete()
      .eq('status', 'bewerber');

    if (error) {
      console.error('Error deleting all applicants:', error);
      return { success: false, error: { message: error.message } };
    }

    revalidatePath('/mieter');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting all applicants:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      }
    };
  }
}
