"use client"

import { useCallback, useState, useRef } from "react"
import { Upload, FolderPlus, HardDrive, Lock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DocumentsSummaryCardsProps {
  totalSize: number
  storageLimit?: number // Storage limit in bytes, 0 or undefined means no storage access
  isLoadingLimit?: boolean
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
  storageLimit,
  isLoadingLimit = false,
  onUpload,
  onCreateFolder
}: DocumentsSummaryCardsProps) {
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  // Calculate usage percentage and warning states
  // hasLimit means there's a positive storage limit (> 0)
  const hasLimit = typeof storageLimit === 'number' && storageLimit > 0
  const hasNoStorageAccess = typeof storageLimit === 'number' && storageLimit === 0
  const usagePercentage = hasLimit ? Math.min((totalSize / storageLimit!) * 100, 100) : (hasNoStorageAccess ? 100 : 0)
  const isOverLimit = (hasLimit && totalSize >= storageLimit!) || hasNoStorageAccess
  const isNearLimit = hasLimit && usagePercentage >= 80 && !isOverLimit

  // Upload is disabled when no storage access or storage is full
  const isUploadDisabled = hasNoStorageAccess || (hasLimit && totalSize >= storageLimit!)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isUploadDisabled) return
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [isUploadDisabled])

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

    if (isUploadDisabled) {
      toast({
        variant: "destructive",
        description: hasNoStorageAccess
          ? "Speicher ist in Ihrem Tarif nicht enthalten. Bitte upgraden Sie auf einen höheren Tarif."
          : "Speicherlimit erreicht. Bitte löschen Sie Dateien oder upgraden Sie Ihren Tarif."
      })
      return
    }

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      onUpload(files)
      toast({
        description: `${files.length} Datei${files.length > 1 ? 'en' : ''} wird hochgeladen...`
      })
    }
  }, [onUpload, toast, isUploadDisabled, hasNoStorageAccess])

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
    if (isUploadDisabled) return
    fileInputRef.current?.click()
  }, [isUploadDisabled])

  // Upload card content
  const uploadCardContent = (
    <Card
      className={cn(
        "relative overflow-hidden rounded-3xl shadow-sm transition-all duration-200 flex-1",
        "bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251]",
        isUploadDisabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:shadow-md hover:scale-[1.02]",
        isDragging && !isUploadDisabled && "ring-2 ring-primary ring-offset-2 scale-[1.02]"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleUploadClick}
    >
      <div className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <h3 className={cn(
            "text-sm font-medium",
            isUploadDisabled && "text-muted-foreground"
          )}>
            Dateien hochladen
          </h3>
          {isUploadDisabled ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Upload className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div>
          <div className={cn(
            "text-2xl font-bold mb-1",
            isUploadDisabled && "text-muted-foreground"
          )}>
            {isUploadDisabled ? "Gesperrt" : (isDragging ? "Ablegen" : "Hochladen")}
          </div>
          <p className="text-xs text-muted-foreground">
            {isUploadDisabled
              ? "Upgrade erforderlich"
              : (isDragging ? "Dateien hier ablegen..." : "Klicken oder hierher ziehen")
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
        disabled={isUploadDisabled}
      />
    </Card>
  )

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-4">
        {/* Drag & Drop Upload Card */}
        {isUploadDisabled ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild className="flex-1">
              {uploadCardContent}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[250px]">
              <p className="text-sm">
                {hasNoStorageAccess
                  ? "Dokumentenspeicher ist in Ihrem aktuellen Tarif nicht enthalten. Bitte wechseln Sie zu einem höheren Tarif."
                  : "Ihr Speicherlimit ist erreicht. Bitte löschen Sie Dateien oder wechseln Sie zu einem höheren Tarif."
                }
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          uploadCardContent
        )}

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

        {/* Total Size Card with Progress Bar */}
        <Card className={cn(
          "relative overflow-hidden rounded-3xl shadow-sm transition-opacity duration-200 flex-1",
          "bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251]",
          isOverLimit && "border-destructive/50",
          isNearLimit && "border-amber-500/50"
        )}>
          <div className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">
                Speicher
              </h3>
              <HardDrive className={cn(
                "h-4 w-4",
                isOverLimit || hasNoStorageAccess ? "text-destructive" : isNearLimit ? "text-amber-500" : "text-muted-foreground"
              )} />
            </div>
            <div>
              {isLoadingLimit ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded w-24 mb-1" />
                  <div className="h-3 bg-muted rounded w-16" />
                </div>
              ) : hasNoStorageAccess ? (
                // No storage access state (limit = 0)
                <>
                  <div className="text-2xl font-bold text-destructive">
                    Nicht verfügbar
                  </div>
                  <p className="text-xs text-destructive mt-1">
                    Speicher nicht im Tarif enthalten
                  </p>
                </>
              ) : (
                <>
                  <div className={cn(
                    "text-2xl font-bold",
                    isOverLimit && "text-destructive",
                    isNearLimit && "text-amber-500"
                  )}>
                    {formatFileSize(totalSize)}
                    {hasLimit && (
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        / {formatFileSize(storageLimit!)}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {hasLimit && (
                    <div className="mt-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-300 rounded-full",
                            isOverLimit ? "bg-destructive" : isNearLimit ? "bg-amber-500" : "bg-primary"
                          )}
                          style={{ width: `${usagePercentage}%` }}
                        />
                      </div>
                      <p className={cn(
                        "text-xs mt-1",
                        isOverLimit ? "text-destructive" : isNearLimit ? "text-amber-500" : "text-muted-foreground"
                      )}>
                        {isOverLimit
                          ? "Speicherlimit erreicht"
                          : isNearLimit
                            ? `${usagePercentage.toFixed(0)}% verwendet`
                            : `${usagePercentage.toFixed(0)}% verwendet`
                        }
                      </p>
                    </div>
                  )}

                  {!hasLimit && (
                    <p className="text-xs text-muted-foreground">
                      Gesamtgröße
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  )
}

