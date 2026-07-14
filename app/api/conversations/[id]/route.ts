import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getSupabaseService() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseService = getSupabaseService();

    // Read organization ID via service role client to bypass RLS SELECT constraints
    const { data: convMeta, error: metaError } = await supabaseService
      .from('KI_Konversationen')
      .select('organisation_id')
      .eq('id', id)
      .is('geloescht_am', null)
      .single();

    if (metaError || !convMeta) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Instantiate client with organization ID
    const userSupabase = await createClient(convMeta.organisation_id);

    const { data: conversation, error: convError } = await userSupabase
      .from('KI_Konversationen')
      .select('*')
      .eq('id', id)
      .is('geloescht_am', null)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    const { data: messages, error: messagesError } = await userSupabase
      .from('KI_Nachrichten')
      .select('*')
      .eq('konversation_id', id)
      .is('geloescht_am', null)
      .order('erstellt_am', { ascending: true });

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    return NextResponse.json({
      conversation,
      messages: messages || []
    });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseService = getSupabaseService();

    // Read organization ID via service role client to bypass RLS SELECT constraints
    const { data: convMeta, error: metaError } = await supabaseService
      .from('KI_Konversationen')
      .select('organisation_id')
      .eq('id', id)
      .is('geloescht_am', null)
      .single();

    if (metaError || !convMeta) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Instantiate client with organization ID
    const userSupabase = await createClient(convMeta.organisation_id);

    const { data: conversation, error: convError } = await userSupabase
      .from('KI_Konversationen')
      .select('*')
      .eq('id', id)
      .is('geloescht_am', null)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    // Reactivate if archived in bucket
    if (conversation.storage_status === 'bucket' && conversation.storage_pfad) {
      const { data: fileData, error: downloadError } = await userSupabase.storage
        .from('documents')
        .download(conversation.storage_pfad);

      if (!downloadError && fileData) {
        try {
          const messagesJson = JSON.parse(await fileData.text());
          if (Array.isArray(messagesJson) && messagesJson.length > 0) {
            await userSupabase.from('KI_Nachrichten').insert(
              messagesJson.map(m => ({
                ...m,
                konversation_id: id,
                organisation_id: conversation.organisation_id
              }))
            );
          }
          await userSupabase
            .from('KI_Konversationen')
            .update({ storage_status: 'db', storage_pfad: null })
            .eq('id', id);
        } catch (parseErr) {
          console.error('[conversations] Failed to parse bucket messages:', parseErr);
        }
      }
    }

    // Touch letzter_zugriff
    await userSupabase
      .from('KI_Konversationen')
      .update({ letzter_zugriff: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseService = getSupabaseService();

    // Read organization ID via service role client to bypass RLS SELECT constraints
    const { data: convMeta, error: metaError } = await supabaseService
      .from('KI_Konversationen')
      .select('organisation_id')
      .eq('id', id)
      .is('geloescht_am', null)
      .single();

    if (metaError || !convMeta) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Instantiate client with organization ID
    const userSupabase = await createClient(convMeta.organisation_id);

    const { titel, status } = await req.json();
    const updateData: Record<string, any> = {};

    if (titel !== undefined) updateData.titel = titel;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'archiviert') {
        updateData.archiviert_am = new Date().toISOString();
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await userSupabase
      .from('KI_Konversationen')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    const message = err instanceof Error ? err.message : (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseService = getSupabaseService();

    // Read organization ID via service role client to bypass RLS SELECT constraints
    const { data: convMeta, error: metaError } = await supabaseService
      .from('KI_Konversationen')
      .select('organisation_id')
      .eq('id', id)
      .is('geloescht_am', null)
      .single();

    if (metaError || !convMeta) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Instantiate client with organization ID
    const userSupabase = await createClient(convMeta.organisation_id);

    // Perform soft-delete
    const { error } = await userSupabase
      .from('KI_Konversationen')
      .update({
        geloescht_am: new Date().toISOString(),
        geloescht_von: user.id,
        status: 'geloescht'
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
