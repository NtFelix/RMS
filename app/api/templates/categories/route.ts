import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { templateService } from '@/lib/template-service'

/**
 * GET /api/templates/categories
 * Get all categories for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user categories
    const categories = await templateService.getUserCategories(user.id)
    
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching template categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}