'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { useErrorBoundary } from '@/lib/storage-error-handling'
import { createClient } from '@/utils/supabase/client'

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
  
  // File operations state
  isOperationInProgress: boolean
  operationError: string | null
  
  // Archive state
  archivedFiles: StorageObject[]
  isArchiveLoading: boolean
  archiveError: string | null
  isArchiveViewOpen: boolean
  
  // Actions
  navigateToPath: (path: string) => void
  setCurrentPath: (path: string) => void
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
  processUploadQueue: () => Promise<void>
  
  // File operations actions
  downloadFile: (file: StorageObject) => Promise<void>
  deleteFile: (file: StorageObject) => Promise<void>
  renameFile: (file: StorageObject, newName: string) => Promise<void>
  moveFile: (file: StorageObject, newPath: string) => Promise<void>
  setOperationInProgress: (inProgress: boolean) => void
  setOperationError: (error: string | null) => void
  
  // Archive actions
  archiveFile: (file: StorageObject) => Promise<void>
  loadArchivedFiles: (userId: string) => Promise<void>
  restoreFile: (archivedFile: StorageObject, targetPath?: string) => Promise<void>
  permanentlyDeleteFile: (archivedFile: StorageObject) => Promise<void>
  bulkArchiveFiles: (files: StorageObject[]) => Promise<void>
  archiveFolder: (folderPath: string) => Promise<void>
  setArchiveLoading: (loading: boolean) => void
  setArchiveError: (error: string | null) => void
  setArchivedFiles: (files: StorageObject[]) => void
  openArchiveView: () => void
  closeArchiveView: () => void
  
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
  isOperationInProgress: false,
  operationError: null,
  archivedFiles: [],
  isArchiveLoading: false,
  archiveError: null,
  isArchiveViewOpen: false,
}

