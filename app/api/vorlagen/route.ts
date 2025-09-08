import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { templateValidator, templateCreateSchema } from '@/lib/template-system/template-validation'
import { withTemplateErrorHandling } from '@/lib/template-system/template-error-handler'

// Use the comprehensive validation schema from template-validation.ts

// GET - Fetch all templates for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch templates for the user
    const { data: templates, error } = await supabase
      .from('Vorlagen')
      .select('*')
      .eq('user_id', user.id)
      .order('erstellungsdatum', { ascending: false })

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    return NextResponse.json(templates)

  } catch (error) {
    console.error('Error in GET /api/vorlagen:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new template with comprehensive validation and error handling
export async function POST(request: NextRequest) {
  const result = await withTemplateErrorHandling(
    async () => {
      const body = await request.json()
      
      // Comprehensive validation using the template validator
      const validationResult = await templateValidator.validateForCreation(body)
      
      if (!validationResult.isValid) {
        const error = new Error('TEMPLATE_VALIDATION_FAILED');
        (error as any).validationErrors = validationResult.errors;
        (error as any).validationWarnings = validationResult.warnings;
        throw error;
      }

      // Basic schema validation as fallback
      const schemaResult = templateCreateSchema.safeParse(body)
      if (!schemaResult.success) {
        const error = new Error('SCHEMA_VALIDATION_FAILED');
        (error as any).schemaErrors = schemaResult.error.errors;
        throw error;
      }

      const { titel, inhalt, kategorie, kontext_anforderungen } = schemaResult.data

      const supabase = createClient()

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        const error = new Error('UNAUTHORIZED');
        (error as any).code = 'AUTH_ERROR';
        throw error;
      }

      // Check if template name already exists for this user
      const { data: existingTemplate, error: checkError } = await supabase
        .from('Vorlagen')
        .select('id')
        .eq('user_id', user.id)
        .eq('titel', titel)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        const error = new Error('DATABASE_CHECK_FAILED');
        (error as any).code = checkError.code;
        (error as any).originalError = checkError;
        throw error;
      }

      if (existingTemplate) {
        const error = new Error('TEMPLATE_NAME_EXISTS');
        (error as any).code = 'DUPLICATE_NAME';
        throw error;
      }

      // Create the template
      const { data: template, error: createError } = await supabase
        .from('Vorlagen')
        .insert({
          user_id: user.id,
          titel,
          inhalt,
          kategorie,
          kontext_anforderungen: kontext_anforderungen || []
        })
        .select()
        .single()

      if (createError) {
        const error = new Error('TEMPLATE_CREATE_FAILED');
        (error as any).code = createError.code;
        (error as any).originalError = createError;
        throw error;
      }

      return {
        success: true,
        template,
        validation: validationResult
      };
    },
    {
      operation: 'Template-Erstellung (API)',
      userId: 'api-user', // This would come from auth
      timestamp: new Date(),
      additionalData: { endpoint: '/api/vorlagen', method: 'POST' }
    },
    {
      retryCount: 1,
      retryDelay: 500,
      showToUser: false // API errors shouldn't show toasts
    }
  );

  if (result.success && result.data) {
    return NextResponse.json(result.data.template, { status: 201 });
  } else if (result.error) {
    // Handle specific error types
    const error = result.error;
    
    if (error.message.includes('TEMPLATE_VALIDATION_FAILED')) {
      return NextResponse.json(
        { 
          error: 'Template validation failed',
          details: (error as any).validationErrors || [],
          warnings: (error as any).validationWarnings || [],
          errorId: error.errorId
        },
        { status: 400 }
      );
    }
    
    if (error.message.includes('SCHEMA_VALIDATION_FAILED')) {
      return NextResponse.json(
        { 
          error: 'Schema validation failed',
          details: (error as any).schemaErrors || [],
          errorId: error.errorId
        },
        { status: 400 }
      );
    }
    
    if (error.message.includes('UNAUTHORIZED')) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          errorId: error.errorId
        },
        { status: 401 }
      );
    }
    
    if (error.message.includes('TEMPLATE_NAME_EXISTS')) {
      return NextResponse.json(
        { 
          error: 'A template with this name already exists',
          errorId: error.errorId
        },
        { status: 409 }
      );
    }
    
    // Generic error response
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create template',
        errorId: error.errorId,
        recoveryActions: error.recoveryActions
      },
      { status: 500 }
    );
  }

  // Fallback error response
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}