import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { templateService } from '@/lib/template-service'

/**
 * GET /api/templates/categories
 * Get all categories for the authenticated user with enhanced error handling
 */
export async function GET(request: NextRequest) {
  const requestId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    console.log(`[${requestId}] GET /api/templates/categories - Starting categories fetch`)
    
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.warn(`[${requestId}] Authentication failed:`, authError?.message)
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          requestId
        },
        { status: 401 }
      )
    }

    console.log(`[${requestId}] User authenticated: ${user.id}`)

    // Get categories from template service with enhanced error handling
    let categories: string[]
    try {
      categories = await templateService.getUserCategories(user.id)
      console.log(`[${requestId}] Categories fetched successfully: ${categories.length} categories`)
    } catch (fetchError) {
      console.error(`[${requestId}] Categories fetch error:`, fetchError)
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch categories from database',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error',
          code: 'FETCH_FAILED',
          requestId
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      categories,
      count: categories.length,
      requestId
    })
    
  } catch (error) {
    console.error(`[${requestId}] Unexpected error fetching template categories:`, error)
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNEXPECTED_ERROR',
        requestId
      },
      { status: 500 }
    )
  }
}