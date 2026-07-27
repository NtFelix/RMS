import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateTrigger } from '@/lib/agents/trigger';
import { checkAgentAccess, resolveMitgliedId } from '@/lib/agents/permissions';
import { type SupabaseClient } from '@supabase/supabase-js';
import { JobsClient } from '@google-cloud/run';

async function failRun(supabase: SupabaseClient, runId: string, message: string) {
  try {
    await supabase
      .from('KI_Runs')
      .update({ status: 'fehler', beendet_am: new Date().toISOString(), fehler_meldung: message })
      .eq('id', runId);
  } catch {
    // Best-effort cleanup
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get agent details
    const { data: agent, error: agentError } = await supabase.rpc('get_ki_agent_details', { p_agent_id: id });
    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.status !== 'aktiv') {
      return NextResponse.json({ error: 'Agent is not active' }, { status: 400 });
    }

    // 2. Validate trigger configuration
    const isValid = validateTrigger(agent.trigger, req);
    if (!isValid) {
      return NextResponse.json({ error: 'Trigger validation failed' }, { status: 403 });
    }

    // 3. Check caller has agent-level access (view or manage required to run)
    const callerMitgliedId = await resolveMitgliedId(supabase, user.id, agent.organisation_id);
    if (!callerMitgliedId) {
      return NextResponse.json({ error: 'Caller is not a member of this organisation' }, { status: 403 });
    }

    const hasAccess = await checkAgentAccess(supabase, id, callerMitgliedId, ['view', 'manage']);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions to run this agent' }, { status: 403 });
    }

    // 4. Create KI_Runs record in database
    const { data: runData, error: runError } = await supabase
      .from('KI_Runs')
      .insert({
        organisation_id: agent.organisation_id,
        agent_id: id,
        auth_mode: 'agent',
        status: 'in_warteschlange',
        ausfuehrungs_typ: 'cloud_run_job',
        gestartet_am: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (runError || !runData) {
      return NextResponse.json({ error: 'Failed to create run record' }, { status: 500 });
    }

    const runId = runData.id;

    // 5. Trigger Cloud Run Job if configured
    const jobName = process.env.CLOUD_RUN_JOB_NAME || 'mietevo-agent-runner';
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'europe-west1';

    if (project) {
      try {
        const runClient = new JobsClient();
        const parent = `projects/${project}/locations/${location}/jobs/${jobName}`;
        await runClient.runJob({
          name: parent,
          overrides: {
            containerOverrides: [
              {
                env: [
                  { name: 'AGENT_ID', value: id },
                  { name: 'RUN_ID', value: runId },
                ],
              },
            ],
          },
        });
      } catch (gcpError: any) {
        console.error('[Cloud Run Job Trigger] Failed to dispatch Cloud Run Job:', gcpError?.message);
        await failRun(supabase, runId, `Cloud Run dispatch failed: ${gcpError?.message || 'Unknown error'}`);
        return NextResponse.json({ error: 'Failed to dispatch agent job' }, { status: 502 });
      }
    }

    return NextResponse.json({ runId, status: 'in_warteschlange' }, { status: 202 });
  } catch (err: any) {
    console.error('[Agent Run] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
