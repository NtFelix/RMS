import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import pako from 'pako';

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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RLS on KI_Konversationen SELECT checks Organisation_Mitglieder membership directly
    // (no cookie dependency — see 20260714000003_ki_realtime_setup.sql)
    const { data: conversation, error: convError } = await supabase
      .from('KI_Konversationen')
      .select('*')
      .eq('id', id)
      .is('geloescht_am', null)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    // Org-scoped client for KI_Nachrichten queries (RLS uses current_organisation_id for I/U/D)
    const orgSupabase = await createClient(conversation.organisation_id);

    const { data: messages, error: messagesError } = await orgSupabase
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

    // Look up org_id via service role (minimal — only organisation_id, no sensitive data)
    const supabaseService = getSupabaseService();
    const { data: convMeta, error: metaError } = await supabaseService
      .from('KI_Konversationen')
      .select('organisation_id')
      .eq('id', id)
      .is('geloescht_am', null)
      .single();

    if (metaError || !convMeta) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify the authenticated user is an active member of the conversation's org
    const { data: membership, error: membershipError } = await supabaseService
      .from('Organisation_Mitglieder')
      .select('id')
      .eq('organisation_id', convMeta.organisation_id)
      .eq('user_id', user.id)
      .eq('status', 'aktiv')
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Single org-scoped client for all subsequent operations
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
        .from('ki-nachrichten')
        .download(conversation.storage_pfad);

      if (downloadError || !fileData) {
        return NextResponse.json({ error: 'Failed to download archived conversation' }, { status: 500 });
      }

      try {
        const uint8Array = new Uint8Array(await fileData.arrayBuffer());
        const decompressed = pako.ungzip(uint8Array, { to: 'string' });
        const archive = JSON.parse(decompressed);

        if (archive && Array.isArray(archive.nachrichten) && archive.nachrichten.length > 0) {
          const restoredMessages = archive.nachrichten.map((m: Record<string, unknown>) => ({
            ...m,
            konversation_id: id,
            organisation_id: conversation.organisation_id
          }));

          // Remove soft-deleted rows first to avoid PK conflicts
          const archivedIds = restoredMessages.map((m: any) => m.id).filter(Boolean);
          if (archivedIds.length > 0) {
            await userSupabase
              .from('KI_Nachrichten')
              .delete()
              .in('id', archivedIds);
          }

          const { error: insertError } = await userSupabase
            .from('KI_Nachrichten')
            .insert(restoredMessages);

          if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
          }
        }

        const { error: updateError } = await userSupabase
          .from('KI_Konversationen')
          .update({ storage_status: 'db', storage_pfad: null, status: 'aktiv' })
          .eq('id', id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Clean up archive from bucket after successful restore
        await userSupabase.storage
          .from('ki-nachrichten')
          .remove([conversation.storage_pfad]);
      } catch (parseErr) {
        console.error('[conversations] Failed to parse archived messages:', parseErr);
        return NextResponse.json({ error: 'Failed to parse archived conversation data' }, { status: 500 });
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

    // Look up org_id via service role + verify membership
    const supabaseService = getSupabaseService();
    const { data: convMeta, error: metaError } = await supabaseService
      .from('KI_Konversationen')
      .select('organisation_id')
      .eq('id', id)
      .is('geloescht_am', null)
      .single();

    if (metaError || !convMeta) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: membership, error: membershipError } = await supabaseService
      .from('Organisation_Mitglieder')
      .select('id')
      .eq('organisation_id', convMeta.organisation_id)
      .eq('user_id', user.id)
      .eq('status', 'aktiv')
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Single org-scoped client for all operations
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

    const { titel, status } = await req.json();
    const updateData: Record<string, any> = {};

    if (titel !== undefined) updateData.titel = titel;
    if (status !== undefined) {
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Unarchive: restore messages from bucket to DB
    if (status === 'aktiv' && conversation.storage_status === 'bucket' && conversation.storage_pfad) {
      const { data: fileData, error: downloadError } = await userSupabase.storage
        .from('ki-nachrichten')
        .download(conversation.storage_pfad);

      if (downloadError || !fileData) {
        return NextResponse.json({ error: 'Failed to download archived conversation' }, { status: 500 });
      }

      try {
        const uint8Array = new Uint8Array(await fileData.arrayBuffer());
        const decompressed = pako.ungzip(uint8Array, { to: 'string' });
        const archive = JSON.parse(decompressed);

        if (archive && Array.isArray(archive.nachrichten) && archive.nachrichten.length > 0) {
          const restoredMessages = archive.nachrichten.map((m: Record<string, unknown>) => ({
            ...m,
            konversation_id: id,
            organisation_id: conversation.organisation_id,
          }));

          // Remove soft-deleted rows first to avoid PK conflicts with upsert
          const archivedIds = restoredMessages.map((m: any) => m.id).filter(Boolean);
          if (archivedIds.length > 0) {
            await userSupabase
              .from('KI_Nachrichten')
              .delete()
              .in('id', archivedIds);
          }

          const { error: insertError } = await userSupabase
            .from('KI_Nachrichten')
            .insert(restoredMessages);

          if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
          }
        }

        updateData.storage_status = 'db';
        updateData.storage_pfad = null;
        updateData.status = 'aktiv';

        const { data: updatedConv, error: updateError } = await userSupabase
          .from('KI_Konversationen')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Clean up archive from bucket after successful restore
        await userSupabase.storage
          .from('ki-nachrichten')
          .remove([conversation.storage_pfad]);

        return NextResponse.json(updatedConv);
      } catch (parseErr) {
        console.error('[conversations] Failed to parse archived messages:', parseErr);
        return NextResponse.json({ error: 'Failed to parse archived conversation data' }, { status: 500 });
      }
    }

    // Archive: move messages from DB to bucket
    if (status === 'archiviert') {
      if (conversation.storage_status === 'bucket') {
        return NextResponse.json({ error: 'Conversation is already archived' }, { status: 409 });
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

      // Build archive payload
      const totalTokens = messages?.reduce((sum: number, m: any) => sum + (m.token_anzahl || 0), 0) || 0;
      const archive = {
        konversation_id: id,
        nachrichten: messages || [],
        metadaten: {
          token_gesamt: totalTokens,
          agent_id: conversation.agent_id,
        },
      };

      // Fetch mitglied_id from the conversation if not available
      const storagePath = `${conversation.mitglied_id || user.id}/${id}/archiv.json.gz`;

      const jsonString = JSON.stringify(archive);
      const compressed = pako.gzip(jsonString);

      const { error: uploadError } = await userSupabase.storage
        .from('ki-nachrichten')
        .upload(storagePath, compressed, {
          contentType: 'application/gzip',
          upsert: true,
        });

      if (uploadError) {
        return NextResponse.json({ error: `Failed to upload archive: ${uploadError.message}` }, { status: 500 });
      }

      // Update conversation to bucket status
      updateData.storage_pfad = storagePath;
      updateData.storage_status = 'bucket';
      updateData.archiviert_am = new Date().toISOString();

      const { data: updatedConv, error: updateError } = await userSupabase
        .from('KI_Konversationen')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Soft-delete archived messages (safety net: if bucket file is lost,
      // messages can be recovered by clearing geloescht_am)
      const archivedIds = messages?.map(m => m.id).filter(Boolean) || [];
      if (archivedIds.length > 0) {
        const { error: deleteError } = await userSupabase
          .from('KI_Nachrichten')
          .update({ geloescht_am: new Date().toISOString(), geloescht_von: user.id })
          .in('id', archivedIds);

        if (deleteError) {
          console.error('[conversations] Failed to soft-delete archived messages:', deleteError);
        }
      }

      return NextResponse.json(updatedConv);
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
    console.error('[conversations] PATCH unexpected error:', err);
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

    // Look up org_id via service role + verify membership
    const supabaseService = getSupabaseService();
    const { data: convMeta, error: metaError } = await supabaseService
      .from('KI_Konversationen')
      .select('organisation_id')
      .eq('id', id)
      .is('geloescht_am', null)
      .single();

    if (metaError || !convMeta) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: membership, error: membershipError } = await supabaseService
      .from('Organisation_Mitglieder')
      .select('id')
      .eq('organisation_id', convMeta.organisation_id)
      .eq('user_id', user.id)
      .eq('status', 'aktiv')
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Single org-scoped client for the update
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
