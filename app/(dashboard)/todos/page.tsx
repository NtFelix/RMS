export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import TodosClientWrapper from "./client-wrapper";
import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { requirePermission, hasPermission } from "@/lib/permissions";

export default async function TodosPage() {
  const { supabase } = await requireAuthenticatedUser();
  await requirePermission('aufgaben', 'ansehen');
  const canCreate = await hasPermission('aufgaben', 'erstellen');
  const { data: tasksData } = await supabase.from('Aufgaben').select('*');
  const tasks = tasksData ?? [];

  return <TodosClientWrapper tasks={tasks} canCreate={canCreate} />;
}
