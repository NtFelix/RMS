import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { templateService } from '@/lib/template-service'
import { CreateTemplateRequest } from '@/types/template'

/**
 * GET /api/templates
 * Get templates for the current user with optional pagination
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const search = searchParams.get('search')

    // Check if pagination is requested
    const isPaginated = limitParam !== null || offsetParam !== null

    if (isPaginated) {
      // Use paginated endpoint
      const limit = limitParam ? parseInt(limitParam, 10) : 20
      const offset = offsetParam ? parseInt(offsetParam, 10) : 0

      const result = await templateService.getUserTemplatesPaginated(user.id, {
        limit,
        offset,
        category: category || undefined,
        search: search || undefined
      })

      return NextResponse.json({
        templates: result.templates,
        totalCount: result.totalCount,
        limit,
        offset,
        hasMore: (offset + limit) < result.totalCount
      })
    } else {
      // Use non-paginated endpoint for backward compatibility
      const templates = category 
        ? await templateService.getTemplatesByCategory(user.id, category)
        : await templateService.getUserTemplates(user.id)
      
      return NextResponse.json({ templates })
    }
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates
 * Create a new template with enhanced validation and error handling
 */
export async function POST(request: NextRequest) {
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

    // Parse request body with error handling
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { titel, inhalt, kategorie } = body

    // Enhanced validation for required fields
    if (!titel || typeof titel !== 'string' || !titel.trim()) {
      return NextResponse.json(
        { 
          error: 'Template title is required and cannot be empty',
          field: 'titel',
          code: 'TITLE_REQUIRED'
        },
        { status: 400 }
      )
    }

    if (titel.trim().length < 2) {
      return NextResponse.json(
        { 
          error: 'Template title must be at least 2 characters long',
          field: 'titel',
          code: 'TITLE_TOO_SHORT'
        },
        { status: 400 }
      )
    }

    if (titel.trim().length > 255) {
      return NextResponse.json(
        { 
          error: 'Template title cannot exceed 255 characters',
          field: 'titel',
          code: 'TITLE_TOO_LONG'
        },
        { status: 400 }
      )
    }

    if (!kategorie || typeof kategorie !== 'string' || !kategorie.trim()) {
      return NextResponse.json(
        { 
          error: 'Template category is required and cannot be empty',
          field: 'kategorie',
          code: 'CATEGORY_REQUIRED'
        },
        { status: 400 }
      )
    }

    if (kategorie.trim().length > 100) {
      return NextResponse.json(
        { 
          error: 'Template category cannot exceed 100 characters',
          field: 'kategorie',
          code: 'CATEGORY_TOO_LONG'
        },
        { status: 400 }
      )
    }

    if (!inhalt || typeof inhalt !== 'object') {
      return NextResponse.json(
        { 
          error: 'Template content is required and must be a valid object',
          field: 'inhalt',
          code: 'CONTENT_REQUIRED'
        },
        { status: 400 }
      )
    }

    // Enhanced template content validation
    let validationResult: { isValid: boolean; errors: any[]; warnings: any[] } = { isValid: true, errors: [], warnings: [] }
    try {
      validationResult = templateService.validateTemplateVariables(inhalt)
    } catch (validationError) {
      console.error('Template validation system error:', validationError)
      return NextResponse.json(
        { 
          error: 'Template validation failed due to system error',
          code: 'VALIDATION_SYSTEM_ERROR'
        },
        { status: 500 }
      )
    }
    
    if (!validationResult.isValid) {
      return NextResponse.json(
        { 
          error: 'Template validation failed',
          validationErrors: validationResult.errors,
          validationWarnings: validationResult.warnings,
          code: 'VALIDATION_FAILED'
        },
        { status: 400 }
      )
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      console.warn('Template validation warnings:', validationResult.warnings)
    }

    // Create template request with proper data sanitization
    const createRequest: CreateTemplateRequest = {
      titel: titel.trim(),
      inhalt,
      kategorie: kategorie.trim(),
      user_id: user.id
    }

    // Create the template with enhanced error handling
    let template
    try {
      template = await templateService.createTemplate(createRequest)
    } catch (createError) {
      console.error('Template creation error:', createError)
      
      // Handle specific template service errors
      if (createError instanceof Error) {
        if (createError.message.includes('PERMISSION_DENIED')) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          )
        }
        
        if (createError.message.includes('INVALID_TEMPLATE_DATA')) {
          return NextResponse.json(
            { 
              error: 'Invalid template data',
              details: createError.message,
              code: 'INVALID_DATA'
            },
            { status: 400 }
          )
        }
        
        if (createError.message.includes('TEMPLATE_SAVE_FAILED')) {
          return NextResponse.json(
            { 
              error: 'Failed to save template',
              details: createError.message,
              code: 'SAVE_FAILED'
            },
            { status: 500 }
          )
        }
      }
      
      // Generic error response
      return NextResponse.json(
        { 
          error: 'Failed to create template',
          code: 'CREATE_FAILED'
        },
        { status: 500 }
      )
    }
    
    // Return success response with created template
    return NextResponse.json({ 
      template,
      validationWarnings: validationResult.warnings,
      message: 'Template created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Unexpected error creating template:', error)
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        code: 'UNEXPECTED_ERROR'
      },
      { status: 500 }
    )
  }
}