"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ensureAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { Mieter } from "../lib/data-fetching";
import { MIETER_LESE_SELECT, bewerberEingabeAusMieterEingabe, fehlerAusRpc, type Roh } from "@/lib/mieter-schreibpfad";
import { mitPersonenfeldern, personEingabeAusFormData, hatNamen, type Person, type PersonEingabe } from "@/lib/personen";
import { stripDbCodePrefix } from "@/lib/bulk-delete-summary";
import { logAction } from '@/lib/logging-middleware';
import { getPostHogServer } from '@/app/posthog-server.mjs';
import { logger } from '@/utils/logger';
import { posthogLogger } from '@/lib/posthog-logger';
import { ermittleWohnungswechselFehler } from '@/lib/mietverhaeltnis-errors';

/** Server-Client wie in ensureAuth geliefert. */
type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Bewerber bearbeiten: Bewerber und Person liegen getrennt. Beide Tabellen sind per RLS lesbar und änderbar
 * (Modul mieter bzw. kontakte); der Schreibzugriff ist nicht über eine RPC gekapselt.
 */
async function aktualisiereBewerber(
  supabase: Supabase,
  bewerberId: string,
  person: PersonEingabe,
  bewerber: Roh
): Promise<{ message?: string }> {
  const { data: zeile, error: leseFehler } = await supabase
    .from("Bewerber")
    .select("person_id")
    .eq("id", bewerberId)
    .single();
  if (leseFehler || !zeile?.person_id) {
    return { message: "Bewerber nicht gefunden." };
  }

  // Ohne Treffer (0 Zeilen, z. B. durch RLS) ist nichts gespeichert: das ist ein Fehler, kein Erfolg.
  if (Object.keys(person).length > 0) {
    const { data: personGeaendert, error } = await supabase
      .from("Personen")
      .update(person)
      .eq("id", zeile.person_id)
      .select("id")
      .maybeSingle();
    if (error || !personGeaendert) return { message: "Die Person konnte nicht gespeichert werden." };
  }

  const { data: bewerberGeaendert, error } = await supabase
    .from("Bewerber")
    .update({ wohnung_id: bewerber.wohnung_id ?? null, notiz: bewerber.notiz ?? null })
    .eq("id", bewerberId)
    .select("id")
    .maybeSingle();
  if (error || !bewerberGeaendert) return { message: "Der Bewerber konnte nicht gespeichert werden." };
  return {};
}

