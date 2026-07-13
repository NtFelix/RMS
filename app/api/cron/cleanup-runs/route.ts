import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/sandbox/runner';

export async function GET(req: NextRequest) {
  return handleCleanup(req);
}

export async function POST(req: NextRequest) {
  return handleCleanup(req);
}

async function handleCleanup(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET environment variable is not set' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseServiceClient();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // 1. Fetch runs that are stuck in 'laufend' status for more than 10 minutes
    const { data: timedOutRuns, error: fetchError } = await supabase
      .from('KI_Agenten_Runs')
      .select('id, nachricht_id')
      .eq('status', 'laufend')
      .lt('gestartet_am', tenMinutesAgo);

    if (fetchError) {
      return NextResponse.json({ error: `Fetch error: ${fetchError.message}` }, { status: 500 });
    }

    if (!timedOutRuns || timedOutRuns.length === 0) {
      return NextResponse.json({ message: 'No timed out runs found.' });
    }

    const runIds: string[] = [];
    const messageIds: string[] = [];

    for (const r of timedOutRuns) {
      runIds.push(r.id);
      if (r.nachricht_id) {
        messageIds.push(r.nachricht_id);
      }
    }

    // 2. Mark runs as 'zeitueberschreitung'
    const { error: updateRunsError } = await supabase
      .from('KI_Agenten_Runs')
      .update({
        status: 'zeitueberschreitung',
        beendet_am: new Date().toISOString(),
        fehler_meldung: 'Run timed out (exceeded 10 minutes limit)',
      })
      .in('id', runIds);

    if (updateRunsError) {
      return NextResponse.json({ error: `Update runs error: ${updateRunsError.message}` }, { status: 500 });
    }

    // 3. Mark the corresponding generated messages as 'fehler'
    if (messageIds.length > 0) {
      const { error: updateMessagesError } = await supabase
        .from('KI_Agenten_Nachrichten')
        .update({
          status: 'fehler',
          fehler_meldung: 'Run timed out (exceeded 10 minutes limit)',
        })
        .in('id', messageIds);

      if (updateMessagesError) {
        return NextResponse.json({ error: `Update messages error: ${updateMessagesError.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({
      message: 'Successfully cleaned up timed out runs.',
      cleaned_runs_count: runIds.length,
      cleaned_messages_count: messageIds.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
