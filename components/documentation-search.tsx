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
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${
          isLoading ? 'animate-pulse' : ''
        }`} />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
          disabled={isLoading}
          aria-label="Dokumentation durchsuchen"
          aria-describedby={error ? "search-error" : undefined}
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 hover:bg-muted"
            disabled={isLoading}
            aria-label="Suche löschen"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
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
        <div className="text-sm text-muted-foreground">
          Geben Sie mindestens 3 Zeichen ein für bessere Suchergebnisse.
        </div>
      )}
    </div>
  );
}