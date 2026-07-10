export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import OrganisationClientView from "./client-wrapper";
import { safeRpcCall } from "@/lib/error-handling";

export default async function OrganisationPage() {
  // Get authenticated user first
  const { supabase, user } = await requireAuthenticatedUser();

  // Fetch active organization — any active member has read access
  const { data: orgId, success } = await safeRpcCall<string>(supabase, 'current_organisation_id', undefined, { userId: user.id });
  if (!success || !orgId) {
    console.error("No organisation context found");
    redirect("/unauthorized");
  }

  // Fetch organisation details and personal organisation in parallel
  const [{ data: org, error: orgError }, { data: personalOrg }] = await Promise.all([
    supabase
      .from('Organisation')
      .select('id, owner_id, ist_versteckt, einstellungen')
      .eq('id', orgId)
      .single(),
    supabase
      .from('Organisation')
      .select('id')
      .eq('owner_id', user.id)
      .eq('ist_versteckt', true)
      .order('erstellt_am', { ascending: true })
      .limit(1)
      .maybeSingle()
  ]);

  const personalOrgId = personalOrg?.id ?? null;

  if (orgError || !org || org.id === personalOrgId) {
    console.error("Organisation is hidden or does not exist:", orgError);
    redirect("/unauthorized");
  }

  // Fetch members, invitations, policies, and houses in parallel
  const [membersResult, invitationsResult, policiesResult, housesResult, canManage] = await Promise.all([
    safeRpcCall<any[]>(supabase, 'get_organisation_mitglieder', undefined, { userId: user.id }),
    supabase
      .from('Organisation_Einladungen')
      .select('*')
      .eq('organisation_id', orgId)
      .eq('status', 'offen')
      .order('erstellt_am', { ascending: false }),
    safeRpcCall<any[]>(supabase, 'get_policies'),
    safeRpcCall<any[]>(supabase, 'get_org_haeuser_mit_wohnungen'),
    hasPermission('organisation', 'verwalten')
  ]);

  if (!membersResult.success) {
    console.error("Error loading members details:", membersResult.message);
  }

  if (invitationsResult.error) {
    console.error("Error loading invitations:", invitationsResult.error.message);
  }

  if (!policiesResult.success) {
    console.error("Error loading policies:", policiesResult.message);
  }

  if (!housesResult.success) {
    console.error("Error loading houses:", housesResult.message);
  }

  const members = membersResult.data ?? [];
  const invitations = invitationsResult.data ?? [];
  const initialPolicies = policiesResult.data ?? [];
  const initialHaeuser = housesResult.data ?? [];

  return (
    <OrganisationClientView
      org={org}
      initialMembers={members}
      initialInvitations={invitations}
      initialPolicies={initialPolicies}
      initialHaeuser={initialHaeuser}
      currentUser={user}
      canManage={canManage}
      rpcError={!membersResult.success ? (membersResult.message ?? 'Fehler beim Laden der Mitglieder') : null}
    />
  );
}
