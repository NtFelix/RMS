import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { templateService } from '@/lib/template-service'
import { UpdateTemplateRequest } from '@/types/template'

/**
 * GET /api/templates/[id]
 * Get a specific template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    // Get the template
    const template = await templateService.getTemplate(id)
    
    // Verify ownership
    if (template.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/templates/[id]
 * Update a specific template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    if (titel !== undefined && (!titel || !titel.trim())) {
      return NextResponse.json(
        { error: 'Template title cannot be empty' },
        { status: 400 }
      )
    }

    if (kategorie !== undefined && (!kategorie || !kategorie.trim())) {
      return NextResponse.json(
        { error: 'Template category cannot be empty' },
        { status: 400 }
      )
    }

    // Verify template exists and user owns it
    try {
      const existingTemplate = await templateService.getTemplate(id)
      if (existingTemplate.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Validate template content if provided
    if (inhalt !== undefined) {
      const validationResult = templateService.validateTemplateVariables(inhalt)
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
    }

    // Create update request
    const updateRequest: UpdateTemplateRequest = {}
    
    if (titel !== undefined) {
      updateRequest.titel = titel.trim()
    }
    
    if (inhalt !== undefined) {
      updateRequest.inhalt = inhalt
    }
    
    if (kategorie !== undefined) {
      updateRequest.kategorie = kategorie.trim()
    }

    // Update the template
    const template = await templateService.updateTemplate(id, updateRequest)
    
    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/templates/[id]
 * Delete a specific template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    // Verify template exists and user owns it
    try {
      const existingTemplate = await templateService.getTemplate(id)
      if (existingTemplate.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Delete the template
    await templateService.deleteTemplate(id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}