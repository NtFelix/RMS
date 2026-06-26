export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { isOrgAdminOrOwner } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getPapierkorbEntriesAction, PapierkorbEntry } from "@/lib/papierkorb/actions";
import { TrashBinClient } from "@/components/trash-bin/trash-bin-client";

export default async function PapierkorbPage() {
  // Ensure user is authenticated
  await requireAuthenticatedUser();

  // Guard: Admin/Owner only
  const isAdmin = await isOrgAdminOrOwner();
  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Fetch trash bin entries
  let entries: PapierkorbEntry[] = [];
  try {
    entries = await getPapierkorbEntriesAction();
  } catch (error) {
    console.error("Error loading trash bin entries:", error);
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">Papierkorb</h2>
          <p className="text-muted-foreground">
            Gelöschte Elemente werden hier 30 Tage aufbewahrt, bevor sie endgültig gelöscht werden.
          </p>
        </div>
      </div>
      <TrashBinClient initialEntries={entries} />
    </div>
  );
}
