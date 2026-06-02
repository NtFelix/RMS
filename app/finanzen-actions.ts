"use server";

import { ensureAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { logAction } from '@/lib/logging-middleware';
import { getPostHogServer } from '@/app/posthog-server.mjs';
import { logger } from '@/utils/logger';
import { posthogLogger } from '@/lib/posthog-logger';
import { fetchWithRpcFallback } from "@/lib/data-fetching";

// Define a more specific type for the payload, excluding id and related entities
interface FinanzInput {
  wohnung_id?: string | null;
  name: string;
  datum?: string | null;
  betrag: number;
  ist_einnahmen: boolean;
  notiz?: string | null;
  dokument_id?: string | null;
  tags?: string[] | null;
  user_id?: string;
}

export async function financeServerAction(id: string | null, data: FinanzInput): Promise<{ success: boolean; error?: { message: string }; data?: any }> {
  const actionName = id ? 'updateFinance' : 'createFinance';
  
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    logAction(actionName, 'error', { error_message: errorMessage });
    return { success: false, error: { message: errorMessage } };
  }

  // Ensure betrag is a number and handle potential string input from forms
  const payload: FinanzInput = {
    ...data,
    betrag: Number(data.betrag),
    wohnung_id: data.wohnung_id || null,
    datum: data.datum || null,
    notiz: data.notiz || null,
    dokument_id: data.dokument_id || null,
    user_id: user.id
  };

  if (typeof payload.name !== 'string' || payload.name.trim() === '') {
    return { success: false, error: { message: "Name ist erforderlich." } };
  }
  // Ensure betrag is a positive number. Allow 0 for cases like offsetting transactions.
  if (isNaN(payload.betrag)) {
    return { success: false, error: { message: "Betrag muss eine Zahl sein." } };
  }
  if (typeof payload.ist_einnahmen !== 'boolean') {
    return { success: false, error: { message: "Typ (Einnahmen/Ausgaben) ist erforderlich." } };
  }

  try {
    let dbResponse;
    if (id) {
      // Update existing record
      dbResponse = await supabase.from("Finanzen").update(payload).eq("id", id).eq("user_id", user.id).select().single();
    } else {
      // Create new record
      dbResponse = await supabase.from("Finanzen").insert(payload).select().single();
    }

    if (dbResponse.error) throw dbResponse.error;

    revalidatePath("/finanzen");
    logAction(actionName, 'success', { finance_id: dbResponse.data.id, finance_name: data.name });

    try {
      const posthog = getPostHogServer();
      await posthog.capture({
        distinctId: user.id,
        event: 'payment_recorded',
        properties: {
          payment_id: dbResponse.data.id,
          amount: payload.betrag,
          type: payload.ist_einnahmen ? 'income' : 'expense',
          category: payload.notiz || 'uncategorized', // Assuming 'notiz' might contain category info or just use a generic one
          date: payload.datum,
          has_property: !!payload.wohnung_id,
          source: 'server_action'
        }
      });
      await Promise.all([
        posthog.flush(),
        posthogLogger.flush()
      ]);
      logger.info(`[PostHog] Capturing payment event for user: ${user.id}`);
    } catch (phError) {
      logger.error('Failed to capture PostHog event:', phError instanceof Error ? phError : new Error(String(phError)));
    }

    return { success: true, data: dbResponse.data };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten.";
    logAction(actionName, 'error', { finance_id: id, error_message: errorMessage });
    console.error("Error in financeServerAction:", error);
    return { success: false, error: { message: errorMessage } };
  }
}

export async function toggleFinanceStatusAction(id: string, currentStatus: boolean): Promise<{ success: boolean; error?: { message: string }; data?: any }> {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { success: false, error: { message: errorMessage } };
  }

  try {
    // Only update the ist_einnahmen field
    const { data, error } = await supabase
      .from('Finanzen')
      .update({
        ist_einnahmen: !currentStatus
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling finance status:', error);
      return { success: false, error: { message: error.message } };
    }

    revalidatePath("/finanzen");
    return { success: true, data };
  } catch (error: unknown) {
    console.error('Unexpected error in toggleFinanceStatusAction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten.';
    return { success: false, error: { message: errorMessage } };
  }
}

export async function deleteFinanceAction(financeId: string): Promise<{ success: boolean; error?: { message: string } }> {
  try {
    const { user, supabase } = await ensureAuth();

    const { error } = await supabase
      .from("Finanzen")
      .delete()
      .eq("id", financeId)
      .eq("user_id", user.id);

    if (error) {
      // Log the error for server-side visibility
      console.error("Error deleting finance entry from Supabase:", error);
      return { success: false, error: { message: error.message } };
    }

    revalidatePath('/finanzen'); // Revalidate the main finance page

    return { success: true };

  } catch (e: unknown) {
    console.error("Unexpected error in deleteFinanceAction:", e);
    const message = e instanceof Error ? e.message : "An unknown server error occurred";
    return { success: false, error: { message } };
  }
}

export async function getAggregatedMaintenanceData(): Promise<{ success: boolean; data?: { name: string; value: number }[]; error?: { message: string } }> {
  try {
    const { user, supabase } = await ensureAuth();

    const result = await fetchWithRpcFallback<{ name: string; value: number }[]>(
      supabase,
      'get_aggregated_maintenance_data',
      {},
      async (client) => {
        // Optimized fallback: Fetch only necessary columns for all expenses in a single query
        const { data: allFinanzenData, error } = await client
          .from("Finanzen")
          .select("name, betrag")
          .eq("ist_einnahmen", false)
          .eq("user_id", user.id);

        if (error) throw error;

        const categories = {
          instandhaltung: 0,
          reparatur: 0,
          steuern: 0,
          sonstige: 0,
        };

        (allFinanzenData || []).forEach((item) => {
          const name = item.name?.toLowerCase() || "";
          const betrag = Number(item.betrag) || 0;

          if (name.includes("instandhaltung") || name.includes("wartung") || name.includes("pflege")) {
            categories.instandhaltung += betrag;
          } else if (name.includes("reparatur") || name.includes("reparieren") || name.includes("defekt")) {
            categories.reparatur += betrag;
          } else if (name.includes("steuer") || name.includes("abgabe") || name.includes("gebühr")) {
            categories.steuern += betrag;
          } else {
            categories.sonstige += betrag;
          }
        });

        const formattedData = [
          { name: "Instandhaltung", value: categories.instandhaltung },
          { name: "Reparatur", value: categories.reparatur },
          { name: "Steuern", value: categories.steuern },
          { name: "Sonstige", value: categories.sonstige },
        ];

        return formattedData.filter(item => item.value > 0);
      },
      'aggregated_maintenance_data'
    );
    
    return { success: true, data: result || [] };
  } catch (error: unknown) {
    console.error('Error fetching aggregated maintenance data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten.';
    return { success: false, error: { message: errorMessage } };
  }
}
