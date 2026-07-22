export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import TodosClientWrapper from "./client-wrapper";
import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { requirePermission, hasPermission } from "@/lib/permissions";

export default async function TodosPage() {
  const { supabase } = await requireAuthenticatedUser();
  
  const [_, canCreate, canEdit, canDelete, { data: tasksData }] = await Promise.all([
    requirePermission('aufgaben', 'ansehen'),
    hasPermission('aufgaben', 'erstellen'),
    hasPermission('aufgaben', 'bearbeiten'),
    hasPermission('aufgaben', 'loeschen'),
    supabase.from('Aufgaben').select('*')
  ]);
  
  const tasks = tasksData ?? [];

  return <TodosClientWrapper tasks={tasks} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />;
}
