import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from 'next/cache';
import { createDeleteError } from '@/lib/bulk-delete-summary';

/**
 * Löscht einen Datensatz weich (Papierkorb).
 *
 * Haus und Wohnung gehen über die Datenbankfunktion `soft_delete_mit_kautionen`: die EINE atomare Kaskade Haus ->
 * Wohnungen -> Mieter (samt Kautionen) in einer Transaktion mit einem Zeitstempel. Schlägt ein Schritt fehl (z. B. weil
 * eine Kaution mit Buchungen nicht bestätigt wurde, `KA009`/`KA016`), wird nichts gelöscht und die Meldung der Datenbank
 * weitergereicht. Es gibt keine Teilerfolge und keinen zweiten Kaskadenweg in der App.
 *
 * `options.pruefsumme`: Prüfsumme der bestätigten Auswirkung auf Kautionen mit Buchungen (Übersicht "Kautionen werden
 * mitgelöscht"). Ohne sie lehnt die Datenbank das Löschen mit gebuchten Kautionen ab; ohne gebuchte Kaution wird sie nicht
 * gebraucht. Für einen einzelnen Mieter mit Prüfsumme gilt derselbe Weg; alle anderen Datensätze gehen über `soft_delete_record`.
 */
export async function softDeleteEntryAction(
  tableName: string,
  recordId: string,
  options?: { pruefsumme?: string | null }
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const pruefsumme = options?.pruefsumme || null;

  const ueberKaskade = tableName === 'Haeuser' || tableName === 'Wohnungen' || (tableName === 'Mieter' && pruefsumme !== null);
  const { error } = ueberKaskade
    ? await supabase.rpc('soft_delete_mit_kautionen', { p_table_name: tableName, p_record_id: recordId, p_pruefsumme: pruefsumme })
    : await supabase.rpc('soft_delete_record', { p_table_name: tableName, p_record_id: recordId });
  if (error) {
    // Nur Tabelle, Kennung und Code loggen (keine Inhalte der Datensätze).
    console.error('Error soft deleting record %s from %s: %s', recordId, tableName, error.code);
    throw createDeleteError(error.message, error.code);
  }

  revalidatePathsForTable(tableName);
}

export function revalidatePathsForTable(tableName: string) {
  if (tableName === 'Haeuser') {
    revalidatePath('/haeuser');
    revalidatePath('/wohnungen');
    revalidatePath('/mieter');
  } else if (tableName === 'Wohnungen') {
    revalidatePath('/wohnungen');
    revalidatePath('/mieter');
  } else if (tableName === 'Mieter') {
    revalidatePath('/mieter');
    revalidatePath('/wohnungen');
  } else if (tableName === 'Kautionen') {
    revalidatePath('/mieter');
  } else if (tableName === 'Finanzen') {
    revalidatePath('/finanzen');
  } else if (tableName === 'Aufgaben') {
    revalidatePath('/todos');
  } else if (tableName === 'Zaehler' || tableName === 'Zaehler_Ablesungen') {
    revalidatePath('/wohnungen');
  } else if (tableName === 'Nebenkosten') {
    revalidatePath('/betriebskosten');
  } else if (tableName === 'Dokumente_Metadaten') {
    revalidatePath('/dateien');
  } else if (tableName === 'Rechnungen') {
    revalidatePath('/finanzen');
  }
  revalidatePath('/dashboard');
}
