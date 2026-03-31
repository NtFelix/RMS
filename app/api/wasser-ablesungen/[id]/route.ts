import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { capturePostHogEventWithContext } from '@/lib/posthog-helpers'

export const runtime = 'edge'

// PATCH - Update a Wasser_Ablesung
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
    const { ablese_datum, zaehlerstand, verbrauch, kommentar } = body

    // Verify the Zaehler_Ablesung belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from('Zaehler_Ablesungen')
      .select('id, zaehler_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Zaehler_Ablesung not found or access denied' }, { status: 404 })
    }

    // Update Zaehler_Ablesung
    const { data, error } = await supabase
      .from('Zaehler_Ablesungen')
      .update({
        ablese_datum: ablese_datum || null,
        zaehlerstand: zaehlerstand || null,
        verbrauch: verbrauch || 0,
        kommentar: kommentar || null,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating Zaehler_Ablesung:', error)
      return NextResponse.json({ error: 'Failed to update Zaehler_Ablesung' }, { status: 500 })
    }

    // PostHog Event Tracking
    await capturePostHogEventWithContext(user.id, 'water_reading_updated', {
      reading_id: id,
      meter_id: existing.zaehler_id,
      reading_value: zaehlerstand,
      reading_date: ablese_datum,
      source: 'api_route'
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error in PATCH /api/wasser-ablesungen/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a Wasser_Ablesung
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

    // Verify the Zaehler_Ablesung belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from('Zaehler_Ablesungen')
      .select('id, zaehler_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Zaehler_Ablesung not found or access denied' }, { status: 404 })
    }

    // Delete Zaehler_Ablesung
    const { error } = await supabase
      .from('Zaehler_Ablesungen')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting Zaehler_Ablesung:', error)
      return NextResponse.json({ error: 'Failed to delete Zaehler_Ablesung' }, { status: 500 })
    }

    // PostHog Event Tracking
    await capturePostHogEventWithContext(user.id, 'water_reading_deleted', {
      reading_id: id,
      meter_id: existing.zaehler_id,
      source: 'api_route'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/wasser-ablesungen/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


