import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { capturePostHogEventWithContext } from '@/lib/posthog-helpers'

export const runtime = 'edge'

// PATCH - Update a Wasserzähler
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { custom_id, eichungsdatum, zaehler_typ, einheit } = body

    // Verify the Wasserzähler belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from('Zaehler')
      .select('id, wohnung_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Wasserzähler not found or access denied' }, { status: 404 })
    }

    // Update Zähler
    const updateData: Record<string, any> = {
      custom_id: custom_id || null,
      eichungsdatum: eichungsdatum || null,
    }
    if (zaehler_typ) updateData.zaehler_typ = zaehler_typ
    if (einheit) updateData.einheit = einheit

    const { data, error } = await supabase
      .from('Zaehler')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating Wasserzähler:', error)
      return NextResponse.json({ error: 'Failed to update Wasserzähler' }, { status: 500 })
    }

    // PostHog Event Tracking
    await capturePostHogEventWithContext(user.id, 'water_meter_updated', {
      meter_id: id,
      apartment_id: existing.wohnung_id,
      custom_id: custom_id || null,
      eichungsdatum: eichungsdatum || null,
      source: 'api_route'
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error in PATCH /api/wasser-zaehler/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a Wasserzähler
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify the Wasserzähler belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from('Zaehler')
      .select('id, wohnung_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Wasserzähler not found or access denied' }, { status: 404 })
    }

    // Delete Wasserzähler
    const { error } = await supabase
      .from('Zaehler')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting Wasserzähler:', error)
      return NextResponse.json({ error: 'Failed to delete Wasserzähler' }, { status: 500 })
    }

    // PostHog Event Tracking
    await capturePostHogEventWithContext(user.id, 'water_meter_deleted', {
      meter_id: id,
      apartment_id: existing.wohnung_id,
      source: 'api_route'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/wasser-zaehler/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


