import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateTrigger } from '@/lib/agents/trigger';
import { JobsClient } from '@google-cloud/run';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Get agent details
    const { data: agent, error: agentError } = await supabase.rpc('get_ki_agent_details', { p_agent_id: id });
    if (agentError || !agent) {
      return NextResponse.json({ error: agentError?.message || 'Agent not found' }, { status: 404 });
    }

    if (agent.status !== 'aktiv') {
      return NextResponse.json({ error: `Agent is not active (current status: ${agent.status})` }, { status: 400 });
    }

    // 2. Validate trigger configuration
    const isValid = validateTrigger(agent.trigger, req);
    if (!isValid) {
      return NextResponse.json({ error: 'Trigger validation failed' }, { status: 403 });
    }

    // 3. Create KI_Runs record in database
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
      return NextResponse.json({ error: runError?.message || 'Failed to create run record' }, { status: 500 });
    }

    const runId = runData.id;

    // 4. Trigger Cloud Run Job if configured
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
        console.warn('[Cloud Run Job Trigger] Failed to dispatch Cloud Run Job:', gcpError?.message);
      }
    }

    return NextResponse.json({ runId, status: 'in_warteschlange' }, { status: 202 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
