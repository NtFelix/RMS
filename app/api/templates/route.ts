import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { templateService } from '@/lib/template-service'
import { templateValidationService } from '@/lib/template-validation-service'
import { CreateTemplateRequest } from '@/types/template'
import { 
  validateCreateTemplateRequest,
  VALIDATION_LIMITS 
} from '@/lib/template-validation-schemas'

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
  const startTime = Date.now()
  let requestId: string | undefined
  
  try {
    // Generate request ID for logging
    requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log(`[${requestId}] POST /api/templates - Starting template creation`)
    
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
    console.log(`[${requestId}] Template creation request:`, {
      titel: titel ? `"${String(titel).substring(0, 50)}${String(titel).length > 50 ? '...' : ''}"` : 'undefined',
      kategorie: kategorie ? `"${String(kategorie)}"` : 'undefined',
      hasContent: !!inhalt,
      contentType: typeof inhalt
    })

    // Enhanced validation using Zod schemas
    const validationResult = validateCreateTemplateRequest({
      titel,
      inhalt,
      kategorie,
      user_id: user.id
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

    // Enhanced content validation for JSONB compatibility
    let contentValidationResult: { isValid: boolean; errors: any[]; warnings: any[] }
    
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

    // Create template request with proper data sanitization
    const createRequest: CreateTemplateRequest = {
      titel: validatedData.titel,
      inhalt: sanitizeJsonbContent(validatedData.inhalt),
      kategorie: validatedData.kategorie,
      user_id: validatedData.user_id
    }

    console.log(`[${requestId}] Creating template with sanitized data`)

    // Create the template with enhanced error handling
    let template
    try {
      template = await templateService.createTemplate(createRequest)
      console.log(`[${requestId}] Template created successfully:`, template.id)
      
    } catch (createError) {
      console.error(`[${requestId}] Template creation error:`, createError)
      
      // Handle specific template service errors
      if (createError instanceof Error) {
        if (createError.message.includes('PERMISSION_DENIED')) {
          return NextResponse.json(
            { 
              error: 'Access denied',
              details: 'Insufficient permissions to create template',
              code: 'PERMISSION_DENIED',
              requestId
            },
            { status: 403 }
          )
        }
        
        if (createError.message.includes('INVALID_TEMPLATE_DATA')) {
          return NextResponse.json(
            { 
              error: 'Invalid template data',
              details: createError.message,
              code: 'INVALID_DATA',
              requestId
            },
            { status: 400 }
          )
        }
        
        if (createError.message.includes('TEMPLATE_SAVE_FAILED')) {
          return NextResponse.json(
            { 
              error: 'Failed to save template to database',
              details: createError.message,
              code: 'SAVE_FAILED',
              requestId
            },
            { status: 500 }
          )
        }

        if (createError.message.includes('DUPLICATE_TITLE')) {
          return NextResponse.json(
            { 
              error: 'Template with this title already exists',
              details: createError.message,
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
          error: 'Failed to create template',
          details: createError instanceof Error ? createError.message : 'Unknown error',
          code: 'CREATE_FAILED',
          requestId
        },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    console.log(`[${requestId}] Template creation completed successfully in ${duration}ms`)
    
    // Return success response with created template
    return NextResponse.json({ 
      template,
      validationWarnings: contentValidationResult.warnings,
      message: 'Template created successfully',
      requestId,
      duration
    }, { status: 201 })
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[${requestId}] Unexpected error creating template (${duration}ms):`, error)
    
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
 * Validate if content is JSONB-compatible
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