"use client"

import React from 'react'
import { 
  Loader2, 
  Search, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  RefreshCw,
  Users,
  Home,
  Building2,
  Wallet,
  CheckSquare,
  FileText
} from 'lucide-react'
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

  const isRetrying = retryCount > 0;
  
  return (
    <div className="w-full py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Animated progress bar */}
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary/80 rounded-full animate-pulse"
            style={{
              width: isRetrying ? `${(retryCount / maxRetries) * 100}%` : '70%',
              transition: 'width 0.3s ease-out',
            }}
          />
        </div>

        {/* Main content */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="absolute -inset-1.5 bg-primary/10 rounded-full blur-sm" />
            <div className="relative p-3 bg-background rounded-full border border-border shadow-sm">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-medium">
              {isRetrying 
                ? `Wiederhole Suche (${retryCount}/${maxRetries})`
                : 'Suche wird durchgeführt...'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isRetrying 
                ? 'Versuche erneut, die Ergebnisse abzurufen'
                : `"${query}" wird durchsucht...`}
            </p>
          </div>

          {/* Progress dots animation */}
          <div className="flex items-center justify-center space-x-1.5 pt-2">
            {[1, 2, 3].map((dot) => (
              <div 
                key={dot}
                className="h-2 w-2 rounded-full bg-muted"
                style={{
                  animation: `pulse 1.5s ease-in-out ${dot * 0.2}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Additional status message */}
          <p className="text-xs text-muted-foreground/70 pt-4">
            {isRetrying 
              ? 'Bitte warten, während wir es erneut versuchen...'
              : 'Dies kann einen Moment dauern'}
          </p>
        </div>
      </div>

      {/* Add keyframe animation for the dots */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
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
    <div className="w-full py-4 px-3">
      <div className="space-y-4">
        {/* Error State */}
        {hasError ? (
          <div className="text-center space-y-3">
            <div className="relative inline-flex">
              <div className="absolute -inset-1 bg-destructive/20 rounded-full blur-sm" />
              <div className="relative p-3 bg-background rounded-full border border-destructive/20 shadow-sm">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-medium">
                {isOffline 
                  ? 'Keine Internetverbindung'
                  : 'Fehler bei der Suche'
                }
              </h3>
              <p className="text-muted-foreground text-xs">
                {isOffline
                  ? 'Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.'
                  : 'Bei der Suche ist ein unerwarteter Fehler aufgetreten.'
                }
              </p>
              
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="mt-1 h-8 gap-1.5 text-xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  Erneut versuchen
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* No Results State - Reordered for better flow */
          <div className="text-center space-y-4">
            <div className="relative inline-flex">
              <div className="absolute -inset-1 bg-primary/10 rounded-full blur-sm" />
              <div className="relative p-3 bg-background rounded-full border border-border shadow-sm">
                <Search className="h-6 w-6 text-primary" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium">Keine Ergebnisse gefunden</h3>
                <p className="text-muted-foreground text-xs">
                  Keine Ergebnisse für <span className="font-medium text-foreground">"{query}"</span> gefunden.
                </p>
              </div>
              
              {/* Suggestions - Moved up as primary action */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Vielleicht suchen Sie nach:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestions.map((suggestion, index) => {
                      const filterMap: {[key: string]: {prefix: string, icon: React.ReactNode}} = {
                        'Mieter': {
                          prefix: 'M-',
                          icon: <Users className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        },
                        'Wohnung': {
                          prefix: 'W-',
                          icon: <Home className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        },
                        'Haus': {
                          prefix: 'H-',
                          icon: <Building2 className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        },
                        'Finanzen': {
                          prefix: 'F-',
                          icon: <Wallet className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        },
                        'Aufgabe': {
                          prefix: 'A-',
                          icon: <CheckSquare className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        },
                        'Mietvertrag': {
                          prefix: 'V-',
                          icon: <FileText className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        }
                      };
                      
                      const displayText = suggestion === 'Rechnung' ? 'Finanzen' : suggestion;
                      const filterInfo = filterMap[displayText] || { prefix: '', icon: null };
                      
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            const event = new CustomEvent('update-search-query', { 
                              detail: filterInfo.prefix 
                            });
                            window.dispatchEvent(event);
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-muted hover:bg-primary hover:text-primary-foreground rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 transition-all duration-150 flex items-center"
                        >
                          {filterInfo.icon}
                          {displayText}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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