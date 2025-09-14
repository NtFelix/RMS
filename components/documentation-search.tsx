'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, AlertCircle, Atom } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';
import { useErrorHandler } from '@/components/documentation-error-boundary';
import { useAIAssistantStore } from '@/hooks/use-ai-assistant-store';
import { useModalStore } from '@/hooks/use-modal-store';
import { cn } from '@/lib/utils';

interface SearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  documentationContext?: any;
  onFallbackToSearch?: () => void;
}

export function DocumentationSearch({ 
  onSearch, 
  placeholder = "Dokumentation durchsuchen...",
  className = "",
  isLoading = false,
  error = null,
  onRetry,
  documentationContext,
  onFallbackToSearch
}: SearchProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const { handleError } = useErrorHandler();
  
  // AI Assistant store
  const { 
    currentMode, 
    switchToAI, 
    switchToSearch
  } = useAIAssistantStore();

  // Modal store
  const { openAIAssistantModal } = useModalStore();

  useEffect(() => {
    try {
      onSearch(debouncedQuery);
    } catch (err) {
      handleError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [debouncedQuery, onSearch, handleError]);

  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle escape key to clear search
    if (e.key === 'Escape') {
      handleClear();
    }
  }, [handleClear]);

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
    }
  }, [onRetry]);

  const handleAIToggle = useCallback(() => {
    if (currentMode === 'ai') {
      switchToSearch();
    } else {
      // Clear current search when switching to AI mode
      setQuery('');
      onSearch('');
      switchToAI();
      // Open the AI assistant modal instead of the old interface
      openAIAssistantModal({
        documentationContext,
        onFallbackToSearch: onFallbackToSearch || (() => {
          switchToSearch();
        })
      });
    }
  }, [currentMode, switchToSearch, switchToAI, openAIAssistantModal, onSearch]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative group">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-100/80 dark:bg-primary/10 flex items-center justify-center transition-all duration-200 group-focus-within:bg-primary/20 group-hover:bg-primary/15">
          <Search className={`h-6 w-6 transition-colors ${
            isLoading 
              ? 'text-primary animate-pulse' 
              : query 
                ? 'text-primary' 
                : 'text-primary/70 group-focus-within:text-primary group-hover:text-primary/90'
          }`} />
        </div>
        <Input
          ref={inputRef}
          type="text"
          placeholder={currentMode === 'ai' ? "AI Assistent ist aktiv - Klicken Sie auf das Atom-Symbol" : placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-16 pl-24 pr-24 text-lg rounded-full border-2 border-border/50 bg-gray-50/90 dark:bg-background/80 backdrop-blur-sm shadow-lg transition-all duration-200 focus:border-primary focus:shadow-xl focus:bg-white dark:focus:bg-background placeholder:text-muted-foreground/70",
            currentMode === 'ai' && "border-primary/50 bg-primary/5"
          )}
          disabled={isLoading || currentMode === 'ai'}
          aria-label="Dokumentation durchsuchen"
          aria-describedby={error ? "search-error" : undefined}
        />
        
        {/* AI Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAIToggle}
          className={cn(
            "absolute right-12 top-1/2 h-10 w-10 -translate-y-1/2 p-0 rounded-full transition-all duration-200",
            currentMode === 'ai' 
              ? "bg-primary/20 hover:bg-primary/30 text-primary" 
              : "hover:bg-gray-200/80 dark:hover:bg-muted/80 text-muted-foreground hover:text-primary"
          )}
          disabled={isLoading}
          aria-label={currentMode === 'ai' ? "Zur normalen Suche wechseln" : "AI Assistent öffnen"}
          title={currentMode === 'ai' ? "Zur normalen Suche wechseln" : "AI Assistent öffnen"}
        >
          <Atom className="h-5 w-5" />
        </Button>

        {query && currentMode !== 'ai' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-4 top-1/2 h-8 w-8 -translate-y-1/2 p-0 hover:bg-gray-200/80 dark:hover:bg-muted/80 rounded-full transition-colors"
            disabled={isLoading}
            aria-label="Suche löschen"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* Mode Indicator */}
      {currentMode === 'ai' && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            <Atom className="w-3 h-3 mr-1" />
            AI Modus aktiv
          </Badge>
          <span className="text-xs text-muted-foreground">
            Klicken Sie auf das Atom-Symbol, um zur normalen Suche zurückzukehren
          </span>
        </div>
      )}

      {/* Error display */}
      {error && (
        <Alert id="search-error" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Fehler bei der Suche: {error.message}</span>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="ml-2"
              >
                Erneut versuchen
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Search tips */}
      {query.length > 0 && query.length < 3 && !isLoading && (
        <div className="text-center text-sm text-muted-foreground bg-muted/30 rounded-lg py-2 px-4">
          Geben Sie mindestens 3 Zeichen ein für bessere Suchergebnisse.
        </div>
      )}
      
      {/* Search suggestions when empty */}
      {query.length === 0 && !isLoading && (
        <div className="text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            <span className="text-xs">Beliebte Suchbegriffe:</span>
            <button 
              onClick={() => setQuery('Mieter')}
              className="text-xs bg-muted/50 hover:bg-muted px-2 py-1 rounded-md transition-colors"
            >
              Mieter
            </button>
            <button 
              onClick={() => setQuery('Betriebskosten')}
              className="text-xs bg-muted/50 hover:bg-muted px-2 py-1 rounded-md transition-colors"
            >
              Betriebskosten
            </button>
            <button 
              onClick={() => setQuery('Wohnung')}
              className="text-xs bg-muted/50 hover:bg-muted px-2 py-1 rounded-md transition-colors"
            >
              Wohnung
            </button>
          </div>
        </div>
      )}
    </div>
  );
}