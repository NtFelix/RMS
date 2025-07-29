export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import TodosClientWrapper from "./client-wrapper";
import { createSupabaseServerClient as createClient } from "@/lib/supabase-server";

export default async function TodosPage() {
  const supabase = await createClient();
  const { data: tasksData } = await supabase.from('Aufgaben').select('*');
  const tasks = tasksData ?? [];

  return <TodosClientWrapper tasks={tasks} />;
}
