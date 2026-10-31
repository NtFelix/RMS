import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from 'next/cache';
import { createDeleteError } from '@/lib/bulk-delete-summary';

/**
 * Löscht einen Datensatz weich (Papierkorb).
 *
 * Haus und Wohnung gehen über die Datenbankfunktion `soft_delete_mit_kautionen`: die EINE atomare Kaskade Haus ->
 * Wohnungen -> Mieter (samt Kautionen) in einer Transaktion mit einem Zeitstempel. Schlägt ein Schritt fehl (z. B. weil
 * eine Kaution mit Buchungen die Löschung sperrt, `KA009`), wird nichts gelöscht und die Meldung der Datenbank
 * weitergereicht. Es gibt keine Teilerfolge und keinen zweiten Kaskadenweg in der App. Alle anderen Datensätze
 * (auch Mieter) gehen über `soft_delete_record`.
 */
export async function softDeleteEntryAction(tableName: string, recordId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const ueberKaskade = tableName === 'Haeuser' || tableName === 'Wohnungen';
  const { error } = ueberKaskade
    ? await supabase.rpc('soft_delete_mit_kautionen', { p_table_name: tableName, p_record_id: recordId })
    : await supabase.rpc('soft_delete_record', { p_table_name: tableName, p_record_id: recordId });
  if (error) {
    // Nur Tabelle, Kennung und Code loggen (keine Inhalte der Datensätze).
    console.error('Error soft deleting record %s from %s: %s', recordId, tableName, error.code);
    // Die Datenbankfunktion fehlt (App vor dem Datenbank-Update ausgerollt): eine klare Meldung statt des technischen Textes.
    if (ueberKaskade && (error.code === 'PGRST202' || error.code === '42883')) {
      throw createDeleteError(
        'Das Löschen ist derzeit nicht möglich: Die benötigte Datenbankfunktion ist noch nicht eingespielt. Bitte versuchen Sie es später erneut oder wenden Sie sich an den Support.',
        error.code
      );
    }
    throw createDeleteError(error.message, error.code);
  }

  revalidatePathsForTable(tableName);
}

/**
 * Ziel einer Revalidierung: ein konkreter Pfad oder ein Routenmuster mit Typ, z. B. für Catch-all-Routen,
 * die `revalidatePath('/dateien')` allein nicht erreicht.
 */
type RevalidationTarget = string | readonly [pattern: string, type: 'page' | 'layout'];

/**
 * Pro Tabelle die Seiten, deren Daten von ihr abhängen. Ihre Reihenfolge bestimmt die Revalidierung.
 * `/betriebskosten` steht bei allen Tabellen, deren Actions diese Seite ebenfalls revalidieren.
 */
const TABLE_REVALIDATION_PATHS: Record<string, readonly RevalidationTarget[]> = {
  Haeuser: ['/haeuser', '/wohnungen', '/mieter', '/betriebskosten'],
  Wohnungen: ['/wohnungen', '/mieter'],
  Mieter: ['/mieter', '/wohnungen'],
  Kautionen: ['/mieter'],
  Finanzen: ['/finanzen'],
  Aufgaben: ['/todos'],
  Zaehler: ['/wohnungen', '/betriebskosten'],
  Zaehler_Ablesungen: ['/wohnungen', '/betriebskosten'],
  Nebenkosten: ['/betriebskosten'],
  Dokumente_Metadaten: ['/dateien', ['/dateien/[...slug]', 'page']],
  Rechnungen: ['/finanzen', '/betriebskosten'],
};

export function revalidatePathsForTable(tableName: string) {
  // Object.hasOwn: Namen wie 'constructor' oder '__proto__' treffen keine geerbten Eigenschaften.
  const paths = Object.hasOwn(TABLE_REVALIDATION_PATHS, tableName) ? TABLE_REVALIDATION_PATHS[tableName] : [];
  for (const target of paths) {
    if (typeof target === 'string') {
      revalidatePath(target);
    } else {
      revalidatePath(target[0], target[1]);
    }
  }
  revalidatePath('/dashboard');
}
