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

    // Let's find the file by searching recursively
    console.log('Searching for file recursively...')
    
    async function findFileRecursively(searchPath: string, targetFileName: string): Promise<string | null> {
      try {
        const { data: items, error } = await supabase.storage
          .from('documents')
          .list(searchPath, { limit: 1000 })
        
        if (error) {
          console.log(`Could not list ${searchPath}:`, error.message)
          return null
        }
        
        // Check if the file is directly in this directory
        const directFile = items?.find(item => item.name === targetFileName && item.metadata?.size)
        if (directFile) {
          return `${searchPath}/${targetFileName}`
        }
        
        // Check subdirectories (folders don't have metadata.size)
        const folders = items?.filter(item => !item.metadata?.size && !item.name.includes('.') && item.name !== '.keep') || []
        
        for (const folder of folders) {
          const subPath = `${searchPath}/${folder.name}`
          const found = await findFileRecursively(subPath, targetFileName)
          if (found) {
            return found
          }
        }
        
        return null
      } catch (error) {
        console.log(`Error searching in ${searchPath}:`, error)
        return null
      }
    }
    
    // Search for the file starting from the user's root directory
    const actualFilePath = await findFileRecursively(`user_${user.id}`, currentFileName)
    
    if (!actualFilePath) {
      return NextResponse.json(
        { error: `Datei "${currentFileName}" nicht gefunden` },
        { status: 404 }
      )
    }
    
    console.log('Found file at actual path:', actualFilePath)
    
    // Construct the new path in the same directory as the found file
    const actualDirectory = actualFilePath.substring(0, actualFilePath.lastIndexOf('/'))
    const actualNewPath = `${actualDirectory}/${newName}`
    
    console.log('Moving file:', {
      from: actualFilePath,
      to: actualNewPath
    })
    
    // Let's try a different approach: copy and delete instead of move
    console.log('Trying copy and delete approach...')
    
    // First, download the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(actualFilePath)
    
    if (downloadError) {
      console.error('Could not download file for copy:', downloadError.message)
      return NextResponse.json(
        { error: `Datei kann nicht gelesen werden: ${downloadError.message}` },
        { status: 500 }
      )
    }
    
    console.log('File downloaded successfully, uploading with new name...')
    
    // Upload the file with the new name
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(actualNewPath, fileData, {
        upsert: false // Don't overwrite if exists
      })
    
    if (uploadError) {
      console.error('Could not upload file with new name:', uploadError.message)
      return NextResponse.json(
        { error: `Datei kann nicht mit neuem Namen erstellt werden: ${uploadError.message}` },
        { status: 500 }
      )
    }
    
    console.log('File uploaded with new name, deleting original...')
    
    // Delete the original file
    const { error: deleteError } = await supabase.storage
      .from('documents')
      .remove([actualFilePath])
    
    if (deleteError) {
      console.error('Could not delete original file:', deleteError.message)
      // Try to clean up the new file
      await supabase.storage.from('documents').remove([actualNewPath])
      return NextResponse.json(
        { error: `Originaldatei kann nicht gelöscht werden: ${deleteError.message}` },
        { status: 500 }
      )
    }

    console.log('Rename completed successfully using copy and delete!')

    console.log('Move succeeded!')
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