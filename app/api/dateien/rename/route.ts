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

    // Clean and validate the file path
    let cleanFilePath = filePath
    
    // Remove leading slash if present
    if (cleanFilePath.startsWith('/')) {
      cleanFilePath = cleanFilePath.slice(1)
    }
    
    // Split path and get directory and filename
    const pathSegments = cleanFilePath.split('/')
    const directory = pathSegments.slice(0, -1).join('/')
    const currentFileName = pathSegments[pathSegments.length - 1]
    
    // Construct new path
    const newPath = `${directory}/${newName}`
    
    console.log('Renaming file - Debug info:', {
      originalFilePath: filePath,
      cleanFilePath: cleanFilePath,
      pathSegments: pathSegments,
      directory: directory,
      currentFileName: currentFileName,
      newName: newName,
      newPath: newPath
    })

    // First, let's try to find the file using different approaches
    console.log('Searching for file in multiple ways...')

    // Approach 1: List files in the directory
    const { data: existingFiles, error: listError } = await supabase.storage
      .from('documents')
      .list(directory, {
        limit: 1000
      })

    if (listError) {
      console.error('Error listing directory contents:', listError)
      return NextResponse.json(
        { error: `Fehler beim Prüfen des Verzeichnisses: ${listError.message}` },
        { status: 500 }
      )
    }

    console.log('Directory contents:', {
      directory,
      filesFound: existingFiles?.length || 0,
      files: existingFiles?.map(f => ({
        name: f.name,
        id: f.id,
        hasSize: !!f.metadata?.size
      })) || []
    })

    // Approach 2: Try to search for the file in the entire user directory
    const userDirectory = `user_${user.id}`
    const { data: allUserFiles, error: searchError } = await supabase.storage
      .from('documents')
      .list(userDirectory, {
        limit: 1000,
        search: currentFileName
      })

    if (!searchError && allUserFiles) {
      console.log('Search results for file in user directory:', {
        searchTerm: currentFileName,
        resultsFound: allUserFiles.length,
        results: allUserFiles.map(f => ({
          name: f.name,
          id: f.id,
          hasSize: !!f.metadata?.size
        }))
      })
    }

    // Find the exact file in the directory listing
    const targetFile = existingFiles?.find(file => file.name === currentFileName)
    
    if (!targetFile) {
      console.error('File not found in directory:', {
        directory,
        searchingFor: currentFileName,
        availableFiles: existingFiles?.map(f => f.name) || []
      })
      return NextResponse.json(
        { error: `Datei "${currentFileName}" nicht im Verzeichnis "${directory}" gefunden` },
        { status: 404 }
      )
    }

    console.log('Found target file:', {
      name: targetFile.name,
      id: targetFile.id,
      metadata: targetFile.metadata
    })

    // Now let's try to find the actual file path by searching
    let actualFilePath = cleanFilePath
    
    // If we found the file in the search results, use that information
    if (allUserFiles && allUserFiles.length > 0) {
      const searchResult = allUserFiles.find(f => f.name === currentFileName)
      if (searchResult) {
        console.log('Found file in search results:', searchResult)
        // The file might be in a different location than expected
        // We need to construct the full path to this file
        // Since search doesn't give us the full path, we'll try the original approach first
      }
    }

    // Try multiple path approaches
    const pathsToTry = [
      // Original approach
      { from: cleanFilePath, to: newPath, description: 'original path' },
      // Try with the file ID if it exists and is different from name
      ...(targetFile.id && targetFile.id !== targetFile.name ? [
        { from: `${directory}/${targetFile.id}`, to: `${directory}/${newName}`, description: 'using file ID' }
      ] : []),
      // Try with URL encoding
      { from: `${directory}/${encodeURIComponent(currentFileName)}`, to: `${directory}/${encodeURIComponent(newName)}`, description: 'URL encoded' },
      // Try the file in the root user directory (maybe it's not in a subdirectory)
      { from: `${userDirectory}/${currentFileName}`, to: `${userDirectory}/${newName}`, description: 'user root directory' },
      // Try without any directory prefix
      { from: currentFileName, to: newName, description: 'filename only' }
    ]

    let moveSucceeded = false
    let lastError = null

    for (const pathAttempt of pathsToTry) {
      console.log(`Attempting to move file (${pathAttempt.description}):`, {
        from: pathAttempt.from,
        to: pathAttempt.to
      })

      try {
        // First, let's try to download the file to verify it exists at this path
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(pathAttempt.from)

        if (downloadError) {
          console.log(`File not accessible at ${pathAttempt.from}:`, downloadError.message)
          continue
        }

        console.log(`File confirmed to exist at ${pathAttempt.from}, attempting move...`)

        // Now try the move operation
        const { error: moveError } = await supabase.storage
          .from('documents')
          .move(pathAttempt.from, pathAttempt.to)

        if (!moveError) {
          console.log(`Move succeeded with ${pathAttempt.description}!`)
          moveSucceeded = true
          break
        } else {
          console.error(`Move failed with ${pathAttempt.description}:`, moveError.message)
          lastError = moveError
        }
      } catch (error) {
        console.error(`Exception during ${pathAttempt.description}:`, error)
        lastError = error
      }
    }

    if (!moveSucceeded) {
      console.error('All move attempts failed. Last error:', lastError)
      return NextResponse.json(
        { error: `Fehler beim Umbenennen: ${lastError?.message || 'Alle Versuche fehlgeschlagen'}` },
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