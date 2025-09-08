import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const titel = searchParams.get('titel')

    if (!titel) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if template name exists for this user
    const { data: existingTemplate, error } = await supabase
      .from('Vorlagen')
      .select('id')
      .eq('user_id', user.id)
      .eq('titel', titel)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking template name:', error)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    const isUnique = !existingTemplate

    return NextResponse.json({ isUnique })

  } catch (error) {
    console.error('Error in check-name API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}