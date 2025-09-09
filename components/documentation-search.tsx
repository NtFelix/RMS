'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function DocumentationSearch({ 
  onSearch, 
  placeholder = "Dokumentation durchsuchen...",
  className = ""
}: SearchProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 hover:bg-muted"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Suche löschen</span>
          </Button>
        )}
      </div>
    </div>
  );
}