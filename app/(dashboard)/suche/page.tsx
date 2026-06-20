export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import SucheClientWrapper from "./client-wrapper";
import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { requirePermission } from "@/lib/permissions";

export default async function SuchePage() {
  await requireAuthenticatedUser();
  await requirePermission('organisation', 'ansehen');

  return <SucheClientWrapper />;
}
