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

    // Perform the rename operation using the authenticated server-side client
    console.log('Performing rename operation:', {
      from: cleanFilePath,
      to: newPath
    })
    
    // First, check if the source file exists
    const { data: sourceFile, error: downloadError } = await supabase.storage
      .from('documents')
      .download(cleanFilePath)
    
    if (downloadError) {
      console.error('Source file not found:', downloadError)
      return NextResponse.json(
        { error: `Quelldatei nicht gefunden: ${downloadError.message}` },
        { status: 404 }
      )
    }
    
    // Use Supabase's move operation to rename the file
    const { error: moveError } = await supabase.storage
      .from('documents')
      .move(cleanFilePath, newPath)
    
    if (moveError) {
      console.error('Move operation failed:', moveError)
      return NextResponse.json(
        { error: `Datei kann nicht umbenannt werden: ${moveError.message}` },
        { status: 500 }
      )
    }
    
    console.log('Rename operation completed successfully!')
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