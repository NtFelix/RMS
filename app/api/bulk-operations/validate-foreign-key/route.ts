import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { TableType } from '@/types/bulk-operations'

export async function POST(request: NextRequest) {
  try {
    const { value, tableType } = await request.json()

    if (!value) {
      return NextResponse.json({ exists: false })
    }

    if (!tableType) {
      return NextResponse.json(
        { error: 'tableType is required' },
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

    // Check if the foreign key value exists
    const exists = await checkForeignKeyExists(supabase, tableType, value, user.id)

    return NextResponse.json({ exists })
  } catch (error) {
    console.error('Foreign key validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function checkForeignKeyExists(
  supabase: any,
  tableType: TableType,
  value: string,
  userId: string
): Promise<boolean> {
  let query

  switch (tableType) {
    case 'haeuser':
      query = supabase
        .from('Haeuser')
        .select('id')
        .eq('id', value)
        .eq('user_id', userId)
        .single()
      break

    case 'wohnungen':
      query = supabase
        .from('Wohnungen')
        .select('id')
        .eq('id', value)
        .eq('user_id', userId)
        .single()
      break

    case 'mieter':
      query = supabase
        .from('Mieter')
        .select('id')
        .eq('id', value)
        .eq('user_id', userId)
        .single()
      break

    default:
      return false
  }

  const { data, error } = await query

  // If there's an error or no data, the foreign key doesn't exist
  return !error && !!data
}