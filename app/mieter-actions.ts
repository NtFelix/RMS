"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ensureAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { Mieter } from "../lib/data-fetching";
import { TenantStatus } from "@/types/Tenant";
import { MIETER_SPALTEN_OHNE_KAUTION } from "@/lib/mieter-columns";
import { formatFailureReasons, stripDbCodePrefix, summarizeSettledDeletes } from "@/lib/bulk-delete-summary";
import { logAction } from '@/lib/logging-middleware';
import { getPostHogServer } from '@/app/posthog-server.mjs';
import { logger } from '@/utils/logger';
import { posthogLogger } from '@/lib/posthog-logger';

export async function handleSubmit(formData: FormData): Promise<{ success: boolean; error?: { message: string } }> {
  const id = formData.get('id');
  const actionName = id ? 'updateTenant' : 'createTenant';
  const tenantName = formData.get('name') as string;
  
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { success: false, error: { message: errorMessage } };
  }

  // Permission & scope checks
  const { hasPermission } = await import("@/lib/permissions");
  const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
  
  if (!(await hasPermission('mieter', id ? 'bearbeiten' : 'erstellen'))) {
    logAction(actionName, 'error', { tenant_name: tenantName, error_message: "Keine Berechtigung" });
    return { success: false, error: { message: "Keine Berechtigung" } };
  }
  
  const wohnungIds = await getAccessibleWohnungIds();
  if (wohnungIds !== null) {
    const targetWohnungId = formData.get('wohnung_id') as string | null;
    if (!targetWohnungId || !wohnungIds.includes(targetWohnungId)) {
      return { success: false, error: { message: "Zugriff auf die angegebene Wohnung verweigert." } };
    }
    
    if (id) {
      const { data: existingTenant, error: fetchError } = await supabase
        .from("Mieter")
        .select("wohnung_id")
        .eq("id", id as string)
        .single();
      if (fetchError || !existingTenant || !existingTenant.wohnung_id || !wohnungIds.includes(existingTenant.wohnung_id)) {
        return { success: false, error: { message: "Zugriff auf diesen Mieter verweigert." } };
      }
    }
  }

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

      if (user) {
        await posthog.capture({
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
        await Promise.all([
          posthog.flush(),
          posthogLogger.flush()
        ]);
        logger.info(`[PostHog] Capturing tenant event: ${eventName} for user: ${user.id}`);
      }
    } catch (phError) {
      logger.error('Failed to capture PostHog event:', phError instanceof Error ? phError : new Error(String(phError)));
    }

    return { success: true };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Ein unbekannter Fehler ist aufgetreten.";
    logAction(actionName, 'error', { tenant_name: tenantName, error_message: errorMessage });
    return { success: false, error: { message: errorMessage } };
  }
}

