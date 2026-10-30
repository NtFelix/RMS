import { checkStoragePathAccess, resolveChildPath } from "@/lib/storage-access"
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NO_CACHE_HEADERS } from '@/lib/constants/http'
import { escapeLikePattern } from '@/lib/storage-paths'


export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        {
          status: 401,
          headers: NO_CACHE_HEADERS,
        }
      )
    }

    const { filePath, newName } = await request.json()

    if (!filePath || !newName) {
      return NextResponse.json(
        { error: 'Dateipfad und neuer Name sind erforderlich' },
        {
          status: 400,
          headers: NO_CACHE_HEADERS,
        }
      )
    }

    // Source AND target must be writable: the target is built from the validated new name only
    const sourceError = await checkStoragePathAccess(supabase, user.id, filePath, { mode: 'write' })
    if (sourceError) {
      return NextResponse.json({ error: sourceError }, { status: 403, headers: NO_CACHE_HEADERS })
    }

    // Get directory and filename (filePath is a validated storage path: no leading slash, no empty segments)
    const pathSegments = filePath.split('/')
    const directory = pathSegments.slice(0, -1).join('/')
    const currentFileName = pathSegments[pathSegments.length - 1]

    const target = await resolveChildPath(supabase, user.id, directory, newName, { mode: 'write' })
    if ('error' in target) {
      return NextResponse.json({ error: target.error }, { status: target.status, headers: NO_CACHE_HEADERS })
    }
    const newPath = target.path

    console.log('Simple rename attempt:', {
      from: filePath,
      to: newPath,
      directory,
      currentFileName,
      newName
    })

    // Debug: Log the paths being used
    console.log('Rename operation details:', {
      originalFilePath: filePath,
      directory,
      currentFileName,
      newName,
      newPath,
      userId: user.id
    })

    // First, try to find the actual file by querying the database
    console.log('Searching for file in DB:', directory)

    const { data: dbFile, error: dbError } = await supabase
      .from('Dokumente_Metadaten')
      .select('dateiname')
      .eq('dateipfad', directory)
      .eq('dateiname', currentFileName)
      .single()

    let actualFileName = currentFileName
    let fileFound = false

    if (dbFile) {
      actualFileName = dbFile.dateiname
      fileFound = true
      console.log('Found file with exact match in DB')
    } else {
      // Try case-insensitive match
      const { data: similarFiles } = await supabase
        .from('Dokumente_Metadaten')
        .select('dateiname')
        .eq('dateipfad', directory)
        .ilike('dateiname', escapeLikePattern(currentFileName))

      // A literal `*` of the name would still act as a wildcard in PostgREST, so compare the rows exactly
      const caseInsensitiveMatches = (similarFiles ?? []).filter(
        (candidate) => candidate.dateiname.toLowerCase() === currentFileName.toLowerCase(),
      )
      if (caseInsensitiveMatches.length > 0) {
        actualFileName = caseInsensitiveMatches[0].dateiname
        fileFound = true
        console.log('Found file with case-insensitive match in DB:', { searched: currentFileName, found: actualFileName })
      }
    }

    if (!fileFound) {
      console.error('File not found in DB:', {
        searchedFor: currentFileName,
        directory
      })
      return NextResponse.json(
        { error: `Datei "${currentFileName}" nicht im Verzeichnis "${directory}" gefunden` },
        {
          status: 404,
          headers: NO_CACHE_HEADERS,
        }
      )
    }

    // Update paths with the actual filename found
    const actualFilePath = `${directory}/${actualFileName}`
    const actualNewPath = newPath

    console.log('Using actual file paths:', {
      from: actualFilePath,
      to: actualNewPath
    })

    // Skip download verification for performance as we trust the DB
    // If the file is in DB but not in storage, the move operation will fail anyway
    console.log('Skipping download verification, proceeding to move...')

    // Update Dokumente_Metadaten BEFORE storage move
    // This prevents the delete trigger from deleting the metadata if the move is implemented as copy+delete
    try {
      console.log('Updating DB metadata before storage move...')
      const { error: dbUpdateError } = await supabase
        .from('Dokumente_Metadaten')
        .update({
          dateipfad: directory,
          dateiname: newName,
          aktualisierungsdatum: new Date().toISOString()
        })
        .eq('dateipfad', directory)
        .eq('dateiname', actualFileName)

      if (dbUpdateError) {
        console.error('Failed to update DB metadata:', dbUpdateError)
        return NextResponse.json(
          { error: `Fehler beim Aktualisieren der Metadaten: ${dbUpdateError.message}` },
          {
            status: 500,
            headers: NO_CACHE_HEADERS,
          }
        )
      }
    } catch (dbError) {
      console.error('Failed to update Dokumente_Metadaten:', dbError)
      return NextResponse.json(
        { error: 'Fehler beim Aktualisieren der Metadaten' },
        {
          status: 500,
          headers: NO_CACHE_HEADERS,
        }
      )
    }

    // Helper function to rollback DB changes on storage failure
    const rollbackDbChanges = async () => {
      try {
        console.log('Rolling back DB metadata to original state...')
        await supabase
          .from('Dokumente_Metadaten')
          .update({
            dateipfad: directory,
            dateiname: actualFileName,
            aktualisierungsdatum: new Date().toISOString()
          })
          .eq('dateipfad', directory)
          .eq('dateiname', newName)
        console.log('DB rollback completed successfully')
      } catch (rollbackError) {
        console.error('CRITICAL: Failed to rollback DB changes:', rollbackError)
      }
    }

    // Try Supabase's move operation first
    console.log('Attempting move operation...')
    const { error: moveError } = await supabase.storage
      .from('documents')
      .move(actualFilePath, actualNewPath)

    if (moveError) {
      console.warn('Move operation failed, trying copy + delete approach:', moveError)

      // Fallback: Use storage.copy() + delete approach (more efficient than download+upload)
      try {
        const { error: copyError } = await supabase.storage
          .from('documents')
          .copy(actualFilePath, actualNewPath)

        if (copyError) {
          console.error('Copy operation failed:', copyError)
          // Rollback DB changes
          await rollbackDbChanges()
          return NextResponse.json(
            { error: `Datei kann nicht kopiert werden: ${copyError.message}` },
            {
              status: 500,
              headers: NO_CACHE_HEADERS,
            }
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
          // Rollback DB changes
          await rollbackDbChanges()
          return NextResponse.json(
            { error: `Originaldatei kann nicht gelöscht werden: ${deleteError.message}` },
            {
              status: 500,
              headers: NO_CACHE_HEADERS,
            }
          )
        }

        console.log('Copy + delete approach completed successfully!')
      } catch (fallbackError) {
        console.error('Fallback approach failed:', fallbackError)
        // Rollback DB changes
        await rollbackDbChanges()
        return NextResponse.json(
          { error: `Umbenennung fehlgeschlagen: ${fallbackError instanceof Error ? fallbackError.message : 'Unbekannter Fehler'}` },
          {
            status: 500,
            headers: NO_CACHE_HEADERS,
          }
        )
      }
    } else {
      console.log('Move operation completed successfully!')
    }

    // DB update is now done before storage move
    console.log('✅ DB update completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Datei erfolgreich umbenannt'
    }, { headers: NO_CACHE_HEADERS })

  } catch (error) {
    console.error('Error renaming file:', error)

    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Fehler beim Umbenennen der Datei'
      },
      {
        status: 500,
        headers: NO_CACHE_HEADERS,
      }
    )
  }
}