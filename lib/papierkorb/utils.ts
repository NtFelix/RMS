import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from 'next/cache';
import { DELETE_BLOCKED_SQLSTATE, createDeleteError, stripDbCodePrefix } from '@/lib/bulk-delete-summary';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

interface CascadeFailure {
  recordId: string;
  message: string;
  /** SQLSTATE der Datenbank (z. B. `KA009` bei einer Löschsperre), falls bekannt. */
  code?: string;
}

/**
 * Löscht die übergebenen Datensätze (weich) und sammelt die Fehler, statt sie zu verschlucken.
 * Ein Fehler bricht die übrigen Löschungen nicht ab, damit der Nutzer alle Gründe auf einmal erfährt
 * (z. B. mehrere Mieter mit hinterlegter Kaution).
 */
async function softDeleteChildren(
  supabase: SupabaseServerClient,
  tableName: string,
  recordIds: string[]
): Promise<{ deleted: number; failures: CascadeFailure[] }> {
  const results = await Promise.all(
    recordIds.map(async (recordId): Promise<CascadeFailure | null> => {
      try {
        const { error } = await supabase.rpc('soft_delete_record', {
          p_table_name: tableName,
          p_record_id: recordId,
        });
        if (error) {
          // Nur Kennung und technische Meldung loggen (keine Inhalte der Datensätze).
          console.error('Failed to cascade soft-delete %s %s: %s', tableName, recordId, error.message);
          return { recordId, message: error.message, code: error.code };
        }
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Failed to cascade soft-delete %s %s: %s', tableName, recordId, message);
        return { recordId, message };
      }
    })
  );

  const failures = results.filter((r): r is CascadeFailure => r !== null);
  return { deleted: recordIds.length - failures.length, failures };
}

/** Liest die IDs abhängiger Datensätze; ein Lesefehler bricht ab, statt die Kaskade stillschweigend zu überspringen. */
async function fetchChildIds(
  query: PromiseLike<{ data: { id: string }[] | null; error: { message: string } | null }>,
  childLabel: string
): Promise<string[]> {
  const { data, error } = await query;
  if (error) {
    console.error('Failed to load %s for cascade soft-delete: %s', childLabel, error.message);
    throw new Error(`Die zugehörigen ${childLabel} konnten nicht ermittelt werden. Es wurde nichts gelöscht.`);
  }
  return (data ?? []).map(row => row.id);
}

/**
 * Wirft einen Fehler mit den (deutschen) Meldungen der Datenbank, wenn Kinder nicht gelöscht werden konnten.
 * Das technische Präfix der Datenbank (`KAUT_GESPERRT: `) wird je Meldung entfernt, der SQLSTATE einer Löschsperre
 * bleibt als `code` am Fehler (die Routen antworten dann mit HTTP 409 statt 500).
 */
function assertNoCascadeFailures(
  failures: CascadeFailure[],
  deletedChildTable: string,
  deletedCount: number,
  parentNotDeletedHint: string
): void {
  if (failures.length === 0) return;

  // Bereits (weich) gelöschte Kinder bleiben es und sind im Papierkorb wiederherstellbar:
  // die Seiten der Kindtabelle müssen also trotz Fehler neu geladen werden.
  if (deletedCount > 0) {
    revalidatePathsForTable(deletedChildTable);
  }

  const messages = Array.from(new Set(failures.map(f => stripDbCodePrefix(f.message)).filter(Boolean)));
  const detail = messages.length > 0 ? messages.join(' ') : 'Das Löschen der zugehörigen Datensätze ist fehlgeschlagen.';
  const blocked = failures.some(f => f.code === DELETE_BLOCKED_SQLSTATE);
  throw createDeleteError(`${detail} ${parentNotDeletedHint}`, blocked ? DELETE_BLOCKED_SQLSTATE : undefined);
}

/**
 * Löscht einen Datensatz weich (Papierkorb).
 *
 * Kaskade Haeuser -> Wohnungen -> Mieter: Zuerst werden die abhängigen Datensätze gelöscht (Mieter, dann
 * Wohnungen), das Elternobjekt erst, wenn alle Kinder erfolgreich gelöscht wurden. Schlägt eine
 * Kinder-Löschung fehl (z. B. weil ein Mieter eine hinterlegte Kaution hat), wird der Fehler mit der
 * Meldung der Datenbank weitergereicht und das Elternobjekt NICHT gelöscht. Sonst würde ein aktiver
 * Mieter unbemerkt unter einer gelöschten Wohnung zurückbleiben.
 *
 * Hinweis: Die Kinder werden einzeln gelöscht; bei einem Teilfehler bleiben bereits gelöschte Kinder im
 * Papierkorb (wiederherstellbar). Die Datenbank bleibt dabei konsistent.
 */
export async function softDeleteEntryAction(
  tableName: string,
  recordId: string,
  options?: { pruefsumme?: string | null }
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // Mit Prüfsumme der angezeigten Auswirkung (Bestätigungsfenster): Die Datenbank löscht Haus/Wohnung/Mieter samt
  // Kautionen MIT Buchungen atomar (`soft_delete_mit_kautionen`). Rechte, Objektzugriff und die Prüfsumme prüft sie selbst
  // (`42501`, `KA002`, `KA016`); ohne Bestätigung bleibt es bei der Löschsperre `KA009` der Standardfunktion unten.
  if (options?.pruefsumme && (tableName === 'Haeuser' || tableName === 'Wohnungen' || tableName === 'Mieter')) {
    const { error } = await supabase.rpc('soft_delete_mit_kautionen', {
      p_table_name: tableName,
      p_record_id: recordId,
      p_pruefsumme: options.pruefsumme,
    });
    if (error) {
      console.error('Error confirmed soft deleting record %s from %s: %s', recordId, tableName, error.code);
      throw createDeleteError(error.message, error.code);
    }
    revalidatePathsForTable(tableName);
    revalidatePathsForTable('Kautionen');
    return;
  }

  if (tableName === 'Haeuser') {
    const wohnungIds = await fetchChildIds(
      supabase.from('Wohnungen').select('id').eq('haus_id', recordId),
      'Wohnungen'
    );

    if (wohnungIds.length > 0) {
      const mieterIds = await fetchChildIds(
        supabase.from('Mieter').select('id').in('wohnung_id', wohnungIds),
        'Mieter'
      );

      const mieterResult = await softDeleteChildren(supabase, 'Mieter', mieterIds);
      assertNoCascadeFailures(mieterResult.failures, 'Mieter', mieterResult.deleted, 'Das Haus wurde nicht gelöscht.');

      const wohnungenResult = await softDeleteChildren(supabase, 'Wohnungen', wohnungIds);
      assertNoCascadeFailures(wohnungenResult.failures, 'Wohnungen', wohnungenResult.deleted, 'Das Haus wurde nicht gelöscht.');
    }
  } else if (tableName === 'Wohnungen') {
    const mieterIds = await fetchChildIds(
      supabase.from('Mieter').select('id').eq('wohnung_id', recordId),
      'Mieter'
    );

    const mieterResult = await softDeleteChildren(supabase, 'Mieter', mieterIds);
    assertNoCascadeFailures(mieterResult.failures, 'Mieter', mieterResult.deleted, 'Die Wohnung wurde nicht gelöscht.');
  }

  const { error } = await supabase.rpc('soft_delete_record', {
    p_table_name: tableName,
    p_record_id: recordId,
  });
  if (error) {
    console.error('Error soft deleting record %s from %s:', recordId, tableName, error);
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
