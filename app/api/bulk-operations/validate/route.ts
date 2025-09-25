import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { TableType } from '@/types/bulk-operations'

export async function POST(request: NextRequest) {
  try {
    const { selectedIds, tableType } = await request.json()

    if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0) {
      return NextResponse.json(
        { error: 'selectedIds is required and must be a non-empty array' },
        { status: 400 }
      )
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

    // Fetch records based on table type
    const records = await fetchRecordsByTableType(supabase, tableType, selectedIds, user.id)

    return NextResponse.json({
      success: true,
      records
    })
  } catch (error) {
    console.error('Validation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function fetchRecordsByTableType(
  supabase: any,
  tableType: TableType,
  selectedIds: string[],
  userId: string
) {
  let query
  
  switch (tableType) {
    case 'wohnungen':
      query = supabase
        .from('Wohnungen')
        .select(`
          id,
          wohnung_nummer,
          haus_id,
          user_id,
          Haeuser!inner(id, name, user_id)
        `)
        .in('id', selectedIds)
        .eq('user_id', userId)
      break

    case 'finanzen':
      query = supabase
        .from('Finanzen')
        .select(`
          id,
          typ,
          betrag,
          beschreibung,
          datum,
          user_id
        `)
        .in('id', selectedIds)
        .eq('user_id', userId)
      break

    case 'mieter':
      query = supabase
        .from('Mieter')
        .select(`
          id,
          vorname,
          nachname,
          email,
          telefon,
          user_id
        `)
        .in('id', selectedIds)
        .eq('user_id', userId)
      break

    case 'haeuser':
      query = supabase
        .from('Haeuser')
        .select(`
          id,
          name,
          adresse,
          user_id
        `)
        .in('id', selectedIds)
        .eq('user_id', userId)
      break

    case 'betriebskosten':
      query = supabase
        .from('Betriebskosten')
        .select(`
          id,
          typ,
          betrag,
          datum,
          haus_id,
          user_id
        `)
        .in('id', selectedIds)
        .eq('user_id', userId)
      break

    default:
      throw new Error(`Unsupported table type: ${tableType}`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch ${tableType}: ${error.message}`)
  }

  return data || []
}