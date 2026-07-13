import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createClient } from '@/utils/supabase/server';
import { createSupabaseServiceClient, createSupabaseUserClient } from '@/lib/sandbox/runner';
import { runAgent } from '@/lib/agents/mietevo-agent';

export async function POST(req: NextRequest) {
  try {
    const { message, conversationId, orgId, agentMitgliedId, agentId } = await req.json();

    const idempotencyKey = req.headers.get('x-idempotency-key') || req.headers.get('X-Idempotency-Key');
    
    // 1. Authenticate user session
    const userSupabase = await createClient();
    const { data: { session }, error: authError } = await userSupabase.auth.getSession();
    
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user;
    const userJwt = session.access_token;

    // 2. Validate tenant access (user must belong to the specified organization)
    const { data: membership, error: membershipError } = await userSupabase
      .from('Organisation_Mitglieder')
      .select('id, rolle')
      .eq('organisation_id', orgId)
      .eq('user_id', user.id)
      .is('geloescht_am', null)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this organization' }, { status: 403 });
    }

    // 3. Validate conversation scoping (conversation must belong to the organization)
    if (conversationId) {
      const { data: conversation, error: convError } = await userSupabase
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

    // 4. Validate agent membership (if agentMitgliedId is provided)
    if (agentMitgliedId) {
      const { data: agentMembership, error: agentMembershipError } = await userSupabase
        .from('Organisation_Mitglieder')
        .select('id')
        .eq('id', agentMitgliedId)
        .eq('organisation_id', orgId)
        .eq('rolle', 'agent')
        .single();

      if (agentMembershipError || !agentMembership) {
        return NextResponse.json({ error: 'Forbidden: Invalid agent membership' }, { status: 403 });
      }
    }

    // 5. Idempotency Check (Only return completed responses)
    if (idempotencyKey) {
      // Use service client for safe metadata check
      const supabase = createSupabaseServiceClient();
      const { data: existingMsg } = await supabase
        .from('KI_Agenten_Nachrichten')
        .select('inhalt, status')
        .eq('client_nachricht_id', idempotencyKey)
        .eq('organisation_id', orgId)
        .single();

      if (existingMsg && existingMsg.status === 'abgeschlossen') {
        return NextResponse.json({
          text: existingMsg.inhalt,
          status: existingMsg.status,
          cached: true
        });
      }
    }

    // 6. Persist user message (using RLS user client)
    const { data: userMsg, error: userMsgError } = await userSupabase
      .from('KI_Agenten_Nachrichten')
      .insert({
        konversation_id: conversationId,
        organisation_id: orgId,
        agent_id: agentId,
        rolle: 'user',
        inhalt: message,
        status: 'gesendet',
        client_nachricht_id: idempotencyKey || null,
        erstellt_von: user.id
      })
      .select('id')
      .single();

    if (userMsgError) {
      return NextResponse.json({ error: `User message creation failed: ${userMsgError.message}` }, { status: 500 });
    }

    // 7. Create Assistant placeholder message (using RLS user client)
    const { data: assistantMsg, error: assistantMsgError } = await userSupabase
      .from('KI_Agenten_Nachrichten')
      .insert({
        konversation_id: conversationId,
        organisation_id: orgId,
        agent_id: agentId,
        rolle: 'assistant',
        inhalt: '',
        status: 'generiert',
        erstellt_von: user.id
      })
      .select('id')
      .single();

    if (assistantMsgError) {
      return NextResponse.json({ error: `Assistant message placeholder creation failed: ${assistantMsgError.message}` }, { status: 500 });
    }

    // 8. Create Run tracking entry (using RLS user client)
    const { data: run, error: runError } = await userSupabase
      .from('KI_Agenten_Runs')
      .insert({
        konversation_id: conversationId,
        organisation_id: orgId,
        agent_id: agentId,
        nachricht_id: assistantMsg.id,
        auth_mode: 'user',
        status: 'in_warteschlange',
        ausfuehrungs_typ: 'waituntil',
        erstellt_von: user.id
      })
      .select('id')
      .single();

    if (runError) {
      return NextResponse.json({ error: `Run registration failed: ${runError.message}` }, { status: 500 });
    }

    // Set run status to laufend (using RLS user client)
    await userSupabase
      .from('KI_Agenten_Runs')
      .update({ status: 'laufend', gestartet_am: new Date().toISOString() })
      .eq('id', run.id);

    // 9. Open SSE Stream to client
    const encoder = new TextEncoder();
    let streamController: any = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
      }
    });

    // 10. Define background runner via waitUntil
    const backgroundPromise = (async () => {
      // Create user RLS client for background updates
      const userJwtSupabase = createSupabaseUserClient(userJwt);
      try {
        const result = await runAgent({
          runId: run.id,
          conversationId,
          messageId: assistantMsg.id,
          authMode: 'user',
          userId: user.id,
          orgId,
          agentMitgliedId,
          agentId,
          userMessage: message, // Explicitly pass the current user message to prevent race conditions
          userJwt, // Enforce RLS in DB queries
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

        // Update run status to abgeschlossen (using user RLS client)
        await userJwtSupabase
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
        // Update run status to fehler (using user RLS client)
        await userJwtSupabase
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
