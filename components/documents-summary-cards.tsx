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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Drag & Drop Upload Card */}
      <Card
        className={cn(
          "relative overflow-hidden transition-all duration-200 cursor-pointer group",
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
          <div className="flex items-center justify-between mb-2">
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              isDragging 
                ? "bg-primary/20" 
                : "bg-blue-500/10 group-hover:bg-blue-500/20"
            )}>
              <Upload className={cn(
                "h-5 w-5 transition-colors",
                isDragging ? "text-primary" : "text-blue-500"
              )} />
            </div>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            Dateien hochladen
          </h3>
          <p className="text-xs text-muted-foreground/70">
            {isDragging 
              ? "Dateien hier ablegen..." 
              : "Klicken oder Dateien hierher ziehen"
            }
          </p>
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
        className="relative overflow-hidden transition-all duration-200 cursor-pointer group hover:shadow-md hover:scale-[1.02]"
        onClick={onCreateFolder}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
              <FolderPlus className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            Ordner erstellen
          </h3>
          <p className="text-xs text-muted-foreground/70">
            Neuen Ordner anlegen
          </p>
        </div>
      </Card>

      {/* Total Size Card */}
      <Card className="relative overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <HardDrive className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            Gesamtgröße
          </h3>
          <p className="text-2xl font-semibold">
            {formatFileSize(totalSize)}
          </p>
        </div>
      </Card>
    </div>
  )
}
