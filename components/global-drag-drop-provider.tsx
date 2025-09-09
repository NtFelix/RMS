"use client"

import { useEffect, useState, useCallback } from "react"
import { useModalStore } from "@/hooks/use-modal-store"
import { useCloudStorageStore } from "@/hooks/use-cloud-storage-store"
import { usePathname } from "next/navigation"

export function GlobalDragDropProvider({ children }: { children: React.ReactNode }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const { openUploadModal } = useModalStore()
  const pathname = usePathname()
  
  // Only get currentPath when on cloud storage page to avoid infinite loops
  const isCloudStoragePage = pathname?.includes('/dateien')
  const cloudStorageStore = useCloudStorageStore()
  const currentPath = isCloudStoragePage ? cloudStorageStore.currentPath : null



  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!isCloudStoragePage) return
    
    setDragCounter(prev => prev + 1)
    
    // Check if files are being dragged
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      // Check if any of the items are files
      const hasFiles = Array.from(e.dataTransfer.items).some(item => item.kind === 'file')
      if (hasFiles) {
        setIsDragOver(true)
      }
    } else if (e.dataTransfer?.types && e.dataTransfer.types.includes('Files')) {
      // Fallback check for files
      setIsDragOver(true)
    }
  }, [isCloudStoragePage])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setDragCounter(prev => prev - 1)
    if (dragCounter <= 1) {
      setIsDragOver(false)
    }
  }, [dragCounter])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsDragOver(false)
    setDragCounter(0)
    
    if (!isCloudStoragePage || !currentPath) return
    
    // Check if files were dropped
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)
      // Open the upload modal with the current path and files
      openUploadModal(currentPath, undefined, files)
    }
  }, [isCloudStoragePage, currentPath, openUploadModal])

  useEffect(() => {
    if (!isCloudStoragePage) {
      // Clean up state when not on cloud storage page
      setIsDragOver(false)
      setDragCounter(0)
      return
    }

    // Add global drag and drop event listeners
    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [isCloudStoragePage, handleDragEnter, handleDragLeave, handleDragOver, handleDrop])

  return (
    <>
      {children}
      
      {/* Global drag overlay */}
      {isDragOver && isCloudStoragePage && (
        <div className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl p-8 border-2 border-dashed border-primary animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="text-4xl mb-4 animate-bounce">📁</div>
              <h3 className="text-lg font-semibold text-primary mb-2">
                Dateien hier ablegen
              </h3>
              <p className="text-sm text-muted-foreground">
                Lassen Sie die Dateien los, um den Upload-Dialog zu öffnen
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}