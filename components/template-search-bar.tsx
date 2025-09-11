"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/use-debounce"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface TemplateSearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
  onSearchHighlight?: (query: string) => void
}

export function TemplateSearchBar({ 
  value, 
  onChange, 
  placeholder = "Vorlagen durchsuchen...",
  debounceMs = 300,
  className,
  onSearchHighlight
}: TemplateSearchBarProps) {
  const [localValue, setLocalValue] = useState(value)
  const debouncedValue = useDebounce(localValue, debounceMs)
  const isMobile = useIsMobile()

  // Sanitize search query for security
  const sanitizeQuery = useCallback((query: string): string => {
    // Remove potentially dangerous characters and limit length
    return query
      .replace(/[<>'"&]/g, '') // Remove HTML/script injection characters
      .replace(/[{}[\]]/g, '') // Remove object notation characters
      .trim()
      .substring(0, 100) // Limit to 100 characters
  }, [])

  // Update parent component when debounced value changes
  useEffect(() => {
    const sanitizedValue = sanitizeQuery(debouncedValue)
    onChange(sanitizedValue)
    
    // Trigger search highlighting if callback provided
    if (onSearchHighlight && sanitizedValue.trim()) {
      onSearchHighlight(sanitizedValue)
    }
  }, [debouncedValue, onChange, sanitizeQuery, onSearchHighlight])

  // Sync local value with prop value when it changes externally
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value)
    }
  }, [value, localValue])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
  }, [])

  // Handle clear button click
  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
    
    // Focus back to input after clearing
    const input = document.querySelector('[data-testid="template-search-input"]') as HTMLInputElement
    if (input) {
      input.focus()
    }
  }, [onChange])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Escape':
        if (localValue) {
          e.preventDefault()
          handleClear()
        }
        break
      case 'Enter':
        e.preventDefault()
        // Trigger immediate search on Enter
        const sanitizedValue = sanitizeQuery(localValue)
        onChange(sanitizedValue)
        if (onSearchHighlight && sanitizedValue.trim()) {
          onSearchHighlight(sanitizedValue)
        }
        break
    }
  }, [localValue, handleClear, sanitizeQuery, onChange, onSearchHighlight])

  // Memoize search status for performance
  const searchStatus = useMemo(() => {
    const hasValue = localValue.trim().length > 0
    const sanitizedValue = sanitizeQuery(localValue)
    const isSearching = localValue !== debouncedValue
    const hasInvalidChars = localValue !== sanitizedValue
    
    return {
      hasValue,
      isSearching,
      showClear: hasValue,
      hasInvalidChars
    }
  }, [localValue, debouncedValue, sanitizeQuery])

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        {/* Search Icon */}
        <Search 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" 
          aria-hidden="true"
        />
        
        {/* Search Input */}
        <Input
          data-testid="template-search-input"
          type="search"
          placeholder={placeholder}
          value={localValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={cn(
            "pl-10 pr-10",
            isMobile && "text-base", // Prevent zoom on iOS
            searchStatus.hasInvalidChars && "border-destructive focus-visible:ring-destructive"
          )}
          aria-label="Vorlagen suchen"
          aria-describedby="search-help"
          autoComplete="off"
          spellCheck="false"
          inputMode="search"
          enterKeyHint="search"
        />
        
        {/* Clear Button */}
        {searchStatus.showClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`absolute right-1 top-1/2 transform -translate-y-1/2 p-0 hover:bg-muted touch-manipulation ${
              isMobile ? 'h-7 w-7' : 'h-6 w-6'
            }`}
            onClick={handleClear}
            aria-label="Suche löschen"
            tabIndex={0}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        
        {/* Loading indicator (subtle) */}
        {searchStatus.isSearching && (
          <div 
            className="absolute right-8 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-primary rounded-full animate-pulse"
            aria-hidden="true"
          />
        )}
      </div>
      
      {/* Screen reader help text */}
      <div id="search-help" className="sr-only">
        Geben Sie Suchbegriffe ein, um Vorlagen zu finden. Drücken Sie Escape zum Löschen oder Enter zum sofortigen Suchen.
      </div>
      
      {/* Validation error (for screen readers) */}
      {searchStatus.hasInvalidChars && (
        <div className="sr-only" role="alert" aria-live="polite">
          Ungültige Suchzeichen wurden entfernt
        </div>
      )}
    </div>
  )
}

// Export search highlighting utility function
export function highlightSearchTerms(text: string, searchQuery: string): string {
  if (!searchQuery.trim() || !text) return text
  
  const query = searchQuery.trim()
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">$1</mark>')
}

// Export search term extraction utility
export function extractSearchTerms(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 0)
    .slice(0, 10) // Limit to 10 terms for performance
}