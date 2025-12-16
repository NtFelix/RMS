import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPostHogServer } from '@/app/posthog-server.mjs'
import { logger } from '@/utils/logger'
import { posthogLogger } from '@/lib/posthog-logger'

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

    // Verify the Wasser_Ablesung belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from('Wasser_Ablesungen')
      .select('id, wasser_zaehler_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Wasser_Ablesung not found or access denied' }, { status: 404 })
    }

    // Update Wasser_Ablesung
    const { data, error } = await supabase
      .from('Wasser_Ablesungen')
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
      console.error('Error updating Wasser_Ablesung:', error)
      return NextResponse.json({ error: 'Failed to update Wasser_Ablesung' }, { status: 500 })
    }

    // PostHog Event Tracking
    try {
      const posthog = getPostHogServer()
      posthog.capture({
        distinctId: user.id,
        event: 'water_reading_updated',
        properties: {
          reading_id: id,
          meter_id: existing.wasser_zaehler_id,
          reading_value: zaehlerstand,
          reading_date: ablese_datum,
          source: 'api_route'
        }
      })
      await posthog.flush()
      await posthogLogger.flush()
      logger.info(`[PostHog] Capturing event: water_reading_updated for user: ${user.id}`)
    } catch (phError) {
      logger.error('Failed to capture PostHog event:', phError instanceof Error ? phError : new Error(String(phError)))
    }

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

    // Verify the Wasser_Ablesung belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from('Wasser_Ablesungen')
      .select('id, wasser_zaehler_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Wasser_Ablesung not found or access denied' }, { status: 404 })
    }

    // Delete Wasser_Ablesung
    const { error } = await supabase
      .from('Wasser_Ablesungen')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting Wasser_Ablesung:', error)
      return NextResponse.json({ error: 'Failed to delete Wasser_Ablesung' }, { status: 500 })
    }

    // PostHog Event Tracking
    try {
      const posthog = getPostHogServer()
      posthog.capture({
        distinctId: user.id,
        event: 'water_reading_deleted',
        properties: {
          reading_id: id,
          meter_id: existing.wasser_zaehler_id,
          source: 'api_route'
        }
      })
      await posthog.flush()
      await posthogLogger.flush()
      logger.info(`[PostHog] Capturing event: water_reading_deleted for user: ${user.id}`)
    } catch (phError) {
      logger.error('Failed to capture PostHog event:', phError instanceof Error ? phError : new Error(String(phError)))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/wasser-ablesungen/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

