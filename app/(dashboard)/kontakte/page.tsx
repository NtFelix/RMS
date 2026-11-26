// Server Component: Rechteprüfung auf dem Server. Das Feature-Flag `kontakte-seite` wird erst im Client ausgewertet
// (UX, keine Sicherheitsgrenze).

import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { hasPermission } from "@/lib/permissions";
import { ladeKontakteAction } from "@/app/kontakte-actions";
import KontakteClientView from "./client-wrapper";

export default async function KontaktePage() {
  await requireAuthenticatedUser();

  const [canView, canCreate, canEdit, canDelete] = await Promise.all([
    hasPermission("kontakte", "ansehen"),
    hasPermission("kontakte", "erstellen"),
    hasPermission("kontakte", "bearbeiten"),
    hasPermission("kontakte", "loeschen"),
  ]);
  if (!canView) {
    redirect("/unauthorized");
  }

  const ergebnis = await ladeKontakteAction();

  return (
    <KontakteClientView
      initialKontakte={ergebnis.success ? (ergebnis.data ?? []) : []}
      ladeFehler={ergebnis.success ? null : ergebnis.error}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
