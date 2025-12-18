import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { filePath, fileName, content = '' } = await request.json()

    if (!filePath || !fileName) {
      return NextResponse.json(
        { error: 'File path and name are required' },
        { status: 400 }
      )
    }

    // Validate file name
    if (!/^[a-zA-Z0-9_\-\s.]+$/.test(fileName)) {
      return NextResponse.json(
        { error: 'File name contains invalid characters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Validate that the path belongs to the user
    if (!filePath.startsWith(`user_${user.id}`)) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 403 }
      )
    }

    // Create the full path for the new file
    const newFilePath = `${filePath}/${fileName}`

    // Check if file already exists using efficient list method
    const { data: existingFiles } = await supabase.storage
      .from('documents')
      .list(filePath, {
        limit: 1,
        search: fileName,
      })

    if (existingFiles && existingFiles.length > 0) {
      return NextResponse.json(
        { error: 'File already exists' },
        { status: 409 }
      )
    }

    // Create the file with the provided content
    const fileContent = new Blob([content], { type: 'text/markdown' })

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(newFilePath, fileContent, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error creating file:', uploadError)
      return NextResponse.json(
        { error: 'Failed to create file' },
        { status: 500 }
      )
    }

    // Insert into Dokumente_Metadaten
    try {
      await supabase
        .from('Dokumente_Metadaten')
        .insert({
          dateipfad: filePath,
          dateiname: fileName,
          dateigroesse: new Blob([content]).size,
          mime_type: 'text/markdown',
          user_id: user.id
        })
    } catch (dbError) {
      console.error('Failed to insert into Dokumente_Metadaten:', dbError)

      // Critical consistency fix: cleanup the orphaned file from storage
      const { error: cleanupError } = await supabase.storage
        .from('documents')
        .remove([newFilePath])

      if (cleanupError) {
        console.error('CRITICAL: Failed to cleanup orphaned file:', newFilePath, cleanupError)
      }

      return NextResponse.json(
        { error: 'Failed to save file metadata' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      filePath: newFilePath,
      message: 'File created successfully'
    })

  } catch (error) {
    console.error('Unexpected error creating file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}