export async function deleteTenantAction(tenantId: string): Promise<{ success: boolean; error?: { message: string } }> {
  try {
    let user, supabase;
    try {
      ({ user, supabase } = await ensureAuth());
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
      return { success: false, error: { message: errorMessage } };
    }

    // Permission & scope checks
    const { hasPermission } = await import("@/lib/permissions");
    const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
    
    if (!(await hasPermission('mieter', 'loeschen'))) {
      return { success: false, error: { message: "Keine Berechtigung" } };
    }
    
    const wohnungIds = await getAccessibleWohnungIds();
    if (wohnungIds !== null) {
      const { data: existingTenant, error: fetchError } = await supabase
        .from("Mieter")
        .select("wohnung_id")
        .eq("id", tenantId)
        .single();
      if (fetchError || !existingTenant || !existingTenant.wohnung_id || !wohnungIds.includes(existingTenant.wohnung_id)) {
        return { success: false, error: { message: "Zugriff auf diesen Mieter verweigert." } };
      }
    }
    const { softDeleteEntryAction } = await import("@/lib/papierkorb/utils");
    try {
      await softDeleteEntryAction("Mieter", tenantId);
    } catch (err: any) {
      console.error("Error soft deleting tenant:", err);
      // Die Löschsperren der Datenbank (z. B. Mieter mit hinterlegter Kaution) liefern deutsche Meldungen mit
      // stabilem Präfix ("KAUT_GESPERRT: ..."): ohne Präfix an die UI geben.
      return { success: false, error: { message: stripDbCodePrefix(String(err?.message ?? "")) || "Der Mieter konnte nicht gelöscht werden." } };
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

  let supabase;
  try {
    ({ supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { success: false, error: errorMessage, data: null };
  }

  // Permission & scope checks
  const { hasPermission } = await import("@/lib/permissions");
  const { getAccessibleHaeuserIds } = await import("@/lib/object-scope");
  
  if (!(await hasPermission('mieter', 'ansehen'))) {
    return { success: false, error: "Keine Berechtigung", data: null };
  }
  
  const haeuserIds = await getAccessibleHaeuserIds();
  if (haeuserIds !== null && !haeuserIds.includes(hausId)) {
    return { success: false, error: "Zugriff auf dieses Haus verweigert.", data: null };
  }

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
      console.error('Error fetching Wohnungen for Haus %s:', hausId, wohnungenError.message);
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
      .select(`${MIETER_SPALTEN_OHNE_KAUTION}, Wohnungen(name, groesse, miete)`) // bewusst ohne das Altfeld `kaution` (GH-6)
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
      console.error('Error fetching Mieter for Haus %s (Wohnung IDs: %s):', hausId, wohnungIds.join(', '), mieterError.message);
      return { success: false, error: mieterError.message, data: null };
    }

    // If mieterData is null (though no error), it means no tenants found for those wohnung_ids.
    // This is also a successful query with no results.
    // postgrest-js leitet aus der expliziten Spaltenliste eine Zeilenform ab, die nicht exakt zu `Mieter` passt
    // (eingebettete Relation als Array); der Laufzeitwert entspricht weiterhin `Mieter`.
    return { success: true, data: (mieterData || []) as unknown as Mieter[] };

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
    console.error("Unexpected error in getMieterByHausIdAction:", errorMessage);
    return { success: false, error: errorMessage, data: null };
  }
}

// Die Kaution wird nicht mehr über Server Actions dieser Datei geschrieben (der frühere Schreibweg auf das
// Altfeld Mieter.kaution ist entfernt, GH-6): siehe app/kautionen-actions.ts (nur RPCs mit Modul-, Objekt- und Saldoprüfung).

export async function updateTenantApartment(tenantId: string, apartmentId: string): Promise<{ success: boolean; error?: { message: string } }> {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { success: false, error: { message: errorMessage } };
  }

  // Permission & scope checks
  const { hasPermission } = await import("@/lib/permissions");
  const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
  
  if (!(await hasPermission('mieter', 'bearbeiten'))) {
    return { success: false, error: { message: "Keine Berechtigung" } };
  }
  
  const wohnungIds = await getAccessibleWohnungIds();
  if (wohnungIds !== null) {
    if (apartmentId && !wohnungIds.includes(apartmentId)) {
      return { success: false, error: { message: "Zugriff auf die angegebene Wohnung verweigert." } };
    }
    
    const { data: existingTenant, error: fetchError } = await supabase
      .from("Mieter")
      .select("wohnung_id")
      .eq("id", tenantId)
      .single();
    if (fetchError || !existingTenant || !existingTenant.wohnung_id || !wohnungIds.includes(existingTenant.wohnung_id)) {
      return { success: false, error: { message: "Zugriff auf diesen Mieter verweigert." } };
    }
  }

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
  } catch (error: unknown) {
    console.error('Unexpected error updating tenant apartment:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      }
    };
  }
}

export async function deleteAllApplicantsAction(): Promise<{ success: boolean; error?: { message: string } }> {
  try {
    let user, supabase;
    try {
      ({ user, supabase } = await ensureAuth());
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
      return { success: false, error: { message: errorMessage } };
    }

    // Permission & scope checks
    const { hasPermission } = await import("@/lib/permissions");
    const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
    
    if (!(await hasPermission('mieter', 'loeschen'))) {
      return { success: false, error: { message: "Keine Berechtigung" } };
    }
    
    const wohnungIds = await getAccessibleWohnungIds();
    let fetchQuery = supabase.from('Mieter').select('id').eq('status', 'bewerber');
    if (wohnungIds !== null) {
      fetchQuery = fetchQuery.in('wohnung_id', wohnungIds);
    }

    const { data: applicants, error: fetchError } = await fetchQuery;

    if (fetchError) {
      console.error('Error fetching applicants for deletion:', fetchError);
      return { success: false, error: { message: fetchError.message } };
    }

    if (applicants && applicants.length > 0) {
      const { softDeleteEntryAction } = await import("@/lib/papierkorb/utils");
      // Jeden Bewerber einzeln löschen und alle Ergebnisse abwarten: Die Datenbank kann einzelne Löschungen ablehnen
      // (z. B. Bewerber mit hinterlegter Kaution). Die Gründe stehen ohne technisches Präfix in der Meldung.
      const results = await Promise.allSettled(applicants.map(applicant => softDeleteEntryAction("Mieter", applicant.id)));
      const { successCount, errorCount, reasons } = summarizeSettledDeletes(results);
      if (errorCount > 0) {
        // Bereits gelöschte Bewerber bleiben gelöscht (Papierkorb); `softDeleteEntryAction` hat dafür je Erfolg
        // `/mieter` revalidiert, die Liste wird also auch bei einem Teilerfolg neu geladen.
        const summary = successCount === 0
          ? 'Es konnten keine Bewerber gelöscht werden.'
          : `${errorCount} von ${applicants.length} Bewerbern ${errorCount === 1 ? 'konnte' : 'konnten'} nicht gelöscht werden.`;
        const reasonText = formatFailureReasons(reasons);
        return { success: false, error: { message: reasonText ? `${summary} ${reasonText}` : summary } };
      }
    }

    revalidatePath('/mieter');
    return { success: true };
  } catch (error: unknown) {
    console.error('Unexpected error deleting all applicants:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      }
    };
  }
}
