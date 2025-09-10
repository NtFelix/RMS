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
 * Update a specific template with enhanced validation and error handling
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
    if (titel !== undefined && (!titel || typeof titel !== 'string' || !titel.trim())) {
      return NextResponse.json(
        { 
          error: 'Template title cannot be empty',
          field: 'titel',
          code: 'TITLE_INVALID'
        },
        { status: 400 }
      )
    }

    if (kategorie !== undefined && (!kategorie || typeof kategorie !== 'string' || !kategorie.trim())) {
      return NextResponse.json(
        { 
          error: 'Template category cannot be empty',
          field: 'kategorie',
          code: 'CATEGORY_INVALID'
        },
        { status: 400 }
      )
    }

    // Validate content structure if provided
    if (inhalt !== undefined && (inhalt === null || typeof inhalt !== 'object')) {
      return NextResponse.json(
        { 
          error: 'Template content must be a valid object',
          field: 'inhalt',
          code: 'CONTENT_INVALID_TYPE'
        },
        { status: 400 }
      )
    }

    // Verify template exists and user owns it
    let existingTemplate
    try {
      existingTemplate = await templateService.getTemplate(id)
      if (existingTemplate.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }
    } catch (error) {
      // Check if it's a specific template error
      if (error instanceof Error && error.message.includes('TEMPLATE_NOT_FOUND')) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }
      
      if (error instanceof Error && error.message.includes('PERMISSION_DENIED')) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to verify template ownership' },
        { status: 500 }
      )
    }

    // Enhanced template content validation if provided
    if (inhalt !== undefined) {
      try {
        const validationResult = templateService.validateTemplateVariables(inhalt)
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
      } catch (validationError) {
        console.error('Template validation error:', validationError)
        return NextResponse.json(
          { 
            error: 'Template validation failed due to system error',
            code: 'VALIDATION_SYSTEM_ERROR'
          },
          { status: 500 }
        )
      }
    }

    // Create update request with proper data sanitization
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

    // Validate that at least one field is being updated
    if (Object.keys(updateRequest).length === 0) {
      return NextResponse.json(
        { 
          error: 'At least one field must be provided for update',
          code: 'NO_UPDATE_FIELDS'
        },
        { status: 400 }
      )
    }

    // Update the template with enhanced error handling
    let template
    try {
      template = await templateService.updateTemplate(id, updateRequest)
    } catch (updateError) {
      console.error('Template update error:', updateError)
      
      // Handle specific template service errors
      if (updateError instanceof Error) {
        if (updateError.message.includes('TEMPLATE_NOT_FOUND')) {
          return NextResponse.json(
            { error: 'Template not found' },
            { status: 404 }
          )
        }
        
        if (updateError.message.includes('PERMISSION_DENIED')) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          )
        }
        
        if (updateError.message.includes('INVALID_TEMPLATE_DATA')) {
          return NextResponse.json(
            { 
              error: 'Invalid template data',
              details: updateError.message,
              code: 'INVALID_DATA'
            },
            { status: 400 }
          )
        }
        
        if (updateError.message.includes('TEMPLATE_SAVE_FAILED')) {
          return NextResponse.json(
            { 
              error: 'Failed to save template changes',
              details: updateError.message,
              code: 'SAVE_FAILED'
            },
            { status: 500 }
          )
        }
      }
      
      // Generic error response
      return NextResponse.json(
        { 
          error: 'Failed to update template',
          code: 'UPDATE_FAILED'
        },
        { status: 500 }
      )
    }

    // Return success response with updated template
    return NextResponse.json({ 
      template,
      message: 'Template updated successfully'
    })
    
  } catch (error) {
    console.error('Unexpected error updating template:', error)
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        code: 'UNEXPECTED_ERROR'
      },
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