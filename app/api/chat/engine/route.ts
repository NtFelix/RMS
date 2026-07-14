import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createSupabaseServiceClient, createSupabaseUserClient } from '@/lib/sandbox/runner';
import { runAgent } from '@/lib/agents/mietevo-agent';

export async function POST(req: NextRequest) {
  try {
    const authSecret = req.headers.get('X-AI-Service-Auth') || req.headers.get('x-ai-service-auth');
    const expectedSecret = process.env.AI_SERVICE_AUTH_SECRET || 'local-ai-secret';
    
    if (authSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid service secret' }, { status: 401 });
    }

    const userId = req.headers.get('X-User-Id') || req.headers.get('x-user-id');
    const orgId = req.headers.get('X-Org-Id') || req.headers.get('x-org-id');
    const userJwt = req.headers.get('X-User-Jwt') || req.headers.get('x-user-jwt');
    const idempotencyKey = req.headers.get('X-Idempotency-Key') || req.headers.get('x-idempotency-key');

    if (!userId || !orgId || !userJwt) {
      return NextResponse.json({ error: 'Missing auth metadata headers' }, { status: 400 });
    }

    const { message, conversationId, agentMitgliedId, agentId, model } = await req.json();

    // 1. Create a User JWT Supabase client to validate conversation scoping & perform RLS inserts
    const userJwtSupabase = createSupabaseUserClient(userJwt, orgId);

    // Validate conversation scoping
    if (conversationId) {
      const { data: conversation, error: convError } = await userJwtSupabase
        .from('KI_Konversationen')
        .select('id')
        .eq('id', conversationId)
        .eq('organisation_id', orgId)
        .is('geloescht_am', null)
        .single();

      if (convError || !conversation) {
        return NextResponse.json({ error: 'Forbidden: Conversation does not belong to this organization or does not exist' }, { status: 403 });
      }
    }

    // 2. Idempotency Check (Only return completed responses)
    if (idempotencyKey) {
      const supabase = createSupabaseServiceClient();
      const { data: existingMsg } = await supabase
        .from('KI_Nachrichten')
        .select('inhalt, status, konversation_id')
        .eq('client_nachricht_id', idempotencyKey)
        .eq('organisation_id', orgId)
        .maybeSingle(); // Use maybeSingle to avoid 406 errors on zero matches

      if (existingMsg) {
        if (existingMsg.status === 'abgeschlossen') {
          return NextResponse.json({
            text: existingMsg.inhalt,
            status: existingMsg.status,
            cached: true
          });
        }
        
        if (existingMsg.status === 'gesendet' || existingMsg.status === 'generiert') {
          return NextResponse.json({
            error: 'Generation already in progress',
            conversationId: existingMsg.konversation_id,
            status: existingMsg.status
          }, { status: 409 });
        }
      }
    }

    // 3. Persist user message (using RLS user client)
    const { data: userMsg, error: userMsgError } = await userJwtSupabase
      .from('KI_Nachrichten')
      .insert({
        konversation_id: conversationId,
        organisation_id: orgId,
        agent_id: agentId,
        rolle: 'user',
        inhalt: message,
        status: 'gesendet',
        client_nachricht_id: idempotencyKey || null,
        erstellt_von: userId
      })
      .select('id')
      .single();

    if (userMsgError) {
      return NextResponse.json({ error: `User message creation failed: ${userMsgError.message}` }, { status: 500 });
    }

    // 4. Create Assistant placeholder message (using RLS user client)
    const { data: assistantMsg, error: assistantMsgError } = await userJwtSupabase
      .from('KI_Nachrichten')
      .insert({
        konversation_id: conversationId,
        organisation_id: orgId,
        agent_id: agentId,
        rolle: 'assistant',
        inhalt: '',
        status: 'generiert',
        erstellt_von: userId
      })
      .select('id')
      .single();

    if (assistantMsgError) {
      return NextResponse.json({ error: `Assistant message placeholder creation failed: ${assistantMsgError.message}` }, { status: 500 });
    }

    // 5. Create Run tracking entry (using RLS user client)
    const { data: run, error: runError } = await userJwtSupabase
      .from('KI_Runs')
      .insert({
        konversation_id: conversationId,
        organisation_id: orgId,
        agent_id: agentId,
        nachricht_id: assistantMsg.id,
        auth_mode: 'user',
        status: 'in_warteschlange',
        ausfuehrungs_typ: 'waituntil',
        erstellt_von: userId
      })
      .select('id')
      .single();

    if (runError) {
      return NextResponse.json({ error: `Run registration failed: ${runError.message}` }, { status: 500 });
    }

    // Set run status to laufend (using RLS user client)
    await userJwtSupabase
      .from('KI_Runs')
      .update({ status: 'laufend', gestartet_am: new Date().toISOString() })
      .eq('id', run.id);

    // 6. Open JSON lines stream
    const encoder = new TextEncoder();
    let streamController: any = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
        // Emit thinking step start at stream beginning
        try {
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'step_start', stepType: 'thinking', label: 'Antwort generieren...' }) + '\n'));
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'step_done' }) + '\n'));
        } catch (e) {}
      }
    });

    const backgroundPromise = (async () => {
      try {
        let fullText = '';
        const result = await runAgent({
          runId: run.id,
          conversationId,
          messageId: assistantMsg.id,
          authMode: 'user',
          userId: userId,
          orgId,
          agentMitgliedId,
          agentId,
          userMessage: message,
          userJwt,
          model,
          onToken: (token) => {
            fullText += token;
            if (streamController) {
              try {
                // Emit text token in the exact JSON format expected by AIChatSidebar
                streamController.enqueue(encoder.encode(JSON.stringify({ type: 'content', content: token }) + '\n'));
              } catch (e) {}
            }
          }
        });

        // Update run status to abgeschlossen
        await userJwtSupabase
          .from('KI_Runs')
          .update({
            status: 'abgeschlossen',
            beendet_am: new Date().toISOString(),
            ergebnis: result
          })
          .eq('id', run.id);

        if (streamController) {
          try {
            // Emit final reply payload expected by the client to finalize state
            streamController.enqueue(encoder.encode(JSON.stringify({ type: 'final_reply', reply: fullText || result?.text || '' }) + '\n'));
            streamController.close();
          } catch (e) {}
        }
      } catch (runErr: any) {
        const errMsg = runErr instanceof Error ? runErr.message : String(runErr);
        await userJwtSupabase
          .from('KI_Runs')
          .update({
            status: 'fehler',
            beendet_am: new Date().toISOString(),
            fehler_meldung: errMsg
          })
          .eq('id', run.id);

        if (streamController) {
          try {
            streamController.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: errMsg }) + '\n'));
            streamController.close();
          } catch (e) {}
        }
      }
    })();

    waitUntil(backgroundPromise);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
