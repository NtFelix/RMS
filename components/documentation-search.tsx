'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDebounce } from '@/hooks/use-debounce';
import { useErrorHandler } from '@/components/documentation-error-boundary';

interface SearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function DocumentationSearch({ 
  onSearch, 
  placeholder = "Dokumentation durchsuchen...",
  className = "",
  isLoading = false,
  error = null,
  onRetry
}: SearchProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const { handleError } = useErrorHandler();

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

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative group">
        <Search className={`absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground transition-colors ${
          isLoading ? 'animate-pulse' : 'group-focus-within:text-primary'
        }`} />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-16 pl-16 pr-16 text-lg rounded-full border-2 border-border/50 bg-background/80 backdrop-blur-sm shadow-lg transition-all duration-200 focus:border-primary focus:shadow-xl focus:bg-background placeholder:text-muted-foreground/70"
          disabled={isLoading}
          aria-label="Dokumentation durchsuchen"
          aria-describedby={error ? "search-error" : undefined}
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-4 top-1/2 h-10 w-10 -translate-y-1/2 p-0 hover:bg-muted/80 rounded-full transition-colors"
            disabled={isLoading}
            aria-label="Suche löschen"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

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