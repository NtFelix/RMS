import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

// Validation schema for template updates
const updateTemplateSchema = z.object({
  titel: z.string()
    .min(1, 'Template name is required')
    .max(100, 'Template name must be 100 characters or less')
    .optional(),
  inhalt: z.string()
    .min(1, 'Template content is required')
    .optional(),
  kategorie: z.string()
    .min(1, 'Category is required')
    .optional(),
  kontext_anforderungen: z.array(z.string()).optional()
})

// GET - Fetch a specific template by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Fetch the template
    const { data: template, error } = await supabase
      .from('Vorlagen')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching template:', error)
      return NextResponse.json(
        { error: 'Failed to fetch template' },
        { status: 500 }
      )
    }

    return NextResponse.json(template)

  } catch (error) {
    console.error('Error in GET /api/vorlagen/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validationResult = updateTemplateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    const supabase = createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if template name already exists for this user (if titel is being updated)
    if (updateData.titel) {
      const { data: existingTemplate, error: checkError } = await supabase
        .from('Vorlagen')
        .select('id')
        .eq('user_id', user.id)
        .eq('titel', updateData.titel)
        .neq('id', params.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing template:', checkError)
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        )
      }

      if (existingTemplate) {
        return NextResponse.json(
          { error: 'A template with this name already exists' },
          { status: 409 }
        )
      }
    }

    // Update the template
    const { data: template, error: updateError } = await supabase
      .from('Vorlagen')
      .update({
        ...updateData,
        aktualisiert_am: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }
      console.error('Error updating template:', updateError)
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      )
    }

    return NextResponse.json(template)

  } catch (error) {
    console.error('Error in PUT /api/vorlagen/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Delete the template
    const { error: deleteError } = await supabase
      .from('Vorlagen')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting template:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in DELETE /api/vorlagen/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}