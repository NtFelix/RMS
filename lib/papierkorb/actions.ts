'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { ensureAuth } from '@/lib/auth-utils';
import { isOrgAdminOrOwner } from '@/lib/permissions';

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
  await ensureAuth();
  if (!(await isOrgAdminOrOwner())) {
    throw new Error('Zugriff verweigert.');
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_paperkorb_entries');
  if (error) {
    console.error('Error fetching paperkorb entries:', error);
    throw new Error(error.message);
  }
  return data as PapierkorbEntry[];
}

function revalidatePathsForTable(tableName: string) {
  if (tableName === 'Haeuser') {
    revalidatePath('/haeuser');
  } else if (tableName === 'Wohnungen') {
    revalidatePath('/wohnungen');
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
  }
  revalidatePath('/dashboard');
}

export async function restoreEntryAction(tableName: string, recordId: string): Promise<void> {
  await ensureAuth();
  if (!(await isOrgAdminOrOwner())) {
    throw new Error('Zugriff verweigert.');
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('restore_record', {
    p_table_name: tableName,
    p_record_id: recordId,
  });
  if (error) {
    console.error('Error restoring record %s from %s:', recordId, tableName, error);
    throw new Error(error.message);
  }
  revalidatePathsForTable(tableName);
}

export async function permanentlyDeleteEntryAction(tableName: string, recordId: string): Promise<void> {
  await ensureAuth();
  if (!(await isOrgAdminOrOwner())) {
    throw new Error('Zugriff verweigert.');
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('permanently_delete_record', {
    p_table_name: tableName,
    p_record_id: recordId,
  });
  if (error) {
    console.error('Error permanently deleting record %s from %s:', recordId, tableName, error);
    throw new Error(error.message);
  }
  revalidatePathsForTable(tableName);
}