export const useCloudStorageStore = create<CloudStorageState>()(
  immer((set, get) => ({
    ...initialState,
    
    // Navigation actions
    navigateToPath: async (path: string) => {
      set((state) => {
        state.currentPath = path
        state.error = null
        state.isLoading = true
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
        
        // Generate breadcrumbs from the path
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
          
          // Try to find display name from folders first
          const folder = folders.find(f => f.path === currentPath)
          
          // If folder has a displayName, use it
          if (folder?.displayName) {
            breadcrumbs.push({
              name: folder.displayName,
              path: currentPath,
              type: i === 1 ? 'house' : i === 2 ? 'apartment' : 'category'
            })
            continue
          }
          
          // If no displayName, try to get friendly name from the database
          try {
            const supabase = createClient()
            let displayName = segment
            let type: 'house' | 'apartment' | 'tenant' | 'category' = 'category'
            
            // First segment after user_ is typically a house
            if (i === 1) {
              try {
                const { data: house, error: houseError } = await supabase
                  .from('Haeuser')
                  .select('name')
                  .eq('id', segment)
                  .single()
                
                if (!houseError && house) {
                  displayName = house.name || segment
                  type = 'house'
                }
              } catch (e) {
                console.error('Error fetching house name:', e)
              }
            } 
            // Second segment is typically an apartment
            else if (i === 2) {
              try {
                const { data: apartment, error: apartmentError } = await supabase
                  .from('Wohnungen')
                  .select('name')
                  .eq('id', segment)
                  .single()
                
                if (!apartmentError && apartment) {
                  displayName = apartment.name || `Wohnung ${segment}`
                  type = 'apartment'
                }
              } catch (e) {
                console.error('Error fetching apartment name:', e)
              }
            }
            // Third segment is typically a tenant
            else if (i === 3) {
              try {
                const { data: tenant, error: tenantError } = await supabase
                  .from('Mieter')
                  .select('name, vorname')
                  .eq('id', segment)
                  .single()
                
                if (!tenantError && tenant) {
                  displayName = `${tenant.vorname} ${tenant.name}`.trim() || `Mieter ${segment}`
                  type = 'tenant'
                }
              } catch (e) {
                console.error('Error fetching apartment name:', e)
              }
            }
            
            breadcrumbs.push({
              name: displayName,
              path: currentPath,
              type
            })
          } catch (error) {
            console.error('Error in breadcrumb generation:', error)
            // Fallback to segment name if there's an error
            breadcrumbs.push({
              name: segment,
              path: currentPath,
              type: i === 1 ? 'house' : i === 2 ? 'apartment' : i === 3 ? 'tenant' : 'category'
            })
          }
        }
        
        set((state) => {
          state.files = files
          // Convert folders to VirtualFolder format with proper types
          state.folders = folders.map(folder => ({
            name: folder.name,
            path: folder.path,
            type: folder.type as any,
            isEmpty: folder.isEmpty,
            children: [],
            fileCount: folder.fileCount,
            displayName: folder.displayName
          }))
          state.breadcrumbs = breadcrumbs
          state.isLoading = false
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Fehler beim Laden der Dateien'
          state.isLoading = false
        })
      }
    },
    
    setCurrentPath: (path: string) => {
      set((state) => {
        state.currentPath = path
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
    
    // File operations actions
    downloadFile: async (file: StorageObject) => {
      set((state) => {
        state.isOperationInProgress = true
        state.operationError = null
      })
      
      try {
        const { triggerFileDownload } = await import('@/lib/storage-service')
        const { withRetry, showSuccessNotification } = await import('@/lib/storage-error-handling')
        
        const filePath = `${get().currentPath}/${file.name}`
        
        await withRetry(
          () => triggerFileDownload(filePath, file.name),
          { maxRetries: 2 },
          'download_file'
        )
        
        showSuccessNotification('Download gestartet', `${file.name} wird heruntergeladen`)
      } catch (error) {
        const { mapError, showErrorNotification } = await import('@/lib/storage-error-handling')
        const storageError = mapError(error, 'download_file')
        
        set((state) => {
          state.operationError = storageError.userMessage
        })
        
        showErrorNotification(storageError)
        throw storageError
      } finally {
        set((state) => {
          state.isOperationInProgress = false
        })
      }
    },
    
    deleteFile: async (file: StorageObject) => {
      set((state) => {
        state.isOperationInProgress = true
        state.operationError = null
      })
      
      try {
        const { deleteFile } = await import('@/lib/storage-service')
        const { withRetry, showSuccessNotification } = await import('@/lib/storage-error-handling')
        
        const filePath = `${get().currentPath}/${file.name}`
        
        await withRetry(
          () => deleteFile(filePath),
          { maxRetries: 2 },
          'delete_file'
        )
        
        // Remove file from current files list
        set((state) => {
          state.files = state.files.filter(f => f.id !== file.id)
        })
        
        showSuccessNotification('Datei gelöscht', `${file.name} wurde dauerhaft gelöscht.`)
      } catch (error) {
        const { mapError, showErrorNotification } = await import('@/lib/storage-error-handling')
        const storageError = mapError(error, 'delete_file')
        
        set((state) => {
          state.operationError = storageError.userMessage
        })
        
        showErrorNotification(storageError)
        throw storageError
      } finally {
        set((state) => {
          state.isOperationInProgress = false
        })
      }
    },
    
    archiveFile: async (file: StorageObject) => {
      set((state) => {
        state.isOperationInProgress = true
        state.operationError = null
      })
      
      try {
        const { archiveFile } = await import('@/lib/storage-service')
        const filePath = `${get().currentPath}/${file.name}`
        await archiveFile(filePath)
        
        // Remove file from current files list
        set((state) => {
          state.files = state.files.filter(f => f.id !== file.id)
        })
      } catch (error) {
        set((state) => {
          state.operationError = error instanceof Error ? error.message : 'Archive failed'
        })
        throw error
      } finally {
        set((state) => {
          state.isOperationInProgress = false
        })
      }
    },
    
    renameFile: async (file: StorageObject, newName: string): Promise<void> => {
      set((state) => {
        state.isOperationInProgress = true;
        state.operationError = null;
      });
      
      try {
        const { renameFile } = await import('@/lib/storage-service');
        
        // Get the current path and ensure it doesn't have a trailing slash
        let currentPath = get().currentPath;
        if (currentPath.endsWith('/')) {
          currentPath = currentPath.slice(0, -1);
        }
        
        // Construct the full path to the file without double encoding
        // The file.name should already be the correct name from Supabase
        const filePath = `${currentPath}/${file.name}`;
        
        console.log('Renaming file via storage service:', {
          currentPath,
          fileName: file.name,
          newName,
          fullPath: filePath
        });
        
        // Call the rename function
        await renameFile(filePath, newName);
        
        // Update file in current files list
        set((state) => {
          const fileIndex = state.files.findIndex(f => f.id === file.id);
          if (fileIndex !== -1) {
            // Create a new object to trigger re-render
            const updatedFiles = [...state.files];
            updatedFiles[fileIndex] = { 
              ...file, 
              name: newName,
              // Update the last_accessed_at timestamp
              last_accessed_at: new Date().toISOString()
            };
            state.files = updatedFiles;
          }
        });
      } catch (error) {
        console.error('Error renaming file:', error)
        set((state) => {
          state.operationError = error instanceof Error ? error.message : 'Rename failed'
        })
        throw error
      } finally {
        set((state) => {
          state.isOperationInProgress = false
        })
      }
    },
    
    moveFile: async (file: StorageObject, newPath: string) => {
      set((state) => {
        state.isOperationInProgress = true
        state.operationError = null
      })
      
      try {
        const { moveFile } = await import('@/lib/storage-service')
        const oldPath = `${get().currentPath}/${file.name}`
        const fullNewPath = `${newPath}/${file.name}`
        await moveFile(oldPath, fullNewPath)
        
        // Remove file from current files list if moved to different directory
        if (newPath !== get().currentPath) {
          set((state) => {
            state.files = state.files.filter(f => f.id !== file.id)
          })
        }
      } catch (error) {
        set((state) => {
          state.operationError = error instanceof Error ? error.message : 'Move failed'
        })
        throw error
      } finally {
        set((state) => {
          state.isOperationInProgress = false
        })
      }
    },
    
    setOperationInProgress: (inProgress: boolean) => {
      set((state) => {
        state.isOperationInProgress = inProgress
      })
    },
    
    setOperationError: (error: string | null) => {
      set((state) => {
        state.operationError = error
      })
    },
    
    // Archive actions
    loadArchivedFiles: async (userId: string) => {
      set((state) => {
        state.isArchiveLoading = true
        state.archiveError = null
      })
      
      try {
        const { listArchivedFiles } = await import('@/lib/storage-service')
        const archivedFiles = await listArchivedFiles(userId)
        
        set((state) => {
          state.archivedFiles = archivedFiles
        })
      } catch (error) {
        set((state) => {
          state.archiveError = error instanceof Error ? error.message : 'Failed to load archived files'
        })
      } finally {
        set((state) => {
          state.isArchiveLoading = false
        })
      }
    },
    
    restoreFile: async (archivedFile: StorageObject, targetPath?: string) => {
      set((state) => {
        state.isOperationInProgress = true
        state.operationError = null
      })
      
      try {
        const { restoreFile } = await import('@/lib/storage-service')
        await restoreFile(archivedFile.name, targetPath)
        
        // Remove from archived files list
        set((state) => {
          state.archivedFiles = state.archivedFiles.filter(f => f.id !== archivedFile.id)
        })
      } catch (error) {
        set((state) => {
          state.operationError = error instanceof Error ? error.message : 'Restore failed'
        })
        throw error
      } finally {
        set((state) => {
          state.isOperationInProgress = false
        })
      }
    },
    
    permanentlyDeleteFile: async (archivedFile: StorageObject) => {
      set((state) => {
        state.isOperationInProgress = true
        state.operationError = null
      })
      
      try {
        const { permanentlyDeleteFile } = await import('@/lib/storage-service')
        await permanentlyDeleteFile(archivedFile.name)
        
        // Remove from archived files list
        set((state) => {
          state.archivedFiles = state.archivedFiles.filter(f => f.id !== archivedFile.id)
        })
      } catch (error) {
        set((state) => {
          state.operationError = error instanceof Error ? error.message : 'Permanent deletion failed'
        })
        throw error
      } finally {
        set((state) => {
          state.isOperationInProgress = false
        })
      }
    },
    
    bulkArchiveFiles: async (files: StorageObject[]) => {
      set((state) => {
        state.isOperationInProgress = true
        state.operationError = null
      })
      
      try {
        const { bulkArchiveFiles } = await import('@/lib/storage-service')
        const currentPath = get().currentPath
        const filePaths = files.map(file => `${currentPath}/${file.name}`)
        await bulkArchiveFiles(filePaths)
        
        // Remove files from current files list
        const fileIds = files.map(f => f.id)
        set((state) => {
          state.files = state.files.filter(f => !fileIds.includes(f.id))
        })
      } catch (error) {
        set((state) => {
          state.operationError = error instanceof Error ? error.message : 'Bulk archive failed'
        })
        throw error
      } finally {
        set((state) => {
          state.isOperationInProgress = false
        })
      }
    },
    
    archiveFolder: async (folderPath: string) => {
      set((state) => {
        state.isOperationInProgress = true
        state.operationError = null
      })
      
      try {
        const { archiveFolder } = await import('@/lib/storage-service')
        await archiveFolder(folderPath)
      } catch (error) {
        set((state) => {
          state.operationError = error instanceof Error ? error.message : 'Folder archive failed'
        })
        throw error
      } finally {
        set((state) => {
          state.isOperationInProgress = false
        })
      }
    },
    
    setArchiveLoading: (loading: boolean) => {
      set((state) => {
        state.isArchiveLoading = loading
      })
    },
    
    setArchiveError: (error: string | null) => {
      set((state) => {
        state.archiveError = error
      })
    },
    
    setArchivedFiles: (files: StorageObject[]) => {
      set((state) => {
        state.archivedFiles = files
      })
    },
    
    openArchiveView: () => {
      set((state) => {
        state.isArchiveViewOpen = true
      })
    },
    
    closeArchiveView: () => {
      set((state) => {
        state.isArchiveViewOpen = false
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
    
    // Process upload queue
    processUploadQueue: async () => {
      const state = get()
      const pendingItems = state.uploadQueue.filter(item => item.status === 'pending')
      
      if (pendingItems.length === 0) return
      
      set((state) => {
        state.isUploading = true
      })
      
      try {
        // Import storage service dynamically to avoid circular dependencies
        const { uploadFile } = await import('@/lib/storage-service')
        
        // Process uploads sequentially to avoid overwhelming the server
        for (const item of pendingItems) {
          let progressInterval: NodeJS.Timeout | null = null
          
          try {
            // Update status to uploading
            set((state) => {
              const queueItem = state.uploadQueue.find(qi => qi.id === item.id)
              if (queueItem) {
                queueItem.status = 'uploading'
                queueItem.progress = 0
              }
            })
            
            // Construct full file path
            const fileName = item.file.name
            const fullPath = `${item.targetPath}/${fileName}`
            
            // Simulate progress updates (since Supabase doesn't provide real progress)
            progressInterval = setInterval(() => {
              set((state) => {
                const queueItem = state.uploadQueue.find(qi => qi.id === item.id)
                if (queueItem && queueItem.progress < 90) {
                  queueItem.progress = Math.min(queueItem.progress + 15, 90)
                }
              })
            }, 300)
            
            // Upload file
            const result = await uploadFile(item.file, fullPath)
            
            if (progressInterval) {
              clearInterval(progressInterval)
              progressInterval = null
            }
            
            if (result.success) {
              // Update to completed
              set((state) => {
                const queueItem = state.uploadQueue.find(qi => qi.id === item.id)
                if (queueItem) {
                  queueItem.status = 'completed'
                  queueItem.progress = 100
                }
              })
            } else {
              // Update to error
              set((state) => {
                const queueItem = state.uploadQueue.find(qi => qi.id === item.id)
                if (queueItem) {
                  queueItem.status = 'error'
                  queueItem.error = result.error || 'Upload failed'
                }
              })
            }
          } catch (error) {
            // Clean up progress interval on error
            if (progressInterval) {
              clearInterval(progressInterval)
            }
            
            // Handle individual file upload error
            set((state) => {
              const queueItem = state.uploadQueue.find(qi => qi.id === item.id)
              if (queueItem) {
                queueItem.status = 'error'
                queueItem.error = error instanceof Error ? error.message : 'Upload failed'
              }
            })
          }
          
          // Small delay between uploads to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error('Error in processUploadQueue:', error)
        // Mark all pending items as error
        set((state) => {
          state.uploadQueue.forEach(item => {
            if (item.status === 'pending' || item.status === 'uploading') {
              item.status = 'error'
              item.error = 'Upload process failed'
            }
          })
        })
      } finally {
        set((state) => {
          state.isUploading = false
        })
      }
    },
    
    // Utility actions
    reset: () => {
      set((state) => {
        Object.assign(state, initialState)
      })
    },
    
    refreshCurrentPath: async () => {
      const currentPath = get().currentPath
      if (!currentPath) return
      
      set((state) => {
        state.isLoading = true
        state.error = null
      })
      
      try {
        // Extract user ID from current path
        const userIdMatch = currentPath.match(/^user_([^\/]+)/)
        if (!userIdMatch) {
          throw new Error('Invalid path format')
        }
        const userId = userIdMatch[1]
        
        // Use server action to load files for the current path
        const { loadFilesForPath } = await import('@/app/(dashboard)/dateien/actions')
        const { files, folders, error } = await loadFilesForPath(userId, currentPath)
        
        if (error) {
          throw new Error(error)
        }
        
        set((state) => {
          state.files = files
          // Convert folders to VirtualFolder format with proper types
          state.folders = folders.map(folder => ({
            name: folder.name,
            path: folder.path,
            type: folder.type,
            isEmpty: folder.isEmpty,
            children: [],
            fileCount: folder.fileCount,
            displayName: folder.displayName
          }))
          state.isLoading = false
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Fehler beim Laden der Dateien'
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
    processUploadQueue: store.processUploadQueue,
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

export const useCloudStorageOperations = () => {
  const store = useCloudStorageStore()
  return {
    isOperationInProgress: store.isOperationInProgress,
    operationError: store.operationError,
    downloadFile: store.downloadFile,
    deleteFile: store.deleteFile,
    renameFile: store.renameFile,
    moveFile: store.moveFile,
    setOperationInProgress: store.setOperationInProgress,
    setOperationError: store.setOperationError,
  }
}

export const useCloudStorageArchive = () => {
  const store = useCloudStorageStore()
  return {
    archivedFiles: store.archivedFiles,
    isArchiveLoading: store.isArchiveLoading,
    archiveError: store.archiveError,
    isArchiveViewOpen: store.isArchiveViewOpen,
    archiveFile: store.archiveFile,
    loadArchivedFiles: store.loadArchivedFiles,
    restoreFile: store.restoreFile,
    permanentlyDeleteFile: store.permanentlyDeleteFile,
    bulkArchiveFiles: store.bulkArchiveFiles,
    archiveFolder: store.archiveFolder,
    setArchiveLoading: store.setArchiveLoading,
    setArchiveError: store.setArchiveError,
    setArchivedFiles: store.setArchivedFiles,
    openArchiveView: store.openArchiveView,
    closeArchiveView: store.closeArchiveView,
  }
}