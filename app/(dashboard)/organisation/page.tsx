export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import OrganisationClientView from "./client-wrapper";

export default async function OrganisationPage() {
  // Enforce permission for viewing organisation page
  await requirePermission('organisation', 'ansehen');

  const { supabase, user } = await requireAuthenticatedUser();

  // Get active organization
  const { data: orgId, error: orgIdError } = await supabase.rpc('current_organisation_id');
  if (orgIdError || !orgId) {
    console.error("No organisation context found:", orgIdError);
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
    supabase.rpc('get_organisation_mitglieder'),
    supabase
      .from('Organisation_Einladungen')
      .select('*')
      .eq('organisation_id', orgId)
      .eq('status', 'offen')
      .order('erstellt_am', { ascending: false }),
    hasPermission('organisation', 'verwalten')
  ]);

  if (membersResult.error) {
    console.error("Error loading members details:", {
      message: membersResult.error.message,
      code: membersResult.error.code,
      details: membersResult.error.details,
      hint: membersResult.error.hint
    });
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
      rpcError={membersResult.error ? membersResult.error.message : null}
    />
  );
}
