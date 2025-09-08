export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    const { filePath, newName } = await request.json()

    if (!filePath || !newName) {
      return NextResponse.json(
        { error: 'Dateipfad und neuer Name sind erforderlich' },
        { status: 400 }
      )
    }

    // Validate that the path belongs to the current user
    if (!filePath.startsWith(`user_${user.id}`)) {
      return NextResponse.json(
        { error: 'Zugriff verweigert' },
        { status: 403 }
      )
    }

    // Clean the file path
    let cleanFilePath = filePath
    if (cleanFilePath.startsWith('/')) {
      cleanFilePath = cleanFilePath.slice(1)
    }
    
    // Get directory and filename
    const pathSegments = cleanFilePath.split('/')
    const directory = pathSegments.slice(0, -1).join('/')
    const currentFileName = pathSegments[pathSegments.length - 1]
    const newPath = `${directory}/${newName}`
    
    console.log('Simple rename attempt:', {
      from: cleanFilePath,
      to: newPath,
      directory,
      currentFileName,
      newName
    })

    // Use the storage service's renameFile function which handles path validation and file existence
    console.log('Using storage service renameFile:', {
      filePath: cleanFilePath,
      newName
    })
    
    try {
      const { renameFile } = await import('@/lib/storage-service')
      await renameFile(cleanFilePath, newName)
      console.log('Rename operation completed successfully!')
    } catch (storageError) {
      console.error('Storage service rename failed:', storageError)
      const errorMessage = storageError instanceof Error ? storageError.message : 'Unknown error'
      return NextResponse.json(
        { error: `Datei kann nicht umbenannt werden: ${errorMessage}` },
        { status: 500 }
      )
    }
    return NextResponse.json({ 
      success: true,
      message: 'Datei erfolgreich umbenannt'
    })

  } catch (error) {
    console.error('Error renaming file:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Fehler beim Umbenennen der Datei'
      },
      { status: 500 }
    )
  }
}