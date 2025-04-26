"use server";

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import HaeuserClientWrapper from "./client-wrapper"

export async function handleSubmit(formData: FormData) {
  const supabase = await createClient();
  const values = Object.fromEntries(formData.entries());
  const id = formData.get('id');
  if (id) await supabase.from('Haeuser').update(values).eq('id', id);
  else await supabase.from('Haeuser').insert(values);
  revalidatePath('/haeuser');
}

export default async function HaeuserPage() {
  const supabase = await createClient();
  const { data: haeuserData } = await supabase.from('Haeuser').select('*');
  const haeuser: any[] = haeuserData ?? [];
  return <HaeuserClientWrapper haeuser={haeuser} serverAction={handleSubmit} />;
}
