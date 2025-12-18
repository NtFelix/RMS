import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { folderPath, folderName } = await request.json()

    if (!folderPath || !folderName) {
      return NextResponse.json(
        { error: 'Folder path and name are required' },
        { status: 400 }
      )
    }

    // Validate folder name
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(folderName)) {
      return NextResponse.json(
        { error: 'Folder name contains invalid characters' },
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
    if (!folderPath.startsWith(`user_${user.id}`)) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 403 }
      )
    }

    // Create the full path for the new folder
    const newFolderPath = `${folderPath}/${folderName}`

    // Check if folder already exists by trying to list it
    const { data: existingFolder } = await supabase.storage
      .from('documents')
      .list(newFolderPath, { limit: 1 })

    if (existingFolder && existingFolder.length > 0) {
      return NextResponse.json(
        { error: 'Folder already exists' },
        { status: 409 }
      )
    }

    // Create an invisible .keep file to ensure the folder exists
    const keepFilePath = `${newFolderPath}/.keep`
    const keepFileContent = new Blob([''], { type: 'text/plain' })

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(keepFilePath, keepFileContent, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error creating folder:', uploadError)
      return NextResponse.json(
        { error: 'Failed to create folder' },
        { status: 500 }
      )
    }

    // Insert .keep file into Dokumente_Metadaten to make folder visible
    try {
      const { error: dbInsertError } = await supabase
        .from('Dokumente_Metadaten')
        .insert({
          dateipfad: newFolderPath,
          dateiname: '.keep',
          dateigroesse: 0,
          mime_type: 'text/plain',
          user_id: user.id
        })

      if (dbInsertError) {
        throw dbInsertError
      }
    } catch (dbError) {
      console.error('Failed to insert .keep into Dokumente_Metadaten:', dbError)

      // Rollback: delete the orphaned .keep file from storage
      const { error: cleanupError } = await supabase.storage
        .from('documents')
        .remove([keepFilePath])

      if (cleanupError) {
        console.error('CRITICAL: Failed to cleanup orphaned .keep file:', keepFilePath, cleanupError)
      }

      return NextResponse.json(
        { error: 'Failed to save folder metadata' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      folderPath: newFolderPath,
      message: 'Folder created successfully'
    })

  } catch (error) {
    console.error('Unexpected error creating folder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}