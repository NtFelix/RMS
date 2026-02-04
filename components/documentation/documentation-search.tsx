'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, AlertCircle, Atom, Users, Euro, Home, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';
import { useErrorHandler } from '@/components/documentation/documentation-error-boundary';
import { useAIAssistantStore } from '@/hooks/use-ai-assistant-store';
import { useModalStore } from '@/hooks/use-modal-store';
import { cn } from '@/lib/utils';
import { useFeatureFlagEnabled } from 'posthog-js/react';

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
  const flagEnabled = useFeatureFlagEnabled('ai-documentation-mode');
  const [isAIDocumentationMode, setIsAIDocumentationMode] = useState(false);

  useEffect(() => {
    setIsAIDocumentationMode(!!flagEnabled);
  }, [flagEnabled]);

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
      <div className="relative">
        <div className={cn(
          "relative bg-background border-2 border-input rounded-full px-6 py-4 shadow-sm transition-all duration-200 focus-within:border-ring hover:shadow-md hover:scale-[1.01]",
          currentMode === 'ai' && "border-primary/50 bg-primary/5"
        )}>
          {/* Search Icon */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center justify-center">
            <Search className={cn(
              "h-6 w-6 transition-colors",
              isLoading
                ? 'text-primary animate-pulse'
                : query
                  ? 'text-primary'
                  : 'text-muted-foreground'
            )} />
          </div>

          {/* Input Field */}
          <Input
            ref={inputRef}
            type="text"
            placeholder={currentMode === 'ai' ? "AI Assistent ist aktiv - Klicken Sie auf das Atom-Symbol" : placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 bg-transparent pl-12 pr-32 text-xl focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70"
            disabled={isLoading || currentMode === 'ai'}
            aria-label="Dokumentation durchsuchen"
            aria-describedby={error ? "search-error" : undefined}
            data-dialog-ignore-interaction
          />

          {/* Right Side Buttons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Clear Button */}
            {query && currentMode !== 'ai' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-12 w-12 p-0 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 hover:bg-primary/10 text-muted-foreground hover:text-primary hover:shadow-md"
                disabled={isLoading}
                aria-label="Suche löschen"
              >
                <X className="h-6 w-6" />
              </Button>
            )}

            {/* AI Toggle Button */}
            {isAIDocumentationMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAIToggle}
                className={cn(
                  "h-12 w-12 p-0 rounded-full transition-all duration-300 hover:scale-105 active:scale-95",
                  currentMode === 'ai'
                    ? "bg-primary/20 hover:bg-primary/30 text-primary shadow-md hover:shadow-lg"
                    : "hover:bg-primary/10 text-muted-foreground hover:text-primary hover:shadow-md"
                )}
                disabled={isLoading}
                aria-label={currentMode === 'ai' ? "Zur normalen Suche wechseln" : "AI Assistent öffnen"}
                title={currentMode === 'ai' ? "Zur normalen Suche wechseln" : "AI Assistent öffnen"}
              >
                <Atom className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>

        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* Mode Indicator */}
      {isAIDocumentationMode && currentMode === 'ai' && (
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
        <div className="text-center">
          <div className="flex flex-wrap justify-center items-center gap-3 mt-4">
            <button
              onClick={() => setQuery('Mieter')}
              className="bg-background border-2 border-input hover:border-ring text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95 text-foreground hover:text-primary flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Mieter
            </button>
            <button
              onClick={() => setQuery('Betriebskosten')}
              className="bg-background border-2 border-input hover:border-ring text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95 text-foreground hover:text-primary flex items-center gap-2"
            >
              <Euro className="h-4 w-4" />
              Betriebskosten
            </button>
            <button
              onClick={() => setQuery('Wohnung')}
              className="bg-background border-2 border-input hover:border-ring text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95 text-foreground hover:text-primary flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Wohnung
            </button>
            <button
              onClick={() => setQuery('Dokumente')}
              className="bg-background border-2 border-input hover:border-ring text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95 text-foreground hover:text-primary flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Dokumente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}