import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const apartmentId = searchParams.get('apartmentId')

    if (!apartmentId) {
      // Get all tenants for this user
      const { data: allTenants, error: allTenantsError } = await supabase
        .from('Mieter')
        .select('id, name, wohnung_id, user_id')
        .eq('user_id', user.id)

      return NextResponse.json({
        userId: user.id,
        allTenants: allTenants || [],
        error: allTenantsError?.message
      })
    }

    // Get tenants for specific apartment
    const { data: tenants, error: tenantsError } = await supabase
      .from('Mieter')
      .select('id, name, wohnung_id, user_id')
      .eq('wohnung_id', apartmentId)
      .eq('user_id', user.id)

    // Also get apartment info
    const { data: apartment, error: apartmentError } = await supabase
      .from('Wohnungen')
      .select('id, name, haus_id, user_id')
      .eq('id', apartmentId)
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      userId: user.id,
      apartmentId,
      apartment: apartment || null,
      apartmentError: apartmentError?.message,
      tenants: tenants || [],
      tenantsError: tenantsError?.message,
      tenantsCount: tenants?.length || 0
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}