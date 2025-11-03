import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// GET - Fetch all Wasserzähler for a specific Wohnung
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const wohnungId = searchParams.get('wohnung_id')

    if (!wohnungId) {
      return NextResponse.json({ error: 'wohnung_id is required' }, { status: 400 })
    }

    // Verify the Wohnung belongs to the user
    const { data: wohnung, error: wohnungError } = await supabase
      .from('Wohnungen')
      .select('id')
      .eq('id', wohnungId)
      .eq('user_id', user.id)
      .single()

    if (wohnungError || !wohnung) {
      return NextResponse.json({ error: 'Wohnung not found or access denied' }, { status: 404 })
    }

    // Fetch Wasserzähler
    const { data, error } = await supabase
      .from('Wasser_Zaehler')
      .select('*')
      .eq('wohnung_id', wohnungId)
      .eq('user_id', user.id)
      .order('erstellungsdatum', { ascending: true })

    if (error) {
      console.error('Error fetching Wasserzähler:', error)
      return NextResponse.json({ error: 'Failed to fetch Wasserzähler' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error in GET /api/wasser-zaehler:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new Wasserzähler
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { custom_id, wohnung_id } = body

    if (!wohnung_id) {
      return NextResponse.json({ error: 'wohnung_id is required' }, { status: 400 })
    }

    // Verify the Wohnung belongs to the user
    const { data: wohnung, error: wohnungError } = await supabase
      .from('Wohnungen')
      .select('id')
      .eq('id', wohnung_id)
      .eq('user_id', user.id)
      .single()

    if (wohnungError || !wohnung) {
      return NextResponse.json({ error: 'Wohnung not found or access denied' }, { status: 404 })
    }

    // Create Wasserzähler
    const { data, error } = await supabase
      .from('Wasser_Zaehler')
      .insert({
        custom_id: custom_id || null,
        wohnung_id,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating Wasserzähler:', error)
      return NextResponse.json({ error: 'Failed to create Wasserzähler' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/wasser-zaehler:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
