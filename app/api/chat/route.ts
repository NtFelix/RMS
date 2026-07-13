import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, conversationId, orgId, agentMitgliedId, agentId } = body;

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

    // Forward request to internal engine (AI Service)
    const aiServiceUrl = process.env.AI_SERVICE_URL || `${new URL(req.url).origin}/api/chat/engine`;
    const aiServiceSecret = process.env.AI_SERVICE_AUTH_SECRET || 'local-ai-secret';

    const response = await fetch(aiServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Service-Auth': aiServiceSecret,
        'X-User-Id': user.id,
        'X-Org-Id': orgId,
        'X-User-Jwt': userJwt,
        ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify({ message, conversationId, agentMitgliedId, agentId }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new NextResponse(errText, { status: response.status });
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
