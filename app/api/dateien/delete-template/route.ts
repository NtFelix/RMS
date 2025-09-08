import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filePath } = body

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      )
    }

    // Extract file name from path
    const pathSegments = filePath.split('/')
    const fileName = pathSegments[pathSegments.length - 1]

    // Check if this is a template file
    if (!fileName.endsWith('.vorlage')) {
      return NextResponse.json(
        { error: 'Not a template file' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract template name
    const templateName = fileName.replace('.vorlage', '')

    // Get template by name to get the ID
    const { data: template, error: templateError } = await supabase
      .from('Vorlagen')
      .select('id')
      .eq('user_id', user.id)
      .eq('titel', templateName)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Delete template
    const { error: deleteError } = await supabase
      .from('Vorlagen')
      .delete()
      .eq('id', template.id)
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
    console.error('Error deleting template file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}