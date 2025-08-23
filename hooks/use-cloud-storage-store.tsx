'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

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
  type: 'house' | 'apartment' | 'tenant' | 'category' | 'archive'
  isEmpty: boolean
  children: VirtualFolder[]
  fileCount: number
}

export interface BreadcrumbItem {
  name: string
  path: string
  type: 'root' | 'house' | 'apartment' | 'tenant' | 'category'
}

export interface UploadItem {
  id: string
  file: File
  targetPath: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

interface CloudStorageState {
  // Current navigation
  currentPath: string
  breadcrumbs: BreadcrumbItem[]
  
  // File listing
  files: StorageObject[]
  folders: VirtualFolder[]
  isLoading: boolean
  error: string | null
  
  // Upload state
  uploadQueue: UploadItem[]
  isUploading: boolean
  
  // Preview state
  previewFile: StorageObject | null
  isPreviewOpen: boolean
  
  // Actions
  navigateToPath: (path: string) => void
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void
  setFiles: (files: StorageObject[]) => void
  setFolders: (folders: VirtualFolder[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Upload actions
  addToUploadQueue: (files: File[], targetPath: string) => void
  updateUploadProgress: (id: string, progress: number) => void
  updateUploadStatus: (id: string, status: UploadItem['status'], error?: string) => void
  removeFromUploadQueue: (id: string) => void
  clearUploadQueue: () => void
  setUploading: (uploading: boolean) => void
  
  // Preview actions
  openPreview: (file: StorageObject) => void
  closePreview: () => void
  
  // Utility actions
  reset: () => void
  refreshCurrentPath: () => Promise<void>
}

const initialState = {
  currentPath: '',
  breadcrumbs: [],
  files: [],
  folders: [],
  isLoading: false,
  error: null,
  uploadQueue: [],
  isUploading: false,
  previewFile: null,
  isPreviewOpen: false,
}

export const useCloudStorageStore = create<CloudStorageState>()(
  immer((set, get) => ({
    ...initialState,
    
    // Navigation actions
    navigateToPath: (path: string) => {
      set((state) => {
        state.currentPath = path
        state.error = null
      })
    },
    
    setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => {
      set((state) => {
        state.breadcrumbs = breadcrumbs
      })
    },
    
    // File listing actions
    setFiles: (files: StorageObject[]) => {
      set((state) => {
        state.files = files
      })
    },
    
    setFolders: (folders: VirtualFolder[]) => {
      set((state) => {
        state.folders = folders
      })
    },
    
    setLoading: (loading: boolean) => {
      set((state) => {
        state.isLoading = loading
      })
    },
    
    setError: (error: string | null) => {
      set((state) => {
        state.error = error
      })
    },
    
    // Upload actions
    addToUploadQueue: (files: File[], targetPath: string) => {
      set((state) => {
        const newItems: UploadItem[] = files.map((file) => ({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          targetPath,
          progress: 0,
          status: 'pending' as const,
        }))
        state.uploadQueue.push(...newItems)
      })
    },
    
    updateUploadProgress: (id: string, progress: number) => {
      set((state) => {
        const item = state.uploadQueue.find((item) => item.id === id)
        if (item) {
          item.progress = progress
        }
      })
    },
    
    updateUploadStatus: (id: string, status: UploadItem['status'], error?: string) => {
      set((state) => {
        const item = state.uploadQueue.find((item) => item.id === id)
        if (item) {
          item.status = status
          if (error) {
            item.error = error
          }
        }
      })
    },
    
    removeFromUploadQueue: (id: string) => {
      set((state) => {
        state.uploadQueue = state.uploadQueue.filter((item) => item.id !== id)
      })
    },
    
    clearUploadQueue: () => {
      set((state) => {
        state.uploadQueue = []
      })
    },
    
    setUploading: (uploading: boolean) => {
      set((state) => {
        state.isUploading = uploading
      })
    },
    
    // Preview actions
    openPreview: (file: StorageObject) => {
      set((state) => {
        state.previewFile = file
        state.isPreviewOpen = true
      })
    },
    
    closePreview: () => {
      set((state) => {
        state.previewFile = null
        state.isPreviewOpen = false
      })
    },
    
    // Utility actions
    reset: () => {
      set((state) => {
        Object.assign(state, initialState)
      })
    },
    
    refreshCurrentPath: async () => {
      // This will be implemented when we have the storage service
      // For now, just set loading state
      set((state) => {
        state.isLoading = true
        state.error = null
      })
      
      try {
        // TODO: Implement actual refresh logic when storage service is available
        // const files = await storageService.listFiles(get().currentPath)
        // set((state) => {
        //   state.files = files
        //   state.isLoading = false
        // })
        
        // For now, just clear loading state
        set((state) => {
          state.isLoading = false
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to refresh files'
          state.isLoading = false
        })
      }
    },
  }))
)

// Selectors for common state combinations
export const useCloudStorageNavigation = () => {
  const store = useCloudStorageStore()
  return {
    currentPath: store.currentPath,
    breadcrumbs: store.breadcrumbs,
    navigateToPath: store.navigateToPath,
    setBreadcrumbs: store.setBreadcrumbs,
  }
}

export const useCloudStorageFiles = () => {
  const store = useCloudStorageStore()
  return {
    files: store.files,
    folders: store.folders,
    isLoading: store.isLoading,
    error: store.error,
    setFiles: store.setFiles,
    setFolders: store.setFolders,
    setLoading: store.setLoading,
    setError: store.setError,
    refreshCurrentPath: store.refreshCurrentPath,
  }
}

export const useCloudStorageUpload = () => {
  const store = useCloudStorageStore()
  return {
    uploadQueue: store.uploadQueue,
    isUploading: store.isUploading,
    addToUploadQueue: store.addToUploadQueue,
    updateUploadProgress: store.updateUploadProgress,
    updateUploadStatus: store.updateUploadStatus,
    removeFromUploadQueue: store.removeFromUploadQueue,
    clearUploadQueue: store.clearUploadQueue,
    setUploading: store.setUploading,
  }
}

export const useCloudStoragePreview = () => {
  const store = useCloudStorageStore()
  return {
    previewFile: store.previewFile,
    isPreviewOpen: store.isPreviewOpen,
    openPreview: store.openPreview,
    closePreview: store.closePreview,
  }
}