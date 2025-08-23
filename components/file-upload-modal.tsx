"use client"

import { useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileUploadZone } from "@/components/file-upload-zone"
import { useModalStore } from "@/hooks/use-modal-store"
import { useCloudStorageStore } from "@/hooks/use-cloud-storage-store"

export function FileUploadModal() {
  const { 
    isUploadModalOpen, 
    uploadModalTargetPath, 
    uploadModalOnComplete,
    uploadModalFiles,
    closeUploadModal 
  } = useModalStore()
  
  const { refreshCurrentPath, addToUploadQueue, processUploadQueue } = useCloudStorageStore()

  const handleUploadComplete = async () => {
    try {
      // Refresh the current path to show new files
      await refreshCurrentPath()
      
      // Call the provided completion callback
      uploadModalOnComplete?.()
      
      // Close the modal
      closeUploadModal()
    } catch (error) {
      console.error('Error refreshing files after upload:', error)
      // Still close the modal even if refresh fails
      closeUploadModal()
    }
  }

  // Auto-add files to upload queue if they were provided via drag and drop
  useEffect(() => {
    if (uploadModalFiles && uploadModalFiles.length > 0 && uploadModalTargetPath && isUploadModalOpen) {
      addToUploadQueue(uploadModalFiles, uploadModalTargetPath)
      // Start processing uploads automatically with a small delay
      setTimeout(() => {
        processUploadQueue().catch(error => {
          console.error('Error processing upload queue:', error)
        })
      }, 300)
    }
  }, [uploadModalFiles, uploadModalTargetPath, addToUploadQueue, processUploadQueue, isUploadModalOpen])

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isUploadModalOpen) {
        closeUploadModal()
      }
    }

    if (isUploadModalOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isUploadModalOpen, closeUploadModal])

  if (!isUploadModalOpen || !uploadModalTargetPath) {
    return null
  }

  return (
    <Dialog open={isUploadModalOpen} onOpenChange={closeUploadModal}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {uploadModalFiles && uploadModalFiles.length > 0 
              ? `${uploadModalFiles.length} Datei${uploadModalFiles.length > 1 ? 'en' : ''} hochladen`
              : 'Dateien hochladen'
            }
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <FileUploadZone
            targetPath={uploadModalTargetPath}
            onUploadComplete={handleUploadComplete}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}