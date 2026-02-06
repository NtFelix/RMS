import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { capturePostHogEventWithContext } from '@/lib/posthog-helpers'

export const runtime = 'edge'

// GET - Fetch all Wasser_Ablesungen for a specific Wasserzähler
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const wasserZaehlerId = searchParams.get('zaehler_id') || searchParams.get('wasser_zaehler_id')

    if (!wasserZaehlerId) {
      return NextResponse.json({ error: 'zaehler_id is required' }, { status: 400 })
    }

    // Verify the Wasserzähler belongs to the user
    const { data: zaehler, error: zaehlerError } = await supabase
      .from('Zaehler')
      .select('id')
      .eq('id', wasserZaehlerId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (zaehlerError || !zaehler) {
      return NextResponse.json({ error: 'Wasserzähler not found or access denied' }, { status: 404 })
    }

    // Fetch Zaehler_Ablesungen
    const { data, error } = await supabase
      .from('Zaehler_Ablesungen')
      .select('*')
      .eq('zaehler_id', wasserZaehlerId)
      .eq('user_id', user.id)
      .order('ablese_datum', { ascending: false })

    if (error) {
      console.error('Error fetching Zaehler_Ablesungen:', error)
      return NextResponse.json({ error: 'Failed to fetch Zaehler_Ablesungen' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error in GET /api/wasser-ablesungen:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new Wasser_Ablesung
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ablese_datum, zaehlerstand, verbrauch, zaehler_id, wasser_zaehler_id } = body
    const meterId = zaehler_id || wasser_zaehler_id

    if (!meterId) {
      return NextResponse.json({ error: 'zaehler_id is required' }, { status: 400 })
    }

    // Verify the Wasserzähler belongs to the user
    const { data: zaehler, error: zaehlerError } = await supabase
      .from('Zaehler')
      .select('id')
      .eq('id', meterId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (zaehlerError || !zaehler) {
      return NextResponse.json({ error: 'Wasserzähler not found or access denied' }, { status: 404 })
    }

    // Create Zaehler_Ablesung
    const { data, error } = await supabase
      .from('Zaehler_Ablesungen')
      .insert({
        ablese_datum: ablese_datum || null,
        zaehlerstand: zaehlerstand || null,
        verbrauch: verbrauch || 0,
        zaehler_id: meterId,
        user_id: user.id,
        kommentar: body.kommentar || null,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating Zaehler_Ablesung:', error)
      return NextResponse.json({ error: 'Failed to create Zaehler_Ablesung' }, { status: 500 })
    }

    // PostHog Event Tracking
    await capturePostHogEventWithContext(user.id, 'water_reading_recorded', {
      reading_id: data?.id,
      meter_id: meterId,
      reading_value: zaehlerstand,
      reading_date: ablese_datum,
      source: 'api_route'
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/wasser-ablesungen:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

