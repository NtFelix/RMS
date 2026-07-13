import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createSupabaseServiceClient } from '@/lib/sandbox/runner';
import { runAgent } from '@/lib/agents/mietevo-agent';

export async function POST(req: NextRequest) {
  try {
    const { message, conversationId, userId, orgId, agentMitgliedId, agentId } = await req.json();

    const idempotencyKey = req.headers.get('x-idempotency-key') || req.headers.get('X-Idempotency-Key');
    
    const supabase = createSupabaseServiceClient();

    // 1. Idempotency Check
    if (idempotencyKey) {
      const { data: existingMsg } = await supabase
        .from('KI_Agenten_Nachrichten')
        .select('inhalt, status')
        .eq('client_nachricht_id', idempotencyKey)
        .eq('organisation_id', orgId)
        .single();

      if (existingMsg) {
        return NextResponse.json({
          text: existingMsg.inhalt,
          status: existingMsg.status,
          cached: true
        });
      }
    }

    // 2. Persist user message
    const { data: userMsg, error: userMsgError } = await supabase
      .from('KI_Agenten_Nachrichten')
      .insert({
        konversation_id: conversationId,
        organisation_id: orgId,
        agent_id: agentId,
        rolle: 'user',
        inhalt: message,
        status: 'gesendet',
        client_nachricht_id: idempotencyKey || null,
        erstellt_von: userId || null
      })
      .select('id')
      .single();

    if (userMsgError) {
      return NextResponse.json({ error: `User message creation failed: ${userMsgError.message}` }, { status: 500 });
    }

    // 3. Create Assistant placeholder message
    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from('KI_Agenten_Nachrichten')
      .insert({
        konversation_id: conversationId,
        organisation_id: orgId,
        agent_id: agentId,
        rolle: 'assistant',
        inhalt: '',
        status: 'generiert',
        erstellt_von: userId || null
      })
      .select('id')
      .single();

    if (assistantMsgError) {
      return NextResponse.json({ error: `Assistant message placeholder creation failed: ${assistantMsgError.message}` }, { status: 500 });
    }

    // 4. Create Run tracking entry
    const { data: run, error: runError } = await supabase
      .from('KI_Agenten_Runs')
      .insert({
        konversation_id: conversationId,
        organisation_id: orgId,
        agent_id: agentId,
        nachricht_id: assistantMsg.id,
        auth_mode: 'user',
        status: 'in_warteschlange',
        ausfuehrungs_typ: 'waituntil',
        erstellt_von: userId || null
      })
      .select('id')
      .single();

    if (runError) {
      return NextResponse.json({ error: `Run registration failed: ${runError.message}` }, { status: 500 });
    }

    // Set run status to laufend
    await supabase
      .from('KI_Agenten_Runs')
      .update({ status: 'laufend', gestartet_am: new Date().toISOString() })
      .eq('id', run.id);

    // 5. Open SSE Stream to client
    const encoder = new TextEncoder();
    let streamController: any = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
      }
    });

    // 6. Define background runner via waitUntil to keep execution alive even if SSE aborts
    const backgroundPromise = (async () => {
      try {
        const result = await runAgent({
          runId: run.id,
          conversationId,
          messageId: assistantMsg.id,
          authMode: 'user',
          userId,
          orgId,
          agentMitgliedId,
          agentId,
          onToken: (token) => {
            if (streamController) {
              try {
                // Send SSE data format
                streamController.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
              } catch (e) {
                // Controller might be closed if client disconnected
              }
            }
          }
        });

        // Update run status to abgeschlossen
        await supabase
          .from('KI_Agenten_Runs')
          .update({
            status: 'abgeschlossen',
            beendet_am: new Date().toISOString(),
            ergebnis: result
          })
          .eq('id', run.id);

        if (streamController) {
          try {
            streamController.enqueue(encoder.encode('data: [DONE]\n\n'));
            streamController.close();
          } catch (e) {}
        }
      } catch (runErr: any) {
        const errMsg = runErr instanceof Error ? runErr.message : String(runErr);
        // Update run status to fehler
        await supabase
          .from('KI_Agenten_Runs')
          .update({
            status: 'fehler',
            beendet_am: new Date().toISOString(),
            fehler_meldung: errMsg
          })
          .eq('id', run.id);

        if (streamController) {
          try {
            streamController.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
            streamController.close();
          } catch (e) {}
        }
      }
    })();

    waitUntil(backgroundPromise);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
