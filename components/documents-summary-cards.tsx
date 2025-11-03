"use client"

import { useCallback, useState, useRef } from "react"
import { Upload, FolderPlus, HardDrive } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface DocumentsSummaryCardsProps {
  totalSize: number
  onUpload: (files: File[]) => void
  onCreateFolder: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function DocumentsSummaryCards({
  totalSize,
  onUpload,
  onCreateFolder
}: DocumentsSummaryCardsProps) {
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      onUpload(files)
      toast({
        description: `${files.length} Datei${files.length > 1 ? 'en' : ''} wird hochgeladen...`
      })
    }
  }, [onUpload, toast])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onUpload(files)
      toast({
        description: `${files.length} Datei${files.length > 1 ? 'en' : ''} wird hochgeladen...`
      })
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onUpload, toast])

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className="flex flex-wrap gap-4">
      {/* Drag & Drop Upload Card */}
      <Card
        className={cn(
          "relative overflow-hidden rounded-3xl shadow-sm transition-all duration-200 cursor-pointer group flex-1",
          "bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251]",
          "hover:shadow-md hover:scale-[1.02]",
          isDragging && "ring-2 ring-primary ring-offset-2 scale-[1.02]"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleUploadClick}
      >
        <div className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">
              Dateien hochladen
            </h3>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold mb-1">
              {isDragging ? "Ablegen" : "Hochladen"}
            </div>
            <p className="text-xs text-muted-foreground">
              {isDragging 
                ? "Dateien hier ablegen..." 
                : "Klicken oder hierher ziehen"
              }
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
      </Card>

      {/* Create Folder Card */}
      <Card
        className={cn(
          "relative overflow-hidden rounded-3xl shadow-sm transition-all duration-200 cursor-pointer group flex-1",
          "bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251]",
          "hover:shadow-md hover:scale-[1.02]"
        )}
        onClick={onCreateFolder}
      >
        <div className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">
              Ordner erstellen
            </h3>
            <FolderPlus className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold mb-1">
              Neuer Ordner
            </div>
            <p className="text-xs text-muted-foreground">
              Klicken zum Erstellen
            </p>
          </div>
        </div>
      </Card>

      {/* Total Size Card */}
      <Card className={cn(
        "relative overflow-hidden rounded-3xl shadow-sm transition-opacity duration-200 flex-1",
        "bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251]"
      )}>
        <div className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">
              Gesamtgröße
            </h3>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {formatFileSize(totalSize)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
