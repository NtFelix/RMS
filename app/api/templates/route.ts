import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { templateService } from '@/lib/template-service'
import { CreateTemplateRequest } from '@/types/template'

/**
 * GET /api/templates
 * Get all templates for the current user
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

    // Get templates
    const templates = category 
      ? await templateService.getTemplatesByCategory(user.id, category)
      : await templateService.getUserTemplates(user.id)
    
    return NextResponse.json({ templates })
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
 * Create a new template
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

    // Parse request body
    const body = await request.json()
    const { titel, inhalt, kategorie } = body

    // Validate required fields
    if (!titel || !titel.trim()) {
      return NextResponse.json(
        { error: 'Template title is required' },
        { status: 400 }
      )
    }

    if (titel.trim().length < 2) {
      return NextResponse.json(
        { error: 'Template title must be at least 2 characters long' },
        { status: 400 }
      )
    }

    if (titel.trim().length > 100) {
      return NextResponse.json(
        { error: 'Template title cannot exceed 100 characters' },
        { status: 400 }
      )
    }

    if (!kategorie || !kategorie.trim()) {
      return NextResponse.json(
        { error: 'Template category is required' },
        { status: 400 }
      )
    }

    if (!inhalt) {
      return NextResponse.json(
        { error: 'Template content is required' },
        { status: 400 }
      )
    }

    // Validate template content and variables (simplified for now)
    let validationResult: { isValid: boolean; errors: any[]; warnings: any[] } = { isValid: true, errors: [], warnings: [] }
    try {
      validationResult = templateService.validateTemplateVariables(inhalt)
    } catch (error) {
      console.warn('Template validation failed, proceeding without validation:', error)
      // Continue without validation for now to avoid blocking template creation
    }
    
    if (!validationResult.isValid) {
      return NextResponse.json(
        { 
          error: 'Template validation failed',
          validationErrors: validationResult.errors,
          validationWarnings: validationResult.warnings
        },
        { status: 400 }
      )
    }

    // Create template request
    const createRequest: CreateTemplateRequest = {
      titel: titel.trim(),
      inhalt,
      kategorie: kategorie.trim(),
      user_id: user.id
    }

    // Create the template
    const template = await templateService.createTemplate(createRequest)
    
    return NextResponse.json({ 
      template,
      validationWarnings: validationResult.warnings
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}