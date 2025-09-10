import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { templateService } from '@/lib/template-service'
import { templateValidationService } from '@/lib/template-validation-service'
import { UpdateTemplateRequest } from '@/types/template'
import { 
  validateUpdateTemplateRequest,
  VALIDATION_LIMITS 
} from '@/lib/template-validation-schemas'

/**
 * GET /api/templates/[id]
 * Get a specific template by ID with enhanced error handling
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const requestId = `get_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    console.log(`[${requestId}] GET /api/templates/${id} - Starting template fetch`)
    
    // Validate template ID format
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      console.warn(`[${requestId}] Invalid template ID: ${id}`)
      return NextResponse.json(
        { 
          error: 'Invalid template ID',
          code: 'INVALID_TEMPLATE_ID',
          requestId
        },
        { status: 400 }
      )
    }

    // Check if ID is UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      console.warn(`[${requestId}] Invalid UUID format: ${id}`)
      return NextResponse.json(
        { 
          error: 'Template ID must be a valid UUID',
          code: 'INVALID_UUID_FORMAT',
          requestId
        },
        { status: 400 }
      )
    }
    
    const supabase = createSupabaseServerClient()
    
    // Get the current user
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

    // Get the template with enhanced error handling
    let template
    try {
      template = await templateService.getTemplate(id)
      console.log(`[${requestId}] Template fetched successfully`)
    } catch (fetchError) {
      console.error(`[${requestId}] Template fetch error:`, fetchError)
      
      if (fetchError instanceof Error) {
        if (fetchError.message.includes('TEMPLATE_NOT_FOUND')) {
          return NextResponse.json(
            { 
              error: 'Template not found',
              code: 'TEMPLATE_NOT_FOUND',
              requestId
            },
            { status: 404 }
          )
        }
        
        if (fetchError.message.includes('PERMISSION_DENIED')) {
          return NextResponse.json(
            { 
              error: 'Access denied',
              code: 'PERMISSION_DENIED',
              requestId
            },
            { status: 403 }
          )
        }
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch template',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error',
          code: 'FETCH_FAILED',
          requestId
        },
        { status: 500 }
      )
    }
    
    // Verify ownership
    if (template.user_id !== user.id) {
      console.warn(`[${requestId}] Access denied - user ${user.id} tried to access template owned by ${template.user_id}`)
      return NextResponse.json(
        { 
          error: 'Template not found',
          code: 'TEMPLATE_NOT_FOUND',
          requestId
        },
        { status: 404 }
      )
    }

    console.log(`[${requestId}] Template access authorized`)
    
    return NextResponse.json({ 
      template,
      requestId
    })
    
  } catch (error) {
    console.error(`[${requestId}] Unexpected error fetching template:`, error)
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

/**
 * PUT /api/templates/[id]
 * Update a specific template with enhanced validation and error handling
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const startTime = Date.now()
  const requestId = `put_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    console.log(`[${requestId}] PUT /api/templates/${id} - Starting template update`)
    
    // Validate template ID format
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      console.warn(`[${requestId}] Invalid template ID: ${id}`)
      return NextResponse.json(
        { 
          error: 'Invalid template ID',
          code: 'INVALID_TEMPLATE_ID',
          requestId
        },
        { status: 400 }
      )
    }

    // Check if ID is UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      console.warn(`[${requestId}] Invalid UUID format: ${id}`)
      return NextResponse.json(
        { 
          error: 'Template ID must be a valid UUID',
          code: 'INVALID_UUID_FORMAT',
          requestId
        },
        { status: 400 }
      )
    }
    
    const supabase = createSupabaseServerClient()
    
    // Get the current user
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

    // Parse request body with enhanced error handling
    let body: any
    let contentType: string | null = null
    
    try {
      contentType = request.headers.get('content-type')
      
      if (!contentType || !contentType.includes('application/json')) {
        console.warn(`[${requestId}] Invalid content type: ${contentType}`)
        return NextResponse.json(
          { 
            error: 'Content-Type must be application/json',
            code: 'INVALID_CONTENT_TYPE',
            requestId
          },
          { status: 400 }
        )
      }
      
      body = await request.json()
      
      // Check if body is empty after parsing
      if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
        console.warn(`[${requestId}] Empty request body`)
        return NextResponse.json(
          { 
            error: 'Request body cannot be empty',
            code: 'EMPTY_BODY',
            requestId
          },
          { status: 400 }
        )
      }
      console.log(`[${requestId}] Request body parsed successfully`)
      
    } catch (parseError) {
      console.error(`[${requestId}] JSON parsing error:`, parseError)
      return NextResponse.json(
        { 
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : 'JSON parsing failed',
          code: 'INVALID_JSON',
          requestId
        },
        { status: 400 }
      )
    }

    // Validate request structure
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      console.warn(`[${requestId}] Invalid request body structure`)
      return NextResponse.json(
        { 
          error: 'Request body must be a valid object',
          code: 'INVALID_BODY_STRUCTURE',
          requestId
        },
        { status: 400 }
      )
    }

    const { titel, inhalt, kategorie } = body

    // Log request details (without sensitive content)
    console.log(`[${requestId}] Template update request:`, {
      titel: titel !== undefined ? `"${String(titel).substring(0, 50)}${String(titel).length > 50 ? '...' : ''}"` : 'unchanged',
      kategorie: kategorie !== undefined ? `"${String(kategorie)}"` : 'unchanged',
      hasContentUpdate: inhalt !== undefined,
      contentType: typeof inhalt
    })

    // Enhanced validation using Zod schemas
    const validationResult = validateUpdateTemplateRequest({
      titel,
      inhalt,
      kategorie
    })

    if (!validationResult.success) {
      const errors = validationResult.errors || []
      console.warn(`[${requestId}] Schema validation failed:`, errors)
      
      // Convert Zod errors to user-friendly format
      const validationErrors = errors.map((error: any) => ({
        field: error.path?.join('.') || 'unknown',
        message: error.message,
        code: `VALIDATION_${error.code?.toUpperCase() || 'ERROR'}`,
        value: 'received' in error ? error.received : undefined
      }))

      return NextResponse.json(
        { 
          error: 'Validation failed',
          validationErrors,
          code: 'VALIDATION_FAILED',
          requestId
        },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data!
    console.log(`[${requestId}] Schema validation passed`)

    // Verify template exists and user owns it
    let existingTemplate
    try {
      existingTemplate = await templateService.getTemplate(id)
      if (existingTemplate.user_id !== user.id) {
        console.warn(`[${requestId}] Access denied - user ${user.id} tried to update template owned by ${existingTemplate.user_id}`)
        return NextResponse.json(
          { 
            error: 'Template not found',
            code: 'TEMPLATE_NOT_FOUND',
            requestId
          },
          { status: 404 }
        )
      }
      console.log(`[${requestId}] Template ownership verified`)
    } catch (error) {
      console.error(`[${requestId}] Template verification error:`, error)
      
      // Check if it's a specific template error
      if (error instanceof Error && error.message.includes('TEMPLATE_NOT_FOUND')) {
        return NextResponse.json(
          { 
            error: 'Template not found',
            code: 'TEMPLATE_NOT_FOUND',
            requestId
          },
          { status: 404 }
        )
      }
      
      if (error instanceof Error && error.message.includes('PERMISSION_DENIED')) {
        return NextResponse.json(
          { 
            error: 'Access denied',
            code: 'PERMISSION_DENIED',
            requestId
          },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to verify template ownership',
          details: error instanceof Error ? error.message : 'Unknown error',
          code: 'VERIFICATION_FAILED',
          requestId
        },
        { status: 500 }
      )
    }

    // Enhanced content validation if provided
    let contentValidationResult: { isValid: boolean; errors: any[]; warnings: any[] } | undefined
    
    if (inhalt !== undefined) {
      try {
        // Validate JSONB content structure
        if (!isValidJsonbContent(inhalt)) {
          console.warn(`[${requestId}] Invalid JSONB content structure`)
          return NextResponse.json(
            { 
              error: 'Template content must be valid JSONB-compatible object',
              details: 'Content contains non-serializable values or circular references',
              field: 'inhalt',
              code: 'INVALID_JSONB_CONTENT',
              requestId
            },
            { status: 400 }
          )
        }

        // Validate TipTap content structure
        if (!isValidTiptapContent(inhalt)) {
          console.warn(`[${requestId}] Invalid TipTap content structure`)
          return NextResponse.json(
            { 
              error: 'Template content must be valid TipTap document structure',
              details: 'Content must have type "doc" and valid content array',
              field: 'inhalt',
              code: 'INVALID_TIPTAP_STRUCTURE',
              requestId
            },
            { status: 400 }
          )
        }

        // Validate template variables
        contentValidationResult = templateService.validateTemplateVariables(inhalt)
        console.log(`[${requestId}] Content validation completed:`, {
          isValid: contentValidationResult.isValid,
          errorCount: contentValidationResult.errors.length,
          warningCount: contentValidationResult.warnings.length
        })
        
        if (!contentValidationResult.isValid) {
          console.warn(`[${requestId}] Content validation failed:`, contentValidationResult.errors)
          return NextResponse.json(
            { 
              error: 'Template content validation failed',
              validationErrors: contentValidationResult.errors,
              validationWarnings: contentValidationResult.warnings,
              code: 'CONTENT_VALIDATION_FAILED',
              requestId
            },
            { status: 400 }
          )
        }
        
        // Log warnings if any
        if (contentValidationResult.warnings.length > 0) {
          console.warn(`[${requestId}] Template validation warnings:`, contentValidationResult.warnings)
        }
        
      } catch (validationError) {
        console.error(`[${requestId}] Template validation system error:`, validationError)
        return NextResponse.json(
          { 
            error: 'Template validation failed due to system error',
            details: validationError instanceof Error ? validationError.message : 'Unknown validation error',
            code: 'VALIDATION_SYSTEM_ERROR',
            requestId
          },
          { status: 500 }
        )
      }
    }

    // Create update request with proper data sanitization
    const updateRequest: UpdateTemplateRequest = {}
    
    if (validatedData.titel !== undefined) {
      updateRequest.titel = validatedData.titel
    }
    
    if (validatedData.inhalt !== undefined) {
      updateRequest.inhalt = sanitizeJsonbContent(validatedData.inhalt)
    }
    
    if (validatedData.kategorie !== undefined) {
      updateRequest.kategorie = validatedData.kategorie
    }

    // Validate that at least one field is being updated
    if (Object.keys(updateRequest).length === 0) {
      console.warn(`[${requestId}] No update fields provided`)
      return NextResponse.json(
        { 
          error: 'At least one field must be provided for update',
          code: 'NO_UPDATE_FIELDS',
          requestId
        },
        { status: 400 }
      )
    }

    console.log(`[${requestId}] Updating template with sanitized data`)

    // Update the template with enhanced error handling
    let template
    try {
      template = await templateService.updateTemplate(id, updateRequest)
      console.log(`[${requestId}] Template updated successfully`)
      
    } catch (updateError) {
      console.error(`[${requestId}] Template update error:`, updateError)
      
      // Handle specific template service errors
      if (updateError instanceof Error) {
        if (updateError.message.includes('TEMPLATE_NOT_FOUND')) {
          return NextResponse.json(
            { 
              error: 'Template not found',
              code: 'TEMPLATE_NOT_FOUND',
              requestId
            },
            { status: 404 }
          )
        }
        
        if (updateError.message.includes('PERMISSION_DENIED')) {
          return NextResponse.json(
            { 
              error: 'Access denied',
              code: 'PERMISSION_DENIED',
              requestId
            },
            { status: 403 }
          )
        }
        
        if (updateError.message.includes('INVALID_TEMPLATE_DATA')) {
          return NextResponse.json(
            { 
              error: 'Invalid template data',
              details: updateError.message,
              code: 'INVALID_DATA',
              requestId
            },
            { status: 400 }
          )
        }
        
        if (updateError.message.includes('TEMPLATE_SAVE_FAILED')) {
          return NextResponse.json(
            { 
              error: 'Failed to save template changes to database',
              details: updateError.message,
              code: 'SAVE_FAILED',
              requestId
            },
            { status: 500 }
          )
        }

        if (updateError.message.includes('DUPLICATE_TITLE')) {
          return NextResponse.json(
            { 
              error: 'Template with this title already exists',
              details: updateError.message,
              field: 'titel',
              code: 'DUPLICATE_TITLE',
              requestId
            },
            { status: 409 }
          )
        }
      }
      
      // Generic error response
      return NextResponse.json(
        { 
          error: 'Failed to update template',
          details: updateError instanceof Error ? updateError.message : 'Unknown error',
          code: 'UPDATE_FAILED',
          requestId
        },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    console.log(`[${requestId}] Template update completed successfully in ${duration}ms`)

    // Return success response with updated template
    return NextResponse.json({ 
      template,
      validationWarnings: contentValidationResult?.warnings || [],
      message: 'Template updated successfully',
      requestId,
      duration
    })
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[${requestId}] Unexpected error updating template (${duration}ms):`, error)
    
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

/**
 * DELETE /api/templates/[id]
 * Delete a specific template with enhanced error handling
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const requestId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    console.log(`[${requestId}] DELETE /api/templates/${id} - Starting template deletion`)
    
    // Validate template ID format
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      console.warn(`[${requestId}] Invalid template ID: ${id}`)
      return NextResponse.json(
        { 
          error: 'Invalid template ID',
          code: 'INVALID_TEMPLATE_ID',
          requestId
        },
        { status: 400 }
      )
    }

    // Check if ID is UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      console.warn(`[${requestId}] Invalid UUID format: ${id}`)
      return NextResponse.json(
        { 
          error: 'Template ID must be a valid UUID',
          code: 'INVALID_UUID_FORMAT',
          requestId
        },
        { status: 400 }
      )
    }
    
    const supabase = createSupabaseServerClient()
    
    // Get the current user
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

    // Verify template exists and user owns it
    let existingTemplate
    try {
      existingTemplate = await templateService.getTemplate(id)
      if (existingTemplate.user_id !== user.id) {
        console.warn(`[${requestId}] Access denied - user ${user.id} tried to delete template owned by ${existingTemplate.user_id}`)
        return NextResponse.json(
          { 
            error: 'Template not found',
            code: 'TEMPLATE_NOT_FOUND',
            requestId
          },
          { status: 404 }
        )
      }
      console.log(`[${requestId}] Template ownership verified - title: "${existingTemplate.titel}"`)
    } catch (error) {
      console.error(`[${requestId}] Template verification error:`, error)
      
      if (error instanceof Error && error.message.includes('TEMPLATE_NOT_FOUND')) {
        return NextResponse.json(
          { 
            error: 'Template not found',
            code: 'TEMPLATE_NOT_FOUND',
            requestId
          },
          { status: 404 }
        )
      }
      
      if (error instanceof Error && error.message.includes('PERMISSION_DENIED')) {
        return NextResponse.json(
          { 
            error: 'Access denied',
            code: 'PERMISSION_DENIED',
            requestId
          },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to verify template ownership',
          details: error instanceof Error ? error.message : 'Unknown error',
          code: 'VERIFICATION_FAILED',
          requestId
        },
        { status: 500 }
      )
    }

    // Delete the template with enhanced error handling
    try {
      await templateService.deleteTemplate(id)
      console.log(`[${requestId}] Template deleted successfully`)
    } catch (deleteError) {
      console.error(`[${requestId}] Template deletion error:`, deleteError)
      
      if (deleteError instanceof Error) {
        if (deleteError.message.includes('TEMPLATE_NOT_FOUND')) {
          return NextResponse.json(
            { 
              error: 'Template not found',
              code: 'TEMPLATE_NOT_FOUND',
              requestId
            },
            { status: 404 }
          )
        }
        
        if (deleteError.message.includes('PERMISSION_DENIED')) {
          return NextResponse.json(
            { 
              error: 'Access denied',
              code: 'PERMISSION_DENIED',
              requestId
            },
            { status: 403 }
          )
        }
        
        if (deleteError.message.includes('TEMPLATE_DELETE_FAILED')) {
          return NextResponse.json(
            { 
              error: 'Failed to delete template from database',
              details: deleteError.message,
              code: 'DELETE_FAILED',
              requestId
            },
            { status: 500 }
          )
        }
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to delete template',
          details: deleteError instanceof Error ? deleteError.message : 'Unknown error',
          code: 'DELETE_FAILED',
          requestId
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Template deleted successfully',
      requestId
    })
    
  } catch (error) {
    console.error(`[${requestId}] Unexpected error deleting template:`, error)
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
/**
 * 
Validate if content is JSONB-compatible
 */
