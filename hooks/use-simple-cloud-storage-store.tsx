'use client'

import { create } from 'zustand'

// Types for cloud storage state
export interface StorageObject {
  name: string
  id: string
  updated_at: string
  created_at: string
  last_accessed_at: string
  metadata: Record<string, any>
  size: number
}

export interface VirtualFolder {
  name: string
  path: string
  type: 'house' | 'apartment' | 'tenant' | 'category' | 'archive' | 'storage'
  isEmpty: boolean
  children: VirtualFolder[]
  fileCount: number
  displayName?: string
}

export interface BreadcrumbItem {
  name: string
  path: string
  type: 'root' | 'house' | 'apartment' | 'tenant' | 'category'
}

interface SimpleCloudStorageState {
  // Current navigation
  currentPath: string
  breadcrumbs: BreadcrumbItem[]
  
  // File listing
  files: StorageObject[]
  folders: VirtualFolder[]
  isLoading: boolean
  error: string | null
  
  // Actions
  setCurrentPath: (path: string) => void
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void
  setFiles: (files: StorageObject[]) => void
  setFolders: (folders: VirtualFolder[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  navigateToPath: (path: string) => Promise<void>
  refreshCurrentPath: () => Promise<void>
  downloadFile: (file: StorageObject) => Promise<void>
  deleteFile: (file: StorageObject) => Promise<void>
  renameFile: (file: StorageObject, newName: string) => Promise<void>
  reset: () => void
}

const initialState = {
  currentPath: '',
  breadcrumbs: [],
  files: [],
  folders: [],
  isLoading: false,
  error: null,
}

export const useSimpleCloudStorageStore = create<SimpleCloudStorageState>((set, get) => ({
  ...initialState,
  
  // Simple setters without Immer
  setCurrentPath: (path: string) => {
    set({ currentPath: path })
  },
  
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => {
    set({ breadcrumbs })
  },
  
  setFiles: (files: StorageObject[]) => {
    set({ files })
  },
  
  setFolders: (folders: VirtualFolder[]) => {
    set({ folders })
  },
  
  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },
  
  setError: (error: string | null) => {
    set({ error })
  },
  
  // Navigation action
  navigateToPath: async (path: string) => {
    const state = get()
    
    // Prevent navigation to same path
    if (path === state.currentPath) {
      return
    }
    
    set({ 
      currentPath: path,
      error: null,
      isLoading: true 
    })
    
    try {
      // Extract user ID from path
      const userIdMatch = path.match(/^user_([^\/]+)/)
      if (!userIdMatch) {
        throw new Error('Invalid path format')
      }
      const userId = userIdMatch[1]
      
      // Use server action to load files for the new path
      const { loadFilesForPath } = await import('@/app/(dashboard)/dateien/actions')
      const { files, folders, error } = await loadFilesForPath(userId, path)
      
      if (error) {
        throw new Error(error)
      }
      
      // Generate simple breadcrumbs
      const pathSegments = path.split('/').filter(Boolean)
      const breadcrumbs: BreadcrumbItem[] = []
      
      // Always add root breadcrumb
      breadcrumbs.push({
        name: 'Cloud Storage',
        path: `user_${userId}`,
        type: 'root'
      })
      
      // Add path segments as breadcrumbs
      let currentPath = `user_${userId}`
      for (let i = 1; i < pathSegments.length; i++) {
        const segment = pathSegments[i]
        currentPath = `${currentPath}/${segment}`
        
        breadcrumbs.push({
          name: segment,
          path: currentPath,
          type: i === 1 ? 'house' : i === 2 ? 'apartment' : i === 3 ? 'tenant' : 'category'
        })
      }
      
      set({
        files,
        folders: folders.map(folder => ({
          name: folder.name,
          path: folder.path,
          type: folder.type as any,
          isEmpty: folder.isEmpty,
          children: [],
          fileCount: folder.fileCount,
          displayName: folder.displayName
        })),
        breadcrumbs,
        isLoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Fehler beim Laden der Dateien',
        isLoading: false
      })
    }
  },
  
  refreshCurrentPath: async () => {
    const { currentPath, navigateToPath } = get()
    if (currentPath) {
      await navigateToPath(currentPath)
    }
  },
  
  downloadFile: async (file: StorageObject) => {
    try {
      const { triggerFileDownload } = await import('@/lib/storage-service')
      const { currentPath } = get()
      const filePath = `${currentPath}/${file.name}`
      await triggerFileDownload(filePath, file.name)
    } catch (error) {
      console.error('Download failed:', error)
      throw error
    }
  },
  
  deleteFile: async (file: StorageObject) => {
    try {
      const { deleteFile } = await import('@/lib/storage-service')
      const { currentPath, files } = get()
      const filePath = `${currentPath}/${file.name}`
      await deleteFile(filePath)
      
      // Remove file from current files list
      set({
        files: files.filter(f => f.id !== file.id)
      })
    } catch (error) {
      console.error('Delete failed:', error)
      throw error
    }
  },
  
  renameFile: async (file: StorageObject, newName: string) => {
    try {
      const { currentPath, files } = get()
      
      // Clean current path
      let cleanCurrentPath = currentPath
      if (cleanCurrentPath.endsWith('/')) {
        cleanCurrentPath = cleanCurrentPath.slice(0, -1)
      }
      
      // Construct file path
      const filePath = `${cleanCurrentPath}/${file.name}`
      
      console.log('Renaming file:', {
        filePath,
        newName,
        fileName: file.name
      })
      
      const response = await fetch('/api/dateien/rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          newName
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fehler beim Umbenennen der Datei')
      }
      
      // Update file in current files list
      set({
        files: files.map(f => 
          f.id === file.id 
            ? { ...f, name: newName }
            : f
        )
      })
    } catch (error) {
      console.error('Rename failed:', error)
      throw error
    }
  },
  
  reset: () => {
    set(initialState)
  },
}))