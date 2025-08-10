"use client"

import React from 'react'
import { Loader2, Search, Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface SearchLoadingProps {
  query: string
  isLoading: boolean
  retryCount?: number
  maxRetries?: number
}

export function SearchLoadingIndicator({ 
  query, 
  isLoading, 
  retryCount = 0, 
  maxRetries = 3 
}: SearchLoadingProps) {
  if (!isLoading) return null

  return (
    <div className="flex flex-col h-[300px] w-full px-2">
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-medium">
            {retryCount > 0 ? (
              `Wiederholung ${retryCount}/${maxRetries}...`
            ) : (
              `Suche nach "${query}"...`
            )}
          </p>
          <p className="text-xs text-muted-foreground/70">
            Bitte warten, während wir nach Ergebnissen suchen
          </p>
        </div>
      </div>
    </div>
  )
}

interface SearchSkeletonProps {
  count?: number
  showGroupHeaders?: boolean
}

export function SearchResultsSkeleton({ count = 5, showGroupHeaders = true }: SearchSkeletonProps) {
  return (
    <div className="space-y-4 p-2">
      {showGroupHeaders && (
        <div className="space-y-3">
          {/* Group header skeleton */}
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-4 ml-auto" />
          </div>
          
          {/* Result items skeleton */}
          {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-md">
              <Skeleton className="h-4 w-4 rounded-full flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-6 w-6 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface NetworkStatusProps {
  isOffline: boolean
  onRetry?: () => void
  className?: string
}

export function NetworkStatusIndicator({ isOffline, onRetry, className }: NetworkStatusProps) {
  if (!isOffline) return null

  return (
    <Alert variant="destructive" className={cn("mx-2 my-4", className)}>
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Keine Internetverbindung</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="ml-2 h-6 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Erneut versuchen
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

interface SearchEmptyStateProps {
  query: string
  hasError?: boolean
  isOffline?: boolean
  onRetry?: () => void
  suggestions?: string[]
}

export function SearchEmptyState({ 
  query, 
  hasError = false, 
  isOffline = false,
  onRetry,
  suggestions = []
}: SearchEmptyStateProps) {
  return (
    <div className="flex flex-col h-[300px] w-full px-4">
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          {hasError ? (
            <>
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isOffline 
                    ? 'Suche nicht verfügbar (offline)'
                    : 'Bei der Suche ist ein Fehler aufgetreten'
                  }
                </p>
                {onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="mt-2"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Erneut versuchen
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <Search className="h-10 w-10 text-muted-foreground/60" />
              <div className="space-y-4">
                <p className="text-sm font-medium">Keine Ergebnisse für "{query}"</p>
                
                {suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Versuchen Sie:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {suggestions.map((suggestion, index) => (
                        <span 
                          key={index}
                          className="px-2.5 py-1 bg-muted rounded-md text-xs font-medium cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => {
                            const event = new CustomEvent('search-suggestion', { detail: suggestion });
                            window.dispatchEvent(event);
                          }}
                        >
                          {suggestion}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground/70 space-y-1.5 pt-2">
                  <p>Tipps für bessere Ergebnisse:</p>
                  <ul className="space-y-0.5">
                    <li>• Überprüfen Sie die Rechtschreibung</li>
                    <li>• Verwenden Sie weniger spezifische Begriffe</li>
                    <li>• Suchen Sie nach Teilwörtern</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface SearchStatusBarProps {
  totalCount: number
  executionTime: number
  query: string
  isLoading?: boolean
  retryCount?: number
  isOffline?: boolean
  resultBreakdown?: {
    tenant: number
    house: number
    apartment: number
    finance: number
    task: number
  }
}

export function SearchStatusBar({ 
  totalCount, 
  executionTime, 
  query, 
  isLoading = false,
  retryCount = 0,
  isOffline = false,
  resultBreakdown
}: SearchStatusBarProps) {
  return (
    <div className="px-2 py-1.5 text-xs text-muted-foreground border-b bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isOffline ? (
            <WifiOff className="h-3 w-3 text-destructive" />
          ) : (
            <Search className="h-3 w-3" />
          )}
          
          <span>
            {isLoading ? (
              retryCount > 0 ? `Wiederholung ${retryCount}...` : 'Suche läuft...'
            ) : isOffline ? (
              'Offline'
            ) : (
              `${totalCount} Ergebnisse für "${query}"`
            )}
          </span>
          
          {/* Show breakdown of results by type */}
          {!isLoading && !isOffline && resultBreakdown && totalCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
              {resultBreakdown.tenant > 0 && <span>Mieter: {resultBreakdown.tenant}</span>}
              {resultBreakdown.house > 0 && <span>Häuser: {resultBreakdown.house}</span>}
              {resultBreakdown.apartment > 0 && <span>Wohnungen: {resultBreakdown.apartment}</span>}
              {resultBreakdown.finance > 0 && <span>Finanzen: {resultBreakdown.finance}</span>}
              {resultBreakdown.task > 0 && <span>Aufgaben: {resultBreakdown.task}</span>}
            </div>
          )}
        </div>
        
        {!isLoading && !isOffline && executionTime > 0 && (
          <span className="text-muted-foreground/60">
            {executionTime}ms
          </span>
        )}
      </div>
    </div>
  )
}

// Progressive loading component for search results
interface ProgressiveSearchLoadingProps {
  isInitialLoad: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

export function ProgressiveSearchLoading({ 
  isInitialLoad, 
  isLoadingMore = false, 
  hasMore = false,
  onLoadMore 
}: ProgressiveSearchLoadingProps) {
  if (isInitialLoad) {
    return <SearchResultsSkeleton count={3} showGroupHeaders={true} />
  }

  if (isLoadingMore) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Weitere Ergebnisse werden geladen...
      </div>
    )
  }

  if (hasMore && onLoadMore) {
    return (
      <div className="flex items-center justify-center py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onLoadMore}
          className="text-xs"
        >
          Weitere Ergebnisse laden
        </Button>
      </div>
    )
  }

  return null
}