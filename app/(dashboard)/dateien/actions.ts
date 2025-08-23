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
    
    // List files from Supabase Storage
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
        error: 'Fehler beim Laden der Dateien'
      }
    }

    // Map FileObject[] to StorageFile[]
    const files: StorageFile[] = (data || [])
      .filter(file => file.name !== '.keep') // Filter out placeholder files
      .map(file => ({
        name: file.name,
        id: file.id || file.name,
        updated_at: file.updated_at || new Date().toISOString(),
        created_at: file.created_at || new Date().toISOString(),
        last_accessed_at: file.last_accessed_at || new Date().toISOString(),
        metadata: file.metadata || {},
        size: file.metadata?.size || 0,
      }))

    return { files }
  } catch (error) {
    console.error('Error in getInitialFiles:', error)
    return {
      files: [],
      error: 'Unerwarteter Fehler beim Laden der Dateien'
    }
  }
}