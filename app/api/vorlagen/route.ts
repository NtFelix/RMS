import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

// Validation schema for template creation
const createTemplateSchema = z.object({
  titel: z.string()
    .min(1, 'Template name is required')
    .max(100, 'Template name must be 100 characters or less'),
  inhalt: z.string()
    .min(1, 'Template content is required'),
  kategorie: z.string()
    .min(1, 'Category is required'),
  kontext_anforderungen: z.array(z.string()).default([])
})

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

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validationResult = createTemplateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const { titel, inhalt, kategorie, kontext_anforderungen } = validationResult.data

    const supabase = createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if template name already exists for this user
    const { data: existingTemplate, error: checkError } = await supabase
      .from('Vorlagen')
      .select('id')
      .eq('user_id', user.id)
      .eq('titel', titel)
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
      console.error('Error creating template:', createError)
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      )
    }

    return NextResponse.json(template, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/vorlagen:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}