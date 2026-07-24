import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    const { data, error } = await supabase.rpc('get_ki_agent_run_details', { p_run_id: id });
    if (error) {
      console.error('[GET /api/agents/runs/[id]] RPC error:', error);
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[GET /api/agents/runs/[id]] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
