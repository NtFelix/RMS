import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { NO_CACHE_HEADERS } from '@/lib/constants/http'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { 
        status: 401,
        headers: NO_CACHE_HEADERS
      })
    }

    const { searchParams } = new URL(request.url)
    const apartmentId = searchParams.get('apartmentId')

    if (!apartmentId) {
      const { data: allTenants, error: allTenantsError } = await supabase
        .from('Mieter')
        .select('id, name, wohnung_id')

      return NextResponse.json({
        userId: user.id,
        allTenants: allTenants || [],
        error: allTenantsError?.message
      }, {
        headers: NO_CACHE_HEADERS
      })
    }

    const { data: tenants, error: tenantsError } = await supabase
      .from('Mieter')
      .select('id, name, wohnung_id')
      .eq('wohnung_id', apartmentId)

    const { data: apartment, error: apartmentError } = await supabase
      .from('Wohnungen')
      .select('id, name, haus_id')
      .eq('id', apartmentId)
      .single()

    return NextResponse.json({
      userId: user.id,
      apartmentId,
      apartment: apartment || null,
      apartmentError: apartmentError?.message,
      tenants: tenants || [],
      tenantsError: tenantsError?.message,
      tenantsCount: tenants?.length || 0
    }, {
      headers: NO_CACHE_HEADERS
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { 
      status: 500,
      headers: NO_CACHE_HEADERS
    })
  }
}