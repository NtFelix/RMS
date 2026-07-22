import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; mitgliedId: string }> }
) {
  try {
    const { id: agentId, mitgliedId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try deleting by zugriffsrecht_id directly
    const { error: directError } = await supabase.rpc('delete_ki_agent_zugriffsrechte', {
      p_zugriffsrecht_id: mitgliedId,
    });

    if (!directError) {
      return NextResponse.json({ success: true });
    }

    // Otherwise, find the access right ID by (agent_id, mitglied_id)
    const { data: accessRight, error: findError } = await supabase
      .from('KI_Agenten_Zugriffsrechte')
      .select('id')
      .eq('agent_id', agentId)
      .eq('mitglied_id', mitgliedId)
      .is('geloescht_am', null)
      .single();

    if (findError || !accessRight) {
      return NextResponse.json({ error: 'Access right not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase.rpc('delete_ki_agent_zugriffsrechte', {
      p_zugriffsrecht_id: accessRight.id,
    });

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
