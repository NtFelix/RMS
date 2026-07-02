import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function softDeleteEntryAction(tableName: string, recordId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('soft_delete_record', {
    p_table_name: tableName,
    p_record_id: recordId,
  });
  if (error) {
    console.error('Error soft deleting record %s from %s:', recordId, tableName, error);
    throw new Error(error.message);
  }

  // Cascade: Haeuser -> Wohnungen -> Mieter
  if (tableName === 'Haeuser') {
    const { data: wohnungen } = await supabase
      .from('Wohnungen')
      .select('id')
      .eq('haus_id', recordId);

    if (wohnungen && wohnungen.length > 0) {
      const wohnungIds = wohnungen.map(w => w.id);

      await Promise.all(
        wohnungIds.map(wId =>
          supabase.rpc('soft_delete_record', {
            p_table_name: 'Wohnungen',
            p_record_id: wId,
          }).then(({ error }) => {
            if (error) console.warn('Failed to cascade soft-delete apartment ' + wId + ':', error.message);
          })
        )
      );

      const { data: mieter } = await supabase
        .from('Mieter')
        .select('id')
        .in('wohnung_id', wohnungIds);

      if (mieter && mieter.length > 0) {
        await Promise.all(
          mieter.map(m =>
            supabase.rpc('soft_delete_record', {
              p_table_name: 'Mieter',
              p_record_id: m.id,
            }).then(({ error }) => {
              if (error) console.warn('Failed to cascade soft-delete tenant ' + m.id + ':', error.message);
            })
          )
        );
      }
    }
  } else if (tableName === 'Wohnungen') {
    const { data: mieter } = await supabase
      .from('Mieter')
      .select('id')
      .eq('wohnung_id', recordId);

    if (mieter && mieter.length > 0) {
      await Promise.all(
        mieter.map(m =>
          supabase.rpc('soft_delete_record', {
            p_table_name: 'Mieter',
            p_record_id: m.id,
          }).then(({ error }) => {
            if (error) console.warn('Failed to cascade soft-delete tenant ' + m.id + ':', error.message);
          })
        )
      );
    }
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

