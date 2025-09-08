import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { filePath, fileName, content } = await request.json()

    if (!filePath || !fileName || content === undefined) {
      return NextResponse.json({ error: 'File path, name, and content are required' }, { status: 400 })
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
      // Handle template file updating
      const templateName = fileName.replace('.vorlage', '')
      
      // Get template by name to get the ID
      const { data: template, error: templateError } = await supabase
        .from('Vorlagen')
        .select('id')
        .eq('user_id', user.id)
        .eq('titel', templateName)
        .single()

      if (templateError || !template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }

      // Update template content
      const { error: updateError } = await supabase
        .from('Vorlagen')
        .update({ 
          inhalt: content,
          aktualisiert_am: new Date().toISOString()
        })
        .eq('id', template.id)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating template:', updateError)
        return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
      }

      console.log(`Template updated successfully: ${templateName}, content length: ${content.length}`)

      return NextResponse.json({ success: true }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    // Handle regular file updating
    const fullPath = `${filePath}/${fileName}`.replace(/\/+/g, '/').replace(/^\//, '')

    console.log(`Updating file: ${fullPath}, content length: ${content.length}`)

    // Create a blob from the content
    const blob = new Blob([content], { type: 'text/markdown' })

    // Try to upload with upsert first
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fullPath, blob, {
        upsert: true,
        contentType: 'text/markdown',
        cacheControl: '0' // Disable caching to ensure fresh content
      })

    // If upsert fails due to RLS, try delete-then-upload approach
    if (uploadError) {
      console.log('Upsert failed, trying delete-then-upload approach:', uploadError)
      
      // Delete the existing file
      const { error: deleteError } = await supabase.storage
        .from('documents')
        .remove([fullPath])

      if (deleteError) {
        console.log('Delete error (might be expected):', deleteError)
      }

      // Retry upload with exponential backoff to handle propagation delays
      let uploadSuccess = false
      let lastError = null
      const maxRetries = 3
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Wait with exponential backoff: 100ms, 200ms, 400ms
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)))
        }
        
        const { error: newUploadError } = await supabase.storage
          .from('documents')
          .upload(fullPath, blob, {
            upsert: false,
            contentType: 'text/markdown',
            cacheControl: '0'
          })

        if (!newUploadError) {
          uploadSuccess = true
          break
        }
        
        lastError = newUploadError
        console.log(`Upload attempt ${attempt + 1} failed:`, newUploadError)
      }

      if (!uploadSuccess) {
        console.error('Error uploading file after delete (all retries failed):', lastError)
        return NextResponse.json({ error: 'Failed to save file' }, { status: 500 })
      }
    }

    console.log(`File updated successfully: ${fullPath}`)
    
    // Return with cache-busting headers
    return NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error updating file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}