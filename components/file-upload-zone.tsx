"use client"

import { useCallback, useState, useRef, useEffect } from "react"
import { Upload, X, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useCloudStorageUpload } from "@/hooks/use-cloud-storage-store"
import { validateFile } from "@/lib/storage-service"
import { cn } from "@/lib/utils"
import { usePostHog } from "posthog-js/react"

interface FileUploadZoneProps {
  targetPath: string
  onUploadComplete?: () => void
  className?: string
  disabled?: boolean
}

export function FileUploadZone({
  targetPath,
  onUploadComplete,
  className,
  disabled = false
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const posthog = usePostHog()

  const {
    uploadQueue,
    isUploading,
    addToUploadQueue,
    removeFromUploadQueue,
    clearUploadQueue,
    processUploadQueue
  } = useCloudStorageUpload()

  // Check for completed uploads and call onUploadComplete
  useEffect(() => {
    const completedUploads = uploadQueue.filter(item => item.status === 'completed')
    const hasCompletedUploads = completedUploads.length > 0
    const allCompleted = uploadQueue.length > 0 && uploadQueue.every(item =>
      item.status === 'completed' || item.status === 'error'
    )

    // Call onUploadComplete when all uploads are finished (completed or error)
    if (hasCompletedUploads && !isUploading && allCompleted) {
      // Use a timeout to ensure the upload process has fully completed
      const timeoutId = setTimeout(() => {
        onUploadComplete?.()
        const totalSize = completedUploads.reduce((acc, item) => acc + item.file.size, 0)
        posthog?.capture('document_uploaded', {
          file_count: completedUploads.length,
          total_size_bytes: totalSize,
          target_path: targetPath,
          source: 'file_upload_zone'
        })
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [uploadQueue, isUploading, onUploadComplete])

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled) return

    setDragCounter(prev => prev + 1)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setDragCounter(prev => prev - 1)
    if (dragCounter <= 1) {
      setIsDragOver(false)
    }
  }, [dragCounter])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragOver(false)
    setDragCounter(0)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [disabled, targetPath])

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)

    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [targetPath])

  // Process selected files
  const handleFiles = useCallback((files: File[]) => {
    if (files.length === 0) return

    // Validate files before adding to queue
    const validFiles: File[] = []
    const errors: string[] = []

    files.forEach(file => {
      const validation = validateFile(file)
      if (validation.valid) {
        validFiles.push(file)
      } else {
        errors.push(`${file.name}: ${validation.error}`)
      }
    })

    // Show validation errors if any
    if (errors.length > 0) {
      // Show toast notifications for errors
      errors.forEach(error => {
        console.error('File validation error:', error)
        // You could add toast notifications here if needed
      })
    }

    // Add valid files to upload queue
    if (validFiles.length > 0) {
      // Clean up target path to ensure consistency
      const cleanTargetPath = targetPath.replace(/\/+/g, '/').replace(/\/$/, '')

      console.log('Adding files to upload queue:', {
        fileCount: validFiles.length,
        targetPath,
        cleanTargetPath,
        files: validFiles.map(f => f.name)
      })

      addToUploadQueue(validFiles, cleanTargetPath)
      // Start processing uploads automatically with a small delay
      setTimeout(() => {
        processUploadQueue().catch(error => {
          console.error('Error processing upload queue:', error)
        })
      }, 200)
    }
  }, [targetPath, addToUploadQueue, processUploadQueue])

  // Open file picker
  const openFilePicker = useCallback(() => {
    if (disabled) return
    fileInputRef.current?.click()
  }, [disabled])

  // Remove file from queue
  const handleRemoveFile = useCallback((id: string) => {
    removeFromUploadQueue(id)
  }, [removeFromUploadQueue])

  // Get file type icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <FileText className="h-4 w-4 text-blue-500" />
    }
    if (file.type === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" />
    }
    return <FileText className="h-4 w-4 text-gray-500" />
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 text-gray-500" />
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Loader2 className="h-4 w-4 text-gray-500" />
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn("flex flex-col h-full space-y-4", className)}>
      {/* Upload Zone */}
      <Card
        data-testid="upload-card"
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer flex-shrink-0",
          isDragOver && !disabled && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed",
          !isDragOver && !disabled && "hover:border-primary/50"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFilePicker}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 px-6 text-center">
          <Upload className={cn(
            "h-10 w-10 mb-3",
            isDragOver && !disabled ? "text-primary" : "text-muted-foreground"
          )} />

          <h3 className="text-base font-semibold mb-2">
            {isDragOver && !disabled ? "Dateien hier ablegen" : "Dateien hochladen"}
          </h3>

          <p className="text-sm text-muted-foreground mb-3">
            {isDragOver && !disabled
              ? "Lassen Sie die Dateien los, um sie hochzuladen"
              : "Ziehen Sie Dateien hierher oder klicken Sie, um Dateien auszuwählen"
            }
          </p>

          <div className="text-xs text-muted-foreground mb-3">
            <p>Unterstützte Formate: PDF, Bilder (JPG, PNG), Dokumente</p>
            <p>Maximale Dateigröße: 10 MB</p>
          </div>

          {!disabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                openFilePicker()
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Dateien auswählen
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <Card className="flex-1 flex flex-col h-[400px]">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h4 className="text-sm font-semibold">
                Upload-Warteschlange ({uploadQueue.length})
              </h4>

              <div className="flex items-center space-x-2">
                {isUploading && (
                  <Badge variant="secondary" className="text-xs">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Wird hochgeladen...
                  </Badge>
                )}

                {uploadQueue.some(item => item.status === 'completed') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const completedIds = uploadQueue
                        .filter(item => item.status === 'completed')
                        .map(item => item.id)
                      completedIds.forEach(id => removeFromUploadQueue(id))
                    }}
                    disabled={isUploading}
                  >
                    Erledigte entfernen
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearUploadQueue}
                  disabled={isUploading}
                >
                  Alle entfernen
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[300px]">
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg"
                >
                  {/* File icon */}
                  <div className="flex-shrink-0">
                    {getFileIcon(item.file)}
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {item.file.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(item.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(item.id)}
                          disabled={item.status === 'uploading'}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(item.file.size)}
                      </p>

                      {item.status === 'uploading' && (
                        <p className="text-xs text-muted-foreground">
                          {item.progress}%
                        </p>
                      )}
                    </div>

                    {/* Progress bar */}
                    {item.status === 'uploading' && (
                      <Progress value={item.progress} className="mt-2 h-1" />
                    )}

                    {/* Error message */}
                    {item.status === 'error' && item.error && (
                      <p className="text-xs text-red-500 mt-1">
                        {item.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}