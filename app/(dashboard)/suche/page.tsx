import SucheClientWrapper from "./client-wrapper";
import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { requirePermission } from "@/lib/permissions";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function SuchePage() {
  await requireAuthenticatedUser();
  await requirePermission('organisation', 'ansehen');

  return <SucheClientWrapper />;
}
