import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// PATCH - Update a Wasserzähler
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { custom_id, eichungsdatum } = body

    // Verify the Wasserzähler belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from('Wasser_Zaehler')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Wasserzähler not found or access denied' }, { status: 404 })
    }

    // Update Wasserzähler
    const { data, error } = await supabase
      .from('Wasser_Zaehler')
      .update({ 
        custom_id: custom_id || null,
        eichungsdatum: eichungsdatum || null,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating Wasserzähler:', error)
      return NextResponse.json({ error: 'Failed to update Wasserzähler' }, { status: 500 })
    }

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
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify the Wasserzähler belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from('Wasser_Zaehler')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Wasserzähler not found or access denied' }, { status: 404 })
    }

    // Delete Wasserzähler
    const { error } = await supabase
      .from('Wasser_Zaehler')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting Wasserzähler:', error)
      return NextResponse.json({ error: 'Failed to delete Wasserzähler' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/wasser-zaehler/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
