"use client"

import React from 'react'
import { RefreshCw, Upload, Download, Folder, File, Archive } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Loading skeleton for file tree navigation
 */
export function FileTreeSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center space-x-2 p-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className={`h-4 ${i % 3 === 0 ? 'w-24' : i % 3 === 1 ? 'w-32' : 'w-20'}`} />
        </div>
      ))}
    </div>
  )
}

/**
 * Loading skeleton for file grid
 */
export function FileGridSkeleton({ 
  count = 8, 
  className 
}: { 
  count?: number
  className?: string 
}) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", className)}>
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="p-4">
          <CardContent className="p-0">
            <div className="flex flex-col items-center space-y-3">
              <Skeleton className="h-8 w-8" />
              <div className="text-center w-full space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-16 mx-auto" />
                <Skeleton className="h-3 w-20 mx-auto" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Loading skeleton for breadcrumb navigation
 */
export function BreadcrumbSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Skeleton className="h-4 w-20" />
      <span className="text-muted-foreground">/</span>
      <Skeleton className="h-4 w-16" />
      <span className="text-muted-foreground">/</span>
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

/**
 * Loading state for file operations
 */
interface FileOperationLoadingProps {
  operation: 'upload' | 'download' | 'delete' | 'move' | 'archive'
  fileName?: string
  progress?: number
  className?: string
}

export function FileOperationLoading({ 
  operation, 
  fileName, 
  progress,
  className 
}: FileOperationLoadingProps) {
  const getOperationIcon = () => {
    switch (operation) {
      case 'upload':
        return <Upload className="h-4 w-4" />
      case 'download':
        return <Download className="h-4 w-4" />
      case 'delete':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'move':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'archive':
        return <Archive className="h-4 w-4" />
      default:
        return <RefreshCw className="h-4 w-4 animate-spin" />
    }
  }

  const getOperationText = () => {
    switch (operation) {
      case 'upload':
        return 'Wird hochgeladen'
      case 'download':
        return 'Wird heruntergeladen'
      case 'delete':
        return 'Wird gelöscht'
      case 'move':
        return 'Wird verschoben'
      case 'archive':
        return 'Wird archiviert'
      default:
        return 'Wird verarbeitet'
    }
  }

  return (
    <div className={cn("flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg", className)}>
      <div className="flex-shrink-0 text-blue-600">
        {getOperationIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900">
          {getOperationText()}
        </p>
        {fileName && (
          <p className="text-xs text-blue-700 truncate">
            {fileName}
          </p>
        )}
        {progress !== undefined && (
          <div className="mt-2">
            <Progress value={progress} className="h-1" />
            <p className="text-xs text-blue-600 mt-1">{progress}%</p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Batch operation loading state
 */
interface BatchOperationLoadingProps {
  operation: string
  totalItems: number
  completedItems: number
  currentItem?: string
  className?: string
}

export function BatchOperationLoading({
  operation,
  totalItems,
  completedItems,
  currentItem,
  className
}: BatchOperationLoadingProps) {
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span className="font-medium">{operation}</span>
          </div>
          <Badge variant="secondary">
            {completedItems}/{totalItems}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{Math.round(progress)}% abgeschlossen</span>
            <span>{totalItems - completedItems} verbleibend</span>
          </div>
          {currentItem && (
            <p className="text-xs text-muted-foreground truncate">
              Aktuell: {currentItem}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Upload queue loading state
 */
interface UploadQueueLoadingProps {
  queueLength: number
  isProcessing: boolean
  className?: string
}

export function UploadQueueLoading({ 
  queueLength, 
  isProcessing, 
  className 
}: UploadQueueLoadingProps) {
  return (
    <div className={cn("flex items-center space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-lg", className)}>
      <div className="flex-shrink-0">
        {isProcessing ? (
          <RefreshCw className="h-4 w-4 animate-spin text-amber-600" />
        ) : (
          <Upload className="h-4 w-4 text-amber-600" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900">
          {isProcessing ? 'Upload läuft' : 'Upload bereit'}
        </p>
        <p className="text-xs text-amber-700">
          {queueLength} {queueLength === 1 ? 'Datei' : 'Dateien'} in der Warteschlange
        </p>
      </div>
    </div>
  )
}

/**
 * Archive loading state
 */
export function ArchiveLoading({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <Archive className="h-8 w-8 text-muted-foreground animate-pulse" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Archiv wird geladen</p>
          <p className="text-xs text-muted-foreground">
            Archivierte Dateien werden abgerufen...
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty state components
 */
export function EmptyFileList({ 
  onUpload, 
  className 
}: { 
  onUpload?: () => void
  className?: string 
}) {
  return (
    <div className={cn("text-center py-12", className)}>
      <Folder className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">Keine Dateien</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Laden Sie Ihre ersten Dateien hoch, um zu beginnen.
      </p>
      {onUpload && (
        <button
          onClick={onUpload}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Upload className="mr-2 h-4 w-4" />
          Dateien hochladen
        </button>
      )}
    </div>
  )
}

export function EmptyArchive({ className }: { className?: string }) {
  return (
    <div className={cn("text-center py-12", className)}>
      <Archive className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">Archiv ist leer</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Gelöschte Dateien werden hier angezeigt.
      </p>
    </div>
  )
}

export function EmptyFolder({ 
  folderName, 
  onUpload, 
  className 
}: { 
  folderName?: string
  onUpload?: () => void
  className?: string 
}) {
  return (
    <div className={cn("text-center py-8", className)}>
      <Folder className="mx-auto h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 text-base font-medium">
        {folderName ? `${folderName} ist leer` : 'Ordner ist leer'}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Laden Sie Dateien in diesen Ordner hoch.
      </p>
      {onUpload && (
        <button
          onClick={onUpload}
          className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-primary bg-primary/10 hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Upload className="mr-1 h-3 w-3" />
          Hochladen
        </button>
      )}
    </div>
  )
}

/**
 * Connection status indicator
 */
interface ConnectionStatusProps {
  isOnline: boolean
  isConnecting?: boolean
  className?: string
}

export function ConnectionStatus({ 
  isOnline, 
  isConnecting = false, 
  className 
}: ConnectionStatusProps) {
  if (isConnecting) {
    return (
      <div className={cn("flex items-center space-x-2 text-amber-600", className)}>
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span className="text-xs">Verbindung wird hergestellt...</span>
      </div>
    )
  }

  if (!isOnline) {
    return (
      <div className={cn("flex items-center space-x-2 text-red-600", className)}>
        <div className="h-2 w-2 rounded-full bg-red-600" />
        <span className="text-xs">Offline</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center space-x-2 text-green-600", className)}>
      <div className="h-2 w-2 rounded-full bg-green-600" />
      <span className="text-xs">Online</span>
    </div>
  )
}

/**
 * Performance indicator
 */
interface PerformanceIndicatorProps {
  queryTime: number
  cacheHit?: boolean
  className?: string
}

export function PerformanceIndicator({ 
  queryTime, 
  cacheHit = false, 
  className 
}: PerformanceIndicatorProps) {
  const getPerformanceColor = () => {
    if (queryTime < 500) return 'text-green-600'
    if (queryTime < 2000) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className={cn("flex items-center space-x-2 text-xs", className)}>
      <span className={getPerformanceColor()}>
        {queryTime}ms
      </span>
      {cacheHit && (
        <Badge variant="secondary" className="text-xs px-1 py-0">
          Cache
        </Badge>
      )}
    </div>
  )
}