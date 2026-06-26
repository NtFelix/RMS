'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export interface PapierkorbEntry {
  id: string;
  table_name: string;
  name: string;
  geloescht_am: string;
  geloescht_von: string | null;
  restzeit_tage: number;
  dateigroesse?: number;
}

export async function getPapierkorbEntriesAction(): Promise<PapierkorbEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_paperkorb_entries');
  if (error) {
    console.error('Error fetching paperkorb entries:', error);
    throw new Error(error.message);
  }
  return data as PapierkorbEntry[];
}

export async function restoreEntryAction(tableName: string, recordId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('restore_record', {
    p_table_name: tableName,
    p_record_id: recordId,
  });
  if (error) {
    console.error(`Error restoring record ${recordId} from ${tableName}:`, error);
    throw new Error(error.message);
  }
  revalidatePath('/papierkorb');
}

export async function permanentlyDeleteEntryAction(tableName: string, recordId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('permanently_delete_record', {
    p_table_name: tableName,
    p_record_id: recordId,
  });
  if (error) {
    console.error(`Error permanently deleting record ${recordId} from ${tableName}:`, error);
    throw new Error(error.message);
  }
  revalidatePath('/papierkorb');
}

export async function softDeleteEntryAction(tableName: string, recordId: string): Promise<void> {
  const supabase = await createClient();

  // 1. Main record soft-delete
  const { error } = await supabase.rpc('soft_delete_record', {
    p_table_name: tableName,
    p_record_id: recordId,
  });
  if (error) {
    console.error(`Error soft deleting record ${recordId} from ${tableName}:`, error);
    throw new Error(error.message);
  }

  // 2. Cascade: Haeuser -> Wohnungen -> Mieter
  if (tableName === 'Haeuser') {
    const { data: wohnungen } = await supabase
      .from('Wohnungen')
      .select('id')
      .eq('haus_id', recordId);
    
    for (const w of wohnungen ?? []) {
      const { error: wError } = await supabase.rpc('soft_delete_record', {
        p_table_name: 'Wohnungen',
        p_record_id: w.id,
      });
      if (wError) {
        console.warn(`Failed to cascade soft-delete apartment ${w.id}:`, wError.message);
      }

      const { data: mieter } = await supabase
        .from('Mieter')
        .select('id')
        .eq('wohnung_id', w.id);
      
      for (const m of mieter ?? []) {
        const { error: mError } = await supabase.rpc('soft_delete_record', {
          p_table_name: 'Mieter',
          p_record_id: m.id,
        });
        if (mError) {
          console.warn(`Failed to cascade soft-delete tenant ${m.id}:`, mError.message);
        }
      }
    }
  }

  revalidatePath('/');
}
