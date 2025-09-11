"use client"

import React from 'react'
import { RefreshCw, FileText, Save, Upload, Download, AlertCircle, CheckCircle, Clock, Loader2, Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Template list skeleton loading state
 */
interface TemplateListSkeletonProps {
  count?: number
  viewMode?: 'grid' | 'list'
  className?: string
}

export function TemplateListSkeleton({ 
  count = 8, 
  viewMode = 'grid',
  className 
}: TemplateListSkeletonProps) {
  if (viewMode === 'list') {
    return (
      <div className={cn("space-y-3", className)}>
        {[...Array(count)].map((_, i) => (
          <div 
            key={i} 
            className="flex items-center p-4 space-x-4 rounded-lg border bg-card animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex-shrink-0">
              <Skeleton className="h-12 w-12 rounded-lg" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <div className="flex items-center space-x-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
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
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4", className)}>
      {[...Array(count)].map((_, i) => (
        <div 
          key={i} 
          className="group relative rounded-lg border bg-card p-4 hover:shadow-md transition-all duration-200 animate-pulse"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          <div className="space-y-3">
            {/* Template icon and title */}
            <div className="flex items-start space-x-3">
              <div className="relative">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
            
            {/* Category and metadata */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            
            {/* Variables preview */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <div className="flex flex-wrap gap-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
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
 * Template editor loading state
 */
interface TemplateEditorLoadingProps {
  message?: string
  showProgress?: boolean
  progress?: number
  className?: string
}

export function TemplateEditorLoading({ 
  message = "Editor wird geladen...",
  showProgress = false,
  progress = 0,
  className 
}: TemplateEditorLoadingProps) {
  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <div className="text-center space-y-4 max-w-sm">
        <div className="flex justify-center">
          <div className="relative">
            <FileText className="h-12 w-12 text-primary animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-shimmer" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">{message}</p>
          {showProgress && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Template save status indicator
 */
interface TemplateSaveStatusProps {
  status: 'idle' | 'saving' | 'saved' | 'error' | 'dirty'
  lastSaved?: Date
  error?: string
  autoSaveEnabled?: boolean
  className?: string
}

export function TemplateSaveStatus({ 
  status, 
  lastSaved, 
  error,
  autoSaveEnabled = false,
  className 
}: TemplateSaveStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'saving':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      case 'saved':
        return <CheckCircle className="h-3 w-3 text-green-500 animate-in zoom-in duration-200" />
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500 animate-in shake duration-300" />
      case 'dirty':
        return <Clock className="h-3 w-3 text-orange-500 animate-pulse" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'saving':
        return 'Speichert...'
      case 'saved':
        return lastSaved ? `Gespeichert um ${lastSaved.toLocaleTimeString()}` : 'Gespeichert'
      case 'error':
        return error || 'Speichern fehlgeschlagen'
      case 'dirty':
        return 'Ungespeicherte Änderungen'
      default:
        return ''
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'saving':
        return 'text-blue-600 dark:text-blue-400'
      case 'saved':
        return 'text-green-600 dark:text-green-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      case 'dirty':
        return 'text-orange-600 dark:text-orange-400'
      default:
        return 'text-muted-foreground'
    }
  }

  const getBackgroundColor = () => {
    switch (status) {
      case 'saving':
        return 'bg-blue-50/50 dark:bg-blue-950/20'
      case 'saved':
        return 'bg-green-50/50 dark:bg-green-950/20'
      case 'error':
        return 'bg-red-50/50 dark:bg-red-950/20'
      case 'dirty':
        return 'bg-orange-50/50 dark:bg-orange-950/20'
      default:
        return ''
    }
  }

  if (status === 'idle') return null

  return (
    <div className={cn(
      "flex items-center space-x-2 text-xs px-2 py-1 rounded-full transition-all duration-200",
      "border border-transparent",
      getStatusColor(),
      getBackgroundColor(),
      "animate-in fade-in duration-300",
      className
    )}>
      {getStatusIcon()}
      <span className="font-medium">{getStatusText()}</span>
      {autoSaveEnabled && status !== 'error' && (
        <div className="flex items-center space-x-1 animate-in slide-in-from-right duration-200">
          <div className="relative">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="absolute inset-0 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
          </div>
          <span className="text-muted-foreground text-xs">Auto</span>
        </div>
      )}
    </div>
  )
}

/**
 * Template operation loading state (create, update, delete)
 */
interface TemplateOperationLoadingProps {
  operation: 'create' | 'update' | 'delete' | 'duplicate' | 'load'
  templateName?: string
  progress?: number
  className?: string
}

export function TemplateOperationLoading({ 
  operation, 
  templateName, 
  progress,
  className 
}: TemplateOperationLoadingProps) {
  const getOperationIcon = () => {
    switch (operation) {
      case 'create':
        return <Upload className="h-4 w-4" />
      case 'update':
        return <Save className="h-4 w-4" />
      case 'delete':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'duplicate':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'load':
        return <Download className="h-4 w-4" />
      default:
        return <RefreshCw className="h-4 w-4 animate-spin" />
    }
  }

  const getOperationText = () => {
    switch (operation) {
      case 'create':
        return 'Vorlage wird erstellt'
      case 'update':
        return 'Vorlage wird aktualisiert'
      case 'delete':
        return 'Vorlage wird gelöscht'
      case 'duplicate':
        return 'Vorlage wird dupliziert'
      case 'load':
        return 'Vorlage wird geladen'
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
        {templateName && (
          <p className="text-xs text-blue-700 truncate">
            {templateName}
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
 * Template content loading skeleton for editor
 */
export function TemplateContentSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-4", className)}>
      {/* Title skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      {/* Editor content skeleton */}
      <div className="space-y-3 border rounded-lg p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        
        <div className="flex space-x-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      
      {/* Footer skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  )
}

/**
 * Offline detection and status indicator
 */
interface OfflineStatusProps {
  isOffline: boolean
  isConnecting?: boolean
  onRetry?: () => void
  className?: string
}

export function OfflineStatus({ 
  isOffline, 
  isConnecting = false, 
  onRetry,
  className 
}: OfflineStatusProps) {
  if (!isOffline && !isConnecting) return null

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border",
      isOffline ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200",
      className
    )}>
      <div className="flex items-center space-x-3">
        <div className={cn(
          "flex-shrink-0",
          isOffline ? "text-red-600" : "text-amber-600"
        )}>
          {isConnecting ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
        </div>
        <div>
          <p className={cn(
            "text-sm font-medium",
            isOffline ? "text-red-900" : "text-amber-900"
          )}>
            {isConnecting ? 'Verbindung wird hergestellt...' : 'Keine Internetverbindung'}
          </p>
          <p className={cn(
            "text-xs",
            isOffline ? "text-red-700" : "text-amber-700"
          )}>
            {isConnecting 
              ? 'Bitte warten Sie einen Moment.'
              : 'Änderungen werden lokal gespeichert und synchronisiert, sobald die Verbindung wiederhergestellt ist.'
            }
          </p>
        </div>
      </div>
      
      {isOffline && onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="text-red-700 border-red-300 hover:bg-red-100"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Erneut versuchen
        </Button>
      )}
    </div>
  )
}

/**
 * Template loading error state
 */
interface TemplateLoadingErrorProps {
  error: string
  onRetry?: () => void
  onCancel?: () => void
  templateName?: string
  className?: string
}

export function TemplateLoadingError({ 
  error, 
  onRetry, 
  onCancel,
  templateName,
  className 
}: TemplateLoadingErrorProps) {
  return (
    <div className={cn("text-center py-8 px-4", className)}>
      <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-red-900 mb-2">
        Fehler beim Laden der Vorlage
      </h3>
      {templateName && (
        <p className="text-sm text-muted-foreground mb-2">
          Vorlage: {templateName}
        </p>
      )}
      <p className="text-sm text-red-700 mb-4 max-w-md mx-auto">
        {error}
      </p>
      <div className="flex items-center justify-center space-x-3">
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Erneut versuchen
          </Button>
        )}
        {onCancel && (
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
          >
            Abbrechen
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Batch template operation loading
 */
interface BatchTemplateOperationProps {
  operation: string
  totalItems: number
  completedItems: number
  currentItem?: string
  errors?: string[]
  className?: string
}

export function BatchTemplateOperation({
  operation,
  totalItems,
  completedItems,
  currentItem,
  errors = [],
  className
}: BatchTemplateOperationProps) {
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0
  const hasErrors = errors.length > 0

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span className="font-medium">{operation}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              {completedItems}/{totalItems}
            </Badge>
            {hasErrors && (
              <Badge variant="destructive">
                {errors.length} Fehler
              </Badge>
            )}
          </div>
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
          {hasErrors && (
            <div className="text-xs text-red-600 space-y-1">
              <p className="font-medium">Fehler aufgetreten:</p>
              <ul className="list-disc list-inside space-y-1 max-h-20 overflow-y-auto">
                {errors.slice(0, 3).map((error, index) => (
                  <li key={index} className="truncate">{error}</li>
                ))}
                {errors.length > 3 && (
                  <li>... und {errors.length - 3} weitere</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Template search loading state
 */
export function TemplateSearchLoading({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {[...Array(3)].map((_, i) => (
        <div 
          key={i} 
          className="flex items-center p-3 space-x-3 rounded-lg border bg-card animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Skeleton className="h-8 w-8 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/**
 * Template preview loading state
 */
export function TemplatePreviewLoading({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-4 border rounded-lg", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-20" />
      </div>
      
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      
      <div className="flex items-center space-x-2 pt-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  )
}