import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { filePath, fileName, timestamp } = await request.json()

    if (!filePath || !fileName) {
      return NextResponse.json({ error: 'File path and name are required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate that the path belongs to the user
    if (!filePath.startsWith(`user_${user.id}`)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }

    // Check if this is a template file in the Vorlagen folder
    const pathSegments = filePath.split('/')
    const isVorlagenFolder = pathSegments.length >= 2 && pathSegments[1] === 'Vorlagen'
    const isTemplateFile = fileName.endsWith('.vorlage')

    if (isVorlagenFolder && isTemplateFile) {
      // Handle template file reading
      const templateName = fileName.replace('.vorlage', '')
      
      const { data: template, error: templateError } = await supabase
        .from('Vorlagen')
        .select('*')
        .eq('user_id', user.id)
        .eq('titel', templateName)
        .single()

      if (templateError || !template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }

      console.log(`Template read successfully: ${templateName}, content length: ${template.inhalt?.length || 0}`)

      return NextResponse.json({ 
        content: template.inhalt || '',
        template: template
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'ETag': `"template-${template.id}-${template.aktualisiert_am}"` 
        }
      })
    }

    // Handle regular file reading
    const fullPath = `${filePath}/${fileName}`.replace(/\/+/g, '/').replace(/^\//, '')

    console.log(`Reading file: ${fullPath} (timestamp: ${timestamp || 'none'})`)

    // Download the file from Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .download(fullPath)

    if (error) {
      console.error('Error downloading file:', error)
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }

    // Convert blob to text
    const content = await data.text()

    console.log(`File read successfully: ${fullPath}, content length: ${content.length}`)
    
    // Return with cache-busting headers
    return NextResponse.json({ content }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `"${Date.now()}-${content.length}"` // Unique ETag based on timestamp and content
      }
    })
  } catch (error) {
    console.error('Error reading file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}