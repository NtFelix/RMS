"use client"

import React from 'react'
import { RefreshCw, Upload, Download, Folder, File, Archive, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Loading Error Boundary Component
 */
interface LoadingErrorBoundaryProps {
  isLoading: boolean
  error: string | null
  onRetry?: () => void
  isEmpty?: boolean
  loadingComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function LoadingErrorBoundary({
  isLoading,
  error,
  onRetry,
  isEmpty = false,
  loadingComponent,
  emptyComponent,
  children,
  className
}: LoadingErrorBoundaryProps) {
  if (isLoading) {
    return (
      <div className={cn("", className)}>
        {loadingComponent || <FileGridSkeleton />}
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("text-center py-12", className)}>
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-lg font-semibold text-red-900">Fehler beim Laden</h3>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="mt-4"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Erneut versuchen
          </Button>
        )}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className={cn("", className)}>
        {emptyComponent || <EmptyFileList />}
      </div>
    )
  }

  return <div className={className}>{children}</div>
}

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
 * Loading skeleton for file grid with enhanced animations
 */
export function FileGridSkeleton({ 
  count = 8, 
  viewMode = 'grid',
  className 
}: { 
  count?: number
  viewMode?: 'grid' | 'list'
  className?: string 
}) {
  if (viewMode === 'list') {
    return (
      <div className={cn("space-y-2", className)}>
        {[...Array(count)].map((_, i) => (
          <div 
            key={i} 
            className="flex items-center p-4 space-x-4 rounded-lg border bg-card animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex space-x-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4", className)}>
      {[...Array(count)].map((_, i) => (
        <div 
          key={i} 
          className="group relative rounded-lg border bg-card p-3 hover:shadow-md transition-all duration-200 animate-pulse"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          <div className="flex flex-col items-center space-y-3">
            {/* File/Folder icon skeleton with shimmer effect */}
            <div className="relative">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
            
            {/* File name and metadata */}
            <div className="text-center w-full space-y-2">
              <Skeleton className="h-4 w-full" />
              <div className="flex justify-center space-x-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
          
          {/* Hover actions skeleton */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Skeleton className="h-6 w-6 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Loading skeleton for breadcrumb navigation with staggered animation
 */
export function BreadcrumbSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Skeleton 
        className="h-4 w-20 animate-pulse" 
        style={{ animationDelay: '0ms' }}
      />
      <span className="text-muted-foreground/50">/</span>
      <Skeleton 
        className="h-4 w-16 animate-pulse" 
        style={{ animationDelay: '100ms' }}
      />
      <span className="text-muted-foreground/50">/</span>
      <Skeleton 
        className="h-4 w-24 animate-pulse" 
        style={{ animationDelay: '200ms' }}
      />
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
    <div className={cn("text-center py-12", className)}>
      <Folder className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">
        {folderName ? `${folderName} ist leer` : 'Ordner ist leer'}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Dieser Ordner enthält noch keine Dateien. Laden Sie Ihre ersten Dateien hoch, um zu beginnen.
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

/**
 * Content area loading skeleton that preserves layout
 */
interface ContentAreaSkeletonProps {
  viewMode: 'grid' | 'list'
  showHeader?: boolean
  showBreadcrumbs?: boolean
  itemCount?: number
  className?: string
}

export function ContentAreaSkeleton({
  viewMode,
  showHeader = true,
  showBreadcrumbs = true,
  itemCount = 12,
  className
}: ContentAreaSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header skeleton - only show if requested */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      )}

      {/* Breadcrumbs skeleton - only show if requested */}
      {showBreadcrumbs && (
        <BreadcrumbSkeleton />
      )}

      {/* Content skeleton */}
      <FileGridSkeleton 
        count={itemCount} 
        viewMode={viewMode}
      />
    </div>
  )
}

/**
 * Navigation loading overlay - shows only over content area
 */
interface NavigationLoadingOverlayProps {
  isVisible: boolean
  message?: string
  showProgress?: boolean
  progress?: number
  className?: string
}

export function NavigationLoadingOverlay({
  isVisible,
  message = "Navigiere...",
  showProgress = false,
  progress = 0,
  className
}: NavigationLoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <div className={cn(
      "absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center",
      "transition-opacity duration-200",
      className
    )}>
      <div className="bg-card border rounded-lg p-6 shadow-lg max-w-sm w-full mx-4">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">{message}</p>
            {showProgress && (
              <div className="mt-2">
                <Progress value={progress} className="h-1" />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(progress)}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Optimistic UI loading state for immediate feedback
 */
interface OptimisticLoadingProps {
  action: 'navigating' | 'uploading' | 'deleting' | 'moving'
  target?: string
  className?: string
}

export function OptimisticLoading({
  action,
  target,
  className
}: OptimisticLoadingProps) {
  const getActionText = () => {
    switch (action) {
      case 'navigating':
        return target ? `Öffne ${target}...` : 'Navigiere...'
      case 'uploading':
        return 'Lade hoch...'
      case 'deleting':
        return target ? `Lösche ${target}...` : 'Lösche...'
      case 'moving':
        return target ? `Verschiebe ${target}...` : 'Verschiebe...'
      default:
        return 'Verarbeite...'
    }
  }

  const getActionIcon = () => {
    switch (action) {
      case 'navigating':
        return <Folder className="h-4 w-4" />
      case 'uploading':
        return <Upload className="h-4 w-4" />
      case 'deleting':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'moving':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      default:
        return <RefreshCw className="h-4 w-4 animate-spin" />
    }
  }

  return (
    <div className={cn(
      "inline-flex items-center space-x-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm",
      "animate-pulse",
      className
    )}>
      {getActionIcon()}
      <span>{getActionText()}</span>
    </div>
  )
}

/**
 * Static UI preservation wrapper - prevents re-rendering of static elements
 */
interface StaticUIWrapperProps {
  children: React.ReactNode
  isNavigating?: boolean
  className?: string
}

export function StaticUIWrapper({
  children,
  isNavigating = false,
  className
}: StaticUIWrapperProps) {
  return (
    <div className={cn(
      "transition-opacity duration-150",
      isNavigating ? "opacity-95" : "opacity-100",
      className
    )}>
      {children}
    </div>
  )
}

/**
 * Smart loading skeleton that adapts to content type
 */
interface SmartSkeletonProps {
  type: 'files' | 'folders' | 'mixed'
  viewMode: 'grid' | 'list'
  count?: number
  className?: string
}

export function SmartSkeleton({
  type,
  viewMode,
  count = 8,
  className
}: SmartSkeletonProps) {
  const getSkeletonVariant = () => {
    if (type === 'folders') {
      return viewMode === 'grid' ? 'folder-grid' : 'folder-list'
    } else if (type === 'files') {
      return viewMode === 'grid' ? 'file-grid' : 'file-list'
    }
    return viewMode === 'grid' ? 'mixed-grid' : 'mixed-list'
  }

  const variant = getSkeletonVariant()

  if (variant === 'folder-grid') {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4", className)}>
        {[...Array(count)].map((_, i) => (
          <div 
            key={i} 
            className="rounded-lg border bg-card p-3 animate-pulse"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <Folder className="h-12 w-12 text-muted-foreground/50" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
              <div className="text-center w-full space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'file-grid') {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4", className)}>
        {[...Array(count)].map((_, i) => (
          <div 
            key={i} 
            className="rounded-lg border bg-card p-3 animate-pulse"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <File className="h-12 w-12 text-muted-foreground/50" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
              <div className="text-center w-full space-y-2">
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-center space-x-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Default to FileGridSkeleton for other variants
  return <FileGridSkeleton count={count} viewMode={viewMode} className={className} />
}