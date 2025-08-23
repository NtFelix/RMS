'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export interface StorageFile {
  name: string
  id: string
  updated_at: string
  created_at: string
  last_accessed_at: string
  metadata: Record<string, any>
  size: number
}

export async function getInitialFiles(userId: string, path?: string): Promise<{
  files: StorageFile[]
  folders: { name: string; path: string }[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== userId) {
      redirect('/auth/login')
    }

    const targetPath = path || `user_${userId}`
    
    // List files from Supabase Storage for the specific directory
    const { data, error } = await supabase.storage
      .from('documents')
      .list(targetPath, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      console.error('Error loading files:', error)
      return {
        files: [],
        folders: [],
        error: 'Fehler beim Laden der Dateien'
      }
    }

    // Separate files and folders
    const files: StorageFile[] = []
    const folders: { name: string; path: string }[] = []

    ;(data || []).forEach(item => {
      // Skip placeholder files
      if (item.name === '.keep') return
      
      // Check if it's a folder (no metadata.size indicates a folder in Supabase)
      if (!item.metadata?.size && !item.name.includes('.')) {
        folders.push({
          name: item.name,
          path: `${targetPath}/${item.name}`
        })
      } else {
        // It's a file
        files.push({
          name: item.name,
          id: item.id || item.name,
          updated_at: item.updated_at || new Date().toISOString(),
          created_at: item.created_at || new Date().toISOString(),
          last_accessed_at: item.last_accessed_at || new Date().toISOString(),
          metadata: item.metadata || {},
          size: item.metadata?.size || 0,
        })
      }
    })

    return { files, folders }
  } catch (error) {
    console.error('Error in getInitialFiles:', error)
    return {
      files: [],
      folders: [],
      error: 'Unerwarteter Fehler beim Laden der Dateien'
    }
  }
}

export async function getFilesForPath(userId: string, path: string): Promise<{
  files: StorageFile[]
  folders: { name: string; path: string }[]
  error?: string
}> {
  return getInitialFiles(userId, path)
}

export async function loadFilesForPath(userId: string, path: string): Promise<{
  files: StorageFile[]
  folders: { name: string; path: string }[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== userId) {
      return {
        files: [],
        folders: [],
        error: 'Nicht authentifiziert'
      }
    }

    // Validate that the path belongs to the user
    if (!path.startsWith(`user_${userId}`)) {
      return {
        files: [],
        folders: [],
        error: 'Ungültiger Pfad'
      }
    }
    
    // List files from Supabase Storage for the specific directory
    const { data, error } = await supabase.storage
      .from('documents')
      .list(path, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      console.error('Error loading files for path:', path, error)
      return {
        files: [],
        folders: [],
        error: 'Fehler beim Laden der Dateien'
      }
    }

    // Separate files and folders
    const files: StorageFile[] = []
    const folders: { name: string; path: string }[] = []

    ;(data || []).forEach(item => {
      // Skip placeholder files
      if (item.name === '.keep') return
      
      // Check if it's a folder (no metadata.size and no file extension indicates a folder)
      if (!item.metadata?.size && !item.name.includes('.')) {
        folders.push({
          name: item.name,
          path: `${path}/${item.name}`
        })
      } else {
        // It's a file
        files.push({
          name: item.name,
          id: item.id || item.name,
          updated_at: item.updated_at || new Date().toISOString(),
          created_at: item.created_at || new Date().toISOString(),
          last_accessed_at: item.last_accessed_at || new Date().toISOString(),
          metadata: item.metadata || {},
          size: item.metadata?.size || 0,
        })
      }
    })

    return { files, folders }
  } catch (error) {
    console.error('Error in loadFilesForPath:', error)
    return {
      files: [],
      folders: [],
      error: 'Unerwarteter Fehler beim Laden der Dateien'
    }
  }
}