function isValidJsonbContent(content: any): boolean {
  try {
    // Check for circular references and non-serializable values
    JSON.stringify(content)
    
    // Check for undefined values (not allowed in JSONB)
    const hasUndefined = JSON.stringify(content).includes('undefined')
    if (hasUndefined) return false
    
    // Check for functions (not allowed in JSONB)
    const hasFunctions = containsFunctions(content)
    if (hasFunctions) return false
    
    return true
  } catch (error) {
    return false
  }
}

/**
 * Check if object contains functions
 */
function containsFunctions(obj: any): boolean {
  if (typeof obj === 'function') return true
  
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (containsFunctions(obj[key])) return true
      }
    }
  }
  
  return false
}

/**
 * Validate if content is valid TipTap structure
 */
function isValidTiptapContent(content: any): boolean {
  if (!content || typeof content !== 'object') return false
  
  // Check for TipTap document structure
  if (content.type === 'doc') {
    return Array.isArray(content.content) || content.content === undefined
  }
  
  // Check for array format (legacy)
  if (Array.isArray(content)) {
    return content.every(node => 
      node && typeof node === 'object' && typeof node.type === 'string'
    )
  }
  
  return false
}

/**
 * Sanitize content for JSONB storage
 */
function sanitizeJsonbContent(content: any): any {
  if (content === null || content === undefined) {
    return null
  }
  
  if (typeof content === 'function') {
    return null
  }
  
  if (Array.isArray(content)) {
    return content.map(sanitizeJsonbContent).filter(item => item !== null)
  }
  
  if (typeof content === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(content)) {
      const sanitizedValue = sanitizeJsonbContent(value)
      if (sanitizedValue !== null) {
        sanitized[key] = sanitizedValue
      }
    }
    return sanitized
  }
  
  // Primitive values
  return content
}