export async function handleSubmit(formData: FormData): Promise<{ success: boolean; error?: { message: string } }> {
  const id = formData.get('id');
  const actionName = id ? 'updateTenant' : 'createTenant';
  // Bewerber sind seit GH-30 eigene Datensätze ("Bewerber" + "Personen"); das Formular kennzeichnet sie mit status.
  const istBewerber = formData.get('status') === 'bewerber';

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
    logAction(actionName, 'error', { error_message: "Keine Berechtigung" });
    return { success: false, error: { message: "Keine Berechtigung" } };
  }
  
  const wohnungIds = await getAccessibleWohnungIds();
  if (wohnungIds !== null) {
    const targetWohnungId = formData.get('wohnung_id') as string | null;
    // Bewerber dürfen ohne Wohnung sein (RLS erlaubt das): dann gibt es nichts zu prüfen. Eine gesetzte Wohnung
    // muss im Scope liegen.
    const ohneWohnungErlaubt = istBewerber && !targetWohnungId;
    if (!ohneWohnungErlaubt && (!targetWohnungId || !wohnungIds.includes(targetWohnungId))) {
      return { success: false, error: { message: "Zugriff auf die angegebene Wohnung verweigert." } };
    }
    
    if (id) {
      const { data: existingTenant, error: fetchError } = await supabase
        .from(istBewerber ? "Bewerber" : "Mieter")
        .select("wohnung_id")
        .eq("id", id as string)
        .single();
      if (fetchError || !existingTenant) {
        return { success: false, error: { message: "Zugriff auf diesen Mieter verweigert." } };
      }
      const bisherigeWohnung = existingTenant.wohnung_id;
      const bisherigeWohnungOk = bisherigeWohnung
        ? wohnungIds.includes(bisherigeWohnung)
        : istBewerber;
      if (!bisherigeWohnungOk) {
        return { success: false, error: { message: "Zugriff auf diesen Mieter verweigert." } };
      }
    }
  }

  try {
    const personEingabe = personEingabeAusFormData(formData);
    const mieterEingabe: Roh = {
      wohnung_id: formData.get('wohnung_id') || null,
      einzug: formData.get('einzug') || null,
      auszug: formData.get('auszug') || null,
      notiz: formData.get('notiz') || null,
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
      if (istBewerber) {
        const ergebnis = await aktualisiereBewerber(supabase, id as string, personEingabe, mieterEingabe);
        if (ergebnis.message) {
          return { success: false, error: { message: ergebnis.message } };
        }
      } else {
        const { error } = await supabase.rpc('mieter_aktualisieren', {
          p_mieter_id: id as string,
          p_person: personEingabe,
          p_mieter: mieterEingabe,
        });
        if (error) {
          return { success: false, error: { message: fehlerAusRpc(error).message } };
        }
      }
    } else {
      if (!hatNamen(personEingabe)) {
        return { success: false, error: { message: "Bitte geben Sie einen Vor- oder Nachnamen an." } };
      }
      if (istBewerber) {
        const { data, error } = await supabase.rpc('bewerber_anlegen', {
          p_person: personEingabe,
          p_bewerber: bewerberEingabeAusMieterEingabe(mieterEingabe),
        });
        if (error) {
          return { success: false, error: { message: fehlerAusRpc(error).message } };
        }
        finalTenantId = (data as { bewerber_id?: string } | null)?.bewerber_id ?? null;
      } else {
        const { data, error } = await supabase.rpc('mieter_anlegen', {
          p_person: personEingabe,
          p_mieter: mieterEingabe,
        });
        if (error) {
          return { success: false, error: { message: fehlerAusRpc(error).message } };
        }
        finalTenantId = (data as { mieter_id?: string } | null)?.mieter_id ?? null;
      }
    }
    revalidatePath('/mieter');
    logAction(actionName, 'success', { operation: id ? 'update' : 'create' });

    try {
      const posthog = getPostHogServer();
      const eventName = id ? 'tenant_updated' : 'tenant_added';

      if (user) {
        await posthog.capture({
          distinctId: user.id,
          event: eventName,
          properties: {
            tenant_id: finalTenantId || 'unknown',
            has_property: !!mieterEingabe.wohnung_id,
            property_id: mieterEingabe.wohnung_id,
            has_email: !!personEingabe.email,
            status: istBewerber ? 'bewerber' : 'mieter',
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
    logAction(actionName, 'error', { error_message: errorMessage });
    return { success: false, error: { message: errorMessage } };
  }
}

/**
 * Löscht einen Mieter (Papierkorb).
 */
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
      .select(`${MIETER_LESE_SELECT}, Wohnungen(name, groesse, miete)`) // ohne Altfeld `kaution` (GH-6) und ohne Personenfelder (GH-30)
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
    // Die Person kommt eingebettet (Schlüssel `person`); mitPersonenfeldern bildet die bisherigen Felder
    // name, email und telefonnummer ab. postgrest-js leitet aus der Spaltenliste eine Zeilenform ab, die nicht
    // exakt zu `Mieter` passt; der Laufzeitwert entspricht weiterhin `Mieter`.
    const zeilen = (mieterData || []) as unknown as Array<{ person?: Person | Person[] | null }>;
    return { success: true, data: zeilen.map((zeile) => mitPersonenfeldern(zeile)) as unknown as Mieter[] };

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
      return { success: false, error: { message: ermittleWohnungswechselFehler(error) ?? error.message } };
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

