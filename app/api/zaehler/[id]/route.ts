import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { capturePostHogEventWithContext } from '@/lib/posthog-helpers'
import { NO_CACHE_HEADERS } from '@/lib/constants/http'

export const runtime = 'edge'

// PATCH - Update a Wasserzähler
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { requireApiPermission, verifyWohnungInScope } = await import("@/lib/api-permissions");
    await requireApiPermission('zaehler', 'bearbeiten');

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE_HEADERS })
    }

    const { id } = await params
    const body = await request.json()
    const { custom_id, eichungsdatum, zaehler_typ, einheit, kommentar } = body

    // Verify the Wasserzähler belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from('Zaehler')
      .select('id, wohnung_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Wasserzähler not found or access denied' }, { status: 404, headers: NO_CACHE_HEADERS })
    }

    if (existing.wohnung_id && !(await verifyWohnungInScope(existing.wohnung_id))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403, headers: NO_CACHE_HEADERS })
    }

    // Update Zähler
    const updateData: Record<string, any> = {
      custom_id: custom_id || null,
      eichungsdatum: eichungsdatum || null,
      kommentar: kommentar || null,
    }
    if (zaehler_typ) updateData.zaehler_typ = zaehler_typ
    if (einheit) updateData.einheit = einheit

    const { data, error } = await supabase
      .from('Zaehler')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating Wasserzähler:', error)
      return NextResponse.json({ error: 'Failed to update Wasserzähler' }, { status: 500, headers: NO_CACHE_HEADERS })
    }

    // PostHog Event Tracking
    await capturePostHogEventWithContext(user.id, 'water_meter_updated', {
      meter_id: id,
      apartment_id: existing.wohnung_id,
      custom_id: custom_id || null,
      eichungsdatum: eichungsdatum || null,
      source: 'api_route'
    })

    return NextResponse.json(data, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/zaehler/[id]:', error)
    const status = (error as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json({ error: (error as Error).message || 'Internal server error' }, { status, headers: NO_CACHE_HEADERS })
  }
}

// DELETE - Delete a Wasserzähler
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { requireApiPermission, verifyWohnungInScope } = await import("@/lib/api-permissions");
    await requireApiPermission('zaehler', 'loeschen');

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE_HEADERS })
    }

    const { id } = await params

    // Verify the Wasserzähler belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from('Zaehler')
      .select('id, wohnung_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Wasserzähler not found or access denied' }, { status: 404, headers: NO_CACHE_HEADERS })
    }

    if (existing.wohnung_id && !(await verifyWohnungInScope(existing.wohnung_id))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403, headers: NO_CACHE_HEADERS })
    }

    const { error } = await supabase.rpc('soft_delete_record', {
      p_table_name: 'Zaehler',
      p_record_id: id,
    });

    if (error) {
      console.error('Error deleting Wasserzähler:', error)
      return NextResponse.json({ error: 'Failed to delete Wasserzähler' }, { status: 500, headers: NO_CACHE_HEADERS })
    }

    // PostHog Event Tracking
    await capturePostHogEventWithContext(user.id, 'water_meter_deleted', {
      meter_id: id,
      apartment_id: existing.wohnung_id,
      source: 'api_route'
    })

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/zaehler/[id]:', error)
    const status = (error as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json({ error: (error as Error).message || 'Internal server error' }, { status, headers: NO_CACHE_HEADERS })
  }
}


