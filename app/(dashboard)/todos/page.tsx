export const dynamic = 'force-dynamic';

import TodosClientWrapper from "./client-wrapper";
import { createClient } from "@/utils/supabase/server";

export default async function TodosPage() {
  const supabase = await createClient();
  const { data: tasksData } = await supabase.from('aufgaben').select('*');
  const tasks = tasksData ?? [];

  return <TodosClientWrapper tasks={tasks} />;
}
