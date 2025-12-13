export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
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

    // Debug: Log the paths being used
    console.log('Rename operation details:', {
      originalFilePath: filePath,
      cleanFilePath,
      directory,
      currentFileName,
      newName,
      newPath,
      userId: user.id
    })
    
    // First, try to find the actual file by searching the directory
    console.log('Searching for file in directory:', directory)
    
    const { data: directoryContents, error: listError } = await supabase.storage
      .from('documents')
      .list(directory, { limit: 1000 })
    
    if (listError) {
      console.error('Error listing directory:', listError)
      return NextResponse.json(
        { error: `Verzeichnis kann nicht gelesen werden: ${listError.message}` },
        { status: 500 }
      )
    }
    
    console.log('Directory contents:', {
      directory,
      fileCount: directoryContents?.length || 0,
      files: directoryContents?.map(f => ({
        name: f.name,
        size: f.metadata?.size,
        hasMetadata: !!f.metadata
      })) || []
    })
    
    // Find the file in the directory listing
    let actualFileName = currentFileName
    let fileFound = false
    
    // Try exact match first
    const exactMatch = directoryContents?.find(f => f.name === currentFileName && f.metadata?.size)
    if (exactMatch) {
      fileFound = true
      console.log('Found file with exact match')
    } else {
      // Try case-insensitive match
      const caseInsensitiveMatch = directoryContents?.find(f => 
        f.name.toLowerCase() === currentFileName.toLowerCase() && f.metadata?.size
      )
      if (caseInsensitiveMatch) {
        actualFileName = caseInsensitiveMatch.name
        fileFound = true
        console.log('Found file with case-insensitive match:', { searched: currentFileName, found: actualFileName })
      } else {
        // Try partial match
        const partialMatch = directoryContents?.find(f => 
          (f.name.includes(currentFileName) || currentFileName.includes(f.name)) && f.metadata?.size
        )
        if (partialMatch) {
          actualFileName = partialMatch.name
          fileFound = true
          console.log('Found file with partial match:', { searched: currentFileName, found: actualFileName })
        }
      }
    }
    
    if (!fileFound) {
      console.error('File not found in directory listing:', {
        searchedFor: currentFileName,
        directory,
        availableFiles: directoryContents?.filter(f => f.metadata?.size).map(f => f.name) || []
      })
      return NextResponse.json(
        { error: `Datei "${currentFileName}" nicht im Verzeichnis "${directory}" gefunden` },
        { status: 404 }
      )
    }
    
    // Update paths with the actual filename found
    const actualFilePath = `${directory}/${actualFileName}`
    const actualNewPath = `${directory}/${newName}`
    
    console.log('Using actual file paths:', {
      from: actualFilePath,
      to: actualNewPath
    })
    
    // First, try to verify the file exists by downloading it
    console.log('Verifying file exists by attempting download...')
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(actualFilePath)
    
    if (downloadError) {
      console.error('File verification failed - cannot download:', downloadError)
      return NextResponse.json(
        { error: `Datei kann nicht gelesen werden: ${downloadError.message}` },
        { status: 404 }
      )
    }
    
    console.log('File verification successful, file size:', fileData?.size)
    
    // Try Supabase's move operation first
    console.log('Attempting move operation...')
    const { error: moveError } = await supabase.storage
      .from('documents')
      .move(actualFilePath, actualNewPath)
    
    if (moveError) {
      console.warn('Move operation failed, trying copy + delete approach:', moveError)
      
      // Fallback: Use copy + delete approach
      try {
        // Upload the file with the new name
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(actualNewPath, fileData, {
            upsert: false // Don't overwrite if exists
          })
        
        if (uploadError) {
          console.error('Copy operation failed:', uploadError)
          return NextResponse.json(
            { error: `Datei kann nicht kopiert werden: ${uploadError.message}` },
            { status: 500 }
          )
        }
        
        console.log('File copied successfully, now deleting original...')
        
        // Delete the original file
        const { error: deleteError } = await supabase.storage
          .from('documents')
          .remove([actualFilePath])
        
        if (deleteError) {
          console.error('Delete operation failed:', deleteError)
          // Try to clean up the new file
          await supabase.storage.from('documents').remove([actualNewPath])
          return NextResponse.json(
            { error: `Originaldatei kann nicht gelöscht werden: ${deleteError.message}` },
            { status: 500 }
          )
        }
        
        console.log('Copy + delete approach completed successfully!')
      } catch (fallbackError) {
        console.error('Fallback approach failed:', fallbackError)
        return NextResponse.json(
          { error: `Umbenennung fehlgeschlagen: ${fallbackError instanceof Error ? fallbackError.message : 'Unbekannter Fehler'}` },
          { status: 500 }
        )
      }
    } else {
      console.log('Move operation completed successfully!')
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