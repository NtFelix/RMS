'use server';

import { createClient } from "@/utils/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { PolicyBerechtigungen, OrganisationPolicy } from "@/lib/organisation-types";

export async function getPoliciesAction(): Promise<OrganisationPolicy[]> {
  const supabase = await createClient();
  await requirePermission('organisation', 'ansehen');
  const { data, error } = await supabase.rpc('get_policies');
  if (error) {
    console.error("Error in get_policies RPC:", error);
    throw error;
  }
  return (data ?? []) as OrganisationPolicy[];
}

/** Fetches one policy when its detail panel is opened. RLS limits the row to the active organisation. */
export async function getPolicyAction(policyId: string): Promise<OrganisationPolicy | null> {
  const supabase = await createClient();
  await requirePermission('organisation', 'ansehen');

  const { data, error } = await supabase
    .from('Organisation_Policies')
    .select('id, organisation_id, name, berechtigungen, erstellt_am')
    .eq('id', policyId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching policy:", error);
    throw error;
  }

  return data as OrganisationPolicy | null;
}

export async function createPolicyAction(name: string, berechtigungen: PolicyBerechtigungen): Promise<OrganisationPolicy> {
  const supabase = await createClient();
  await requirePermission('organisation', 'verwalten');
  const { data, error } = await supabase.rpc('create_policy', {
    p_name: name,
    p_berechtigungen: berechtigungen,
  });
  if (error) {
    console.error("Error in create_policy RPC:", error);
    throw error;
  }
  revalidatePath('/organisation');
  return data as OrganisationPolicy;
}

export async function updatePolicyAction(
  policyId: string,
  name: string | null,
  berechtigungen: PolicyBerechtigungen | null
): Promise<OrganisationPolicy> {
  const supabase = await createClient();
  await requirePermission('organisation', 'verwalten');
  const { data, error } = await supabase.rpc('update_policy', {
    p_policy_id: policyId,
    p_name: name,
    p_berechtigungen: berechtigungen,
  });
  if (error) {
    console.error("Error in update_policy RPC:", error);
    throw error;
  }
  revalidatePath('/organisation');
  return data as OrganisationPolicy;
}

export async function deletePolicyAction(policyId: string): Promise<void> {
  const supabase = await createClient();
  await requirePermission('organisation', 'verwalten');
  const { error } = await supabase.rpc('delete_policy', { p_policy_id: policyId });
  if (error) {
    console.error("Error in delete_policy RPC:", error);
    throw error;
  }
  revalidatePath('/organisation');
}

export async function getMitgliedPoliciesAction(mitgliedId: string): Promise<string[]> {
  const supabase = await createClient();
  await requirePermission('organisation', 'ansehen');
  const { data, error } = await supabase.rpc('get_mitglied_policies', {
    p_mitglied_id: mitgliedId,
  });
  if (error) {
    console.error("Error fetching mitglied policies:", error);
    throw error;
  }
  return (data ?? []) as string[];
}

export async function updateMitgliedPoliciesAction(
  mitgliedId: string,
  toAssign: string[],
  toRemove: string[]
): Promise<void> {
  const supabase = await createClient();
  await requirePermission('organisation', 'verwalten');

  if (toAssign.length > 0) {
    const results = await Promise.all(
      toAssign.map(policyId =>
        supabase.rpc('assign_policy', {
          p_mitglied_id: mitgliedId,
          p_policy_id: policyId,
        })
      )
    );
    for (const { error } of results) {
      if (error) {
        console.error("Error in assign_policy RPC:", error);
        throw error;
      }
    }
  }

  if (toRemove.length > 0) {
    const results = await Promise.all(
      toRemove.map(policyId =>
        supabase.rpc('remove_policy', {
          p_mitglied_id: mitgliedId,
          p_policy_id: policyId,
        })
      )
    );
    for (const { error } of results) {
      if (error) {
        console.error("Error in remove_policy RPC:", error);
        throw error;
      }
    }
  }

  revalidatePath('/organisation');
}

