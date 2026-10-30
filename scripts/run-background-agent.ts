import { runAgent } from '../lib/agents/mietevo-agent';
import { sendNotifications } from '../lib/agents/notify';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const agentId = process.env.AGENT_ID;
  const runId = process.env.RUN_ID;

  if (!agentId || !runId) {
    throw new Error('AGENT_ID and RUN_ID environment variables are required');
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Load agent definition
  const { data: agent, error: agentError } = await supabase
    .from('KI_Agenten')
    .select('*')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    throw new Error(`Agent not found: ${agentError?.message || 'Unknown error'}`);
  }

  // 2. Update run status
  await supabase
    .from('KI_Runs')
    .update({ status: 'laufend', gestartet_am: new Date().toISOString() })
    .eq('id', runId);

  // 3. Set agent context
  await supabase.rpc('set_agent_context', {
    p_organisation_id: agent.organisation_id,
    p_agent_mitglied_id: agent.mitglied_id,
  });

  // 4. Run agent
  try {
    const result = await runAgent({
      runId,
      authMode: 'agent',
      orgId: agent.organisation_id,
      agentMitgliedId: agent.mitglied_id,
      agentId,
      userMessage: agent.anweisungen,
    });

    // 5. Persist result
    await supabase
      .from('KI_Runs')
      .update({
        status: 'abgeschlossen',
        beendet_am: new Date().toISOString(),
        ergebnis: result ? (typeof result === 'object' ? result : { result }) : { status: 'success' },
      })
      .eq('id', runId);

    // 6. Serve notify channels
    await sendNotifications(agent.benachrichtigungs_kanaele, {
      agentName: agent.name,
      result,
      runId,
    });
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    await supabase
      .from('KI_Runs')
      .update({
        status: 'fehler',
        beendet_am: new Date().toISOString(),
        fehler_meldung: errorMessage,
      })
      .eq('id', runId);

    await sendNotifications(agent.benachrichtigungs_kanaele, {
      agentName: agent.name,
      error: errorMessage,
      runId,
    });

    try {
      await supabase.rpc('set_agent_context', {
        p_organisation_id: null,
        p_agent_mitglied_id: null,
      });
    } catch {
      // Best-effort context reset
    }

    process.exit(1);
  }

  try {
    await supabase.rpc('set_agent_context', {
      p_organisation_id: null,
      p_agent_mitglied_id: null,
    });
  } catch {
    // Best-effort context reset
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[Background Agent] Execution failed:', err);
  process.exit(1);
});
