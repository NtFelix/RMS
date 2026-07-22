import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const createAgentSchema = z.object({
  name: z.string().min(1),
  beschreibung: z.string().optional().default(''),
  icon: z.string().optional().nullable(),
  anweisungen: z.string().min(1),
  trigger: z.object({
    type: z.enum(['manual', 'cron', 'webhook', 'db_event']),
    config: z.record(z.any()).optional().default({}),
  }),
  aktionen: z.array(z.object({ type: z.string(), config: z.record(z.any()).optional().default({}) })).optional().default([]),
  benachrichtigungs_kanaele: z.array(z.object({ type: z.string(), config: z.record(z.any()).optional().default({}) })).optional().default([]),
  berechtigungen: z.object({
    module: z.record(z.array(z.string())).optional().default({}),
    objekte: z.object({ haeuser: z.array(z.string()).nullable().optional() }).optional().default({ haeuser: null }),
  }).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase.rpc('get_ki_agenten');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createAgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.format() }, { status: 400 });
    }

    const { name, beschreibung, icon, anweisungen, trigger, aktionen, benachrichtigungs_kanaele, berechtigungen } = parsed.data;

    const { data: agentId, error: createError } = await supabase.rpc('create_ki_agent', {
      p_name: name,
      p_beschreibung: beschreibung,
      p_icon: icon || null,
      p_anweisungen: anweisungen,
      p_trigger: trigger,
      p_aktionen: aktionen,
      p_benachrichtigungs_kanaele: benachrichtigungs_kanaele,
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    if (berechtigungen) {
      const { error: overrideError } = await supabase.rpc('set_agent_overrides', {
        p_agent_id: agentId,
        p_berechtigungen: berechtigungen,
      });

      if (overrideError) {
        console.error('Failed to set agent overrides:', overrideError.message);
      }
    }

    return NextResponse.json({ id: agentId }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
