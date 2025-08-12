"use client"

import React, { useEffect, useState } from 'react';
import { useSearchStore } from '@/hooks/use-search-store';
import { 
  Loader2, 
  Search, 
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
  const [visible, setVisible] = useState(isLoading);
  const [progress, setProgress] = useState(isLoading ? 10 : 0);

  const isRetrying = retryCount > 0;

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      const target = 90; // cap while loading, complete to 100% on finish
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < target) {
            const increment = Math.max(0.5, (target - prev) * 0.1); // ease-out
            return Math.min(prev + increment, target);
          }
          return prev;
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      // Finish the bar to 100% then hide shortly after
      setProgress(100);
      const timeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div className="w-full py-4 px-3" role="status" aria-live="polite">
      <div className="max-w-md mx-auto space-y-4">
        {/* Main content */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative inline-flex">
            <div className="absolute -inset-1 bg-primary/10 rounded-full blur-sm" />
            <div className="relative p-3 bg-background rounded-full border border-border shadow-sm">
              <Loader2 className={`h-6 w-6 text-primary animate-spin ${isRetrying ? 'opacity-75' : ''}`} />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">
              {isRetrying 
                ? `Wiederholung ${retryCount}/${maxRetries}...`
                : 'Suche wird durchgeführt...'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {isRetrying 
                ? 'Versuche erneut, die Ergebnisse abzurufen...'
                : query 
                  ? `Suche nach "${query}"...`
                  : 'Suche läuft...'}
            </p>
          </div>

          {/* Single status message */}
          <p className="text-xs text-muted-foreground/70">
            {isRetrying 
              ? 'Bitte einen Moment Geduld'
              : 'Dies kann einen Moment dauern'}
          </p>
        </div>
        {/* Animated progress bar (moved below to keep icon position consistent with no-results) */}
        <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary/80 rounded-full"
            style={{
              width: `${Math.max(0, Math.min(progress, 100))}%`,
              transition: 'width 0.4s ease-out',
              animation: isRetrying ? 'pulse 2s ease-in-out infinite' : 'none'
            }}
          />
        </div>
      </div>

      {/* Keyframe animation for the pulse effect */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
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
    <Alert variant="destructive" className={cn("mx-2 my-4 bg-destructive/10 text-destructive", className)}>
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Keine Internetverbindung</span>
        {onRetry && (
          <Button
            type="button"
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
                {isOffline ? (
                  <WifiOff className="h-6 w-6 text-destructive" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-destructive" />
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-medium" role="alert">
                {isOffline 
                  ? 'Keine Internetverbindung'
                  : 'Fehler bei der Suche'
                }
              </h3>
              <p className="text-muted-foreground text-xs">
                {isOffline
                  ? 'Bitte überprüfen Sie Ihre Netzwerkverbindung und versuchen Sie es erneut.'
                  : 'Bei der Suche ist ein unerwarteter Fehler aufgetreten.'
                }
              </p>
              
              {onRetry && (
                <Button
                  type="button"
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
                <h3 className="text-base font-medium">
                  {query ? 'Keine Ergebnisse gefunden' : 'Keine Ergebnisse'}
                </h3>
                {query && (
                  <p className="text-muted-foreground text-xs">
                    Keine Ergebnisse für <span className="font-medium text-foreground">"{query}"</span> gefunden.
                  </p>
                )}
              </div>
              
              {/* Search tips for no results */}
              {!hasError && query && (
                <p className="text-xs text-muted-foreground">
                  Überprüfen Sie die Rechtschreibung oder verwenden Sie allgemeinere Begriffe.
                </p>
              )}
              
              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Versuchen Sie es mit:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          useSearchStore.getState().setQuery(suggestion);
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-muted hover:bg-primary hover:text-primary-foreground rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 transition-all duration-150 flex items-center"
                      >
                        {suggestion}
                      </button>
                    ))}
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
  // Don't render when no meaningful status to show
  if (!isLoading && !isOffline && totalCount === 0 && executionTime === 0 && !query && retryCount === 0) {
    return null;
  }

  const formatExecutionTime = (time: number) => {
    if (time >= 1000) {
      return `${(time / 1000).toFixed(1)}s`;
    }
    return `${time}ms`;
  };

  const getResultText = () => {
    if (isLoading) {
      return retryCount > 0 ? `Wiederholung ${retryCount}...` : 'Suche läuft...';
    }
    if (isOffline) {
      return 'Offline';
    }
    if (retryCount > 0 && !isLoading) {
      return `Wiederholung ${retryCount}`;
    }
    
    const resultWord = totalCount === 1 ? 'Ergebnis' : 'Ergebnisse';
    return `${totalCount} ${resultWord} für "${query}"`;
  };

  return (
    <div className="px-2 py-1.5 text-xs text-muted-foreground border-b bg-muted/20" aria-live="polite">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isOffline ? (
            <WifiOff className="h-3 w-3 text-destructive" />
          ) : (
            <Search className="h-3 w-3" />
          )}
          
          <span>{getResultText()}</span>
          
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
            {formatExecutionTime(executionTime)}
          </span>
        )}
      </div>
    </div>
  )
}

// (Removed) ProgressiveSearchLoading and SearchResultsSkeleton were unused and have been deleted to reduce dead code.