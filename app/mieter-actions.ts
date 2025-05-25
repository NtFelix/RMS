"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function handleSubmit(formData: FormData): Promise<{ success: boolean; error?: { message: string } }> {
  const supabase = await createClient();
  const payload: any = {
    wohnung_id: formData.get('wohnung_id') || null,
    name: formData.get('name'),
    einzug: formData.get('einzug') || null,
    auszug: formData.get('auszug') || null,
    email: formData.get('email') || null,
    telefonnummer: formData.get('telefonnummer') || null,
    notiz: formData.get('notiz') || null,
    nebenkosten: formData.get('nebenkosten') ? String(formData.get('nebenkosten')).split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)) : null,
    nebenkosten_datum: formData.get('nebenkosten_datum') ? String(formData.get('nebenkosten_datum')).split(',').map(s => s.trim()).filter(Boolean) : null
  };
  const id = formData.get('id');

  try {
    if (id) {
      const { error } = await supabase.from('Mieter').update(payload).eq('id', id as string);
      if (error) {
        return { success: false, error: { message: error.message } };
      }
    } else {
      const { error } = await supabase.from('Mieter').insert(payload);
      if (error) {
        return { success: false, error: { message: error.message } };
      }
    }
    revalidatePath('/mieter');
    return { success: true };
  } catch (e) {
    return { success: false, error: { message: (e as Error).message } };
  }
}
