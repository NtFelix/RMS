import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filePath, newName } = body

    if (!filePath || !newName) {
      return NextResponse.json(
        { error: 'File path and new name are required' },
        { status: 400 }
      )
    }

    // Extract current file name from path
    const pathSegments = filePath.split('/')
    const currentFileName = pathSegments[pathSegments.length - 1]

    // Check if this is a template file
    if (!currentFileName.endsWith('.vorlage')) {
      return NextResponse.json(
        { error: 'Not a template file' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract template names
    const currentTemplateName = currentFileName.replace('.vorlage', '')
    const newTemplateName = newName.replace('.vorlage', '')

    // Get current template
    const { data: template, error: templateError } = await supabase
      .from('Vorlagen')
      .select('id')
      .eq('user_id', user.id)
      .eq('titel', currentTemplateName)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Check if new name already exists
    const { data: existingTemplate, error: checkError } = await supabase
      .from('Vorlagen')
      .select('id')
      .eq('user_id', user.id)
      .eq('titel', newTemplateName)
      .neq('id', template.id)
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

    // Update template name
    const { error: updateError } = await supabase
      .from('Vorlagen')
      .update({ 
        titel: newTemplateName,
        aktualisiert_am: new Date().toISOString()
      })
      .eq('id', template.id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error renaming template:', updateError)
      return NextResponse.json(
        { error: 'Failed to rename template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error renaming template file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}