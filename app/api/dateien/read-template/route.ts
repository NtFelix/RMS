import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getTemplateContent, extractTemplateId } from '@/lib/template-system/vorlagen-folder-integration'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filePath, fileName } = body

    if (!filePath || !fileName) {
      return NextResponse.json(
        { error: 'File path and name are required' },
        { status: 400 }
      )
    }

    // Check if this is a template file
    if (!fileName.endsWith('.vorlage')) {
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

    // Extract template ID from file path or name
    // For template files, we need to look up by name since the path contains the template name
    const templateName = fileName.replace('.vorlage', '')
    
    // Get template by name
    const { data: template, error: templateError } = await supabase
      .from('Vorlagen')
      .select('*')
      .eq('user_id', user.id)
      .eq('titel', templateName)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      content: template.inhalt || '',
      template: template
    })

  } catch (error) {
    console.error('Error reading template file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}