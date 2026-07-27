import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  beschreibung: z.string().optional(),
  icon: z.string().optional().nullable(),
  anweisungen: z.string().min(1).optional(),
  trigger: z.object({
    type: z.enum(['manual', 'cron', 'webhook', 'db_event']),
    config: z.record(z.any()).optional().default({}),
  }).optional(),
  aktionen: z.array(z.object({ type: z.string(), config: z.record(z.any()).optional().default({}) })).optional(),
  benachrichtigungs_kanaele: z.array(z.object({ type: z.string(), config: z.record(z.any()).optional().default({}) })).optional(),
  status: z.enum(['entwurf', 'aktiv', 'pausiert']).optional(),
  berechtigungen: z.object({
    module: z.record(z.array(z.string())).optional().default({}),
    objekte: z.object({ haeuser: z.array(z.string()).nullable().optional() }).optional().default({ haeuser: null }),
  }).optional(),
});

export async function GET(
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

    const { data, error } = await supabase.rpc('get_ki_agent_details', { p_agent_id: id });
    if (error) {
      console.error('[GET /api/agents/[id]] RPC error:', error);
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[GET /api/agents/[id]] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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

    const body = await req.json();
    const parsed = updateAgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.format() }, { status: 400 });
    }

    const { name, beschreibung, icon, anweisungen, trigger, aktionen, benachrichtigungs_kanaele, status, berechtigungen } = parsed.data;

    const { error: updateError } = await supabase.rpc('update_ki_agent', {
      p_agent_id: id,
      p_name: name ?? null,
      p_beschreibung: beschreibung ?? null,
      p_icon: icon ?? null,
      p_anweisungen: anweisungen ?? null,
      p_trigger: trigger ?? null,
      p_aktionen: aktionen ?? null,
      p_benachrichtigungs_kanaele: benachrichtigungs_kanaele ?? null,
      p_status: status ?? null,
    });

    if (updateError) {
      console.error('[PATCH /api/agents/[id]] RPC error:', updateError);
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
    }

    if (berechtigungen) {
      const { error: overrideError } = await supabase.rpc('set_agent_overrides', {
        p_agent_id: id,
        p_berechtigungen: berechtigungen,
      });

      if (overrideError) {
        console.error('[PATCH /api/agents/[id]] Failed to update agent overrides:', overrideError);
        return NextResponse.json({ error: 'Agent updated but permissions update failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[PATCH /api/agents/[id]] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    const { error } = await supabase.rpc('delete_ki_agent', { p_agent_id: id });
    if (error) {
      console.error('[DELETE /api/agents/[id]] RPC error:', error);
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/agents/[id]] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
