export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import OrganisationClientView from "./client-wrapper";
import { safeRpcCall } from "@/lib/error-handling";

export default async function OrganisationPage() {
  // Enforce permission and authenticate in parallel
  const [, { supabase, user }] = await Promise.all([
    requirePermission('organisation', 'ansehen'),
    requireAuthenticatedUser()
  ]);

  // Get active organization using safeRpcCall
  const orgIdResult = await safeRpcCall<string>(supabase, 'current_organisation_id', undefined, { userId: user.id });
  const orgId = orgIdResult.data;
  if (!orgIdResult.success || !orgId) {
    console.error("No organisation context found:", orgIdResult.message);
    redirect("/unauthorized");
  }

  // Fetch organisation details (to check ist_versteckt)
  const { data: org, error: orgError } = await supabase
    .from('Organisation')
    .select('id, owner_id, ist_versteckt, einstellungen')
    .eq('id', orgId)
    .single();

  if (orgError || !org || org.ist_versteckt) {
    console.error("Organisation is hidden or does not exist:", orgError);
    redirect("/unauthorized");
  }

  // Fetch members and open invitations in parallel
  const [membersResult, invitationsResult, canManage] = await Promise.all([
    safeRpcCall<any[]>(supabase, 'get_organisation_mitglieder', undefined, { userId: user.id }),
    supabase
      .from('Organisation_Einladungen')
      .select('*')
      .eq('organisation_id', orgId)
      .eq('status', 'offen')
      .order('erstellt_am', { ascending: false }),
    hasPermission('organisation', 'verwalten')
  ]);

  if (!membersResult.success) {
    console.error("Error loading members details:", membersResult.message);
  }

  if (invitationsResult.error) {
    console.error("Error loading invitations:", invitationsResult.error.message);
  }

  const members = membersResult.data ?? [];
  const invitations = invitationsResult.data ?? [];

  return (
    <OrganisationClientView
      org={org}
      initialMembers={members}
      initialInvitations={invitations}
      currentUser={user}
      canManage={canManage}
      rpcError={!membersResult.success ? (membersResult.message ?? 'Fehler beim Laden der Mitglieder') : null}
    />
  );
}
