"use client"

import { useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileUploadZone } from "@/components/cloud-storage/file-upload-zone"
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

      // Don't close the modal immediately - let user see the results
      // The modal will be closed manually or when user starts a new upload
    } catch (error) {
      console.error('Error refreshing files after upload:', error)
    }
  }

  // Auto-add files to upload queue if they were provided via drag and drop
  useEffect(() => {
    if (uploadModalFiles && uploadModalFiles.length > 0 && uploadModalTargetPath && isUploadModalOpen) {
      // Clean up target path to ensure consistency
      const cleanTargetPath = uploadModalTargetPath.replace(/\/+/g, '/').replace(/\/$/, '')

      console.log('Auto-adding files to upload queue from modal:', {
        fileCount: uploadModalFiles.length,
        originalTargetPath: uploadModalTargetPath,
        cleanTargetPath,
        files: uploadModalFiles.map(f => f.name)
      })

      addToUploadQueue(uploadModalFiles, cleanTargetPath)
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
      <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {uploadModalFiles && uploadModalFiles.length > 0
              ? `${uploadModalFiles.length} Datei${uploadModalFiles.length > 1 ? 'en' : ''} hochladen`
              : 'Dateien hochladen'
            }
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <FileUploadZone
            targetPath={uploadModalTargetPath}
            onUploadComplete={handleUploadComplete}
            className="h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}