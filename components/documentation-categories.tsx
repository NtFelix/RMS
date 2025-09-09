'use client';

import { useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, Folder, AlertTriangle } from 'lucide-react';

export interface Category {
  name: string;
  articleCount: number;
}

interface CategoryListProps {
  categories: Category[];
  onCategorySelect: (category: string | null) => void;
  selectedCategory?: string | null;
  isLoading?: boolean;
  className?: string;
}

export function DocumentationCategories({
  categories,
  onCategorySelect,
  selectedCategory,
  isLoading = false,
  className = ""
}: CategoryListProps) {
  const [error, setError] = useState<Error | null>(null);

  // Error handling for category selection
  const handleCategorySelect = useCallback((category: string | null) => {
    try {
      onCategorySelect(category);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to select category');
      setError(error);
      console.error('Error selecting category:', error);
    }
  }, [onCategorySelect]);

  // Retry mechanism
  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  // Memoize total article count for performance
  const totalArticleCount = useMemo(() => {
    return categories.reduce((sum, cat) => sum + cat.articleCount, 0);
  }, [categories]);

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <p className="text-muted-foreground mb-4">
            Fehler beim Laden der Kategorien: {error.message}
          </p>
          <Button onClick={handleRetry} variant="outline" size="sm">
            Erneut versuchen
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="mb-4">
          <Skeleton className="h-6 w-32" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Keine Kategorien verfügbar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Kategorien</h3>
      </div>
      
      {/* All Articles Button */}
      <Button
        variant={selectedCategory === null ? "default" : "ghost"}
        onClick={() => handleCategorySelect(null)}
        className="w-full justify-between h-auto p-3 focus:ring-2 focus:ring-ring"
        aria-pressed={selectedCategory === null}
        aria-label={`Alle Artikel anzeigen (${totalArticleCount} Artikel)`}
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          <span>Alle Artikel</span>
        </div>
        <Badge variant="secondary">
          {totalArticleCount}
        </Badge>
      </Button>

      {/* Category Buttons */}
      {categories.map((category) => (
        <Button
          key={category.name}
          variant={selectedCategory === category.name ? "default" : "ghost"}
          onClick={() => handleCategorySelect(category.name)}
          className="w-full justify-between h-auto p-3 focus:ring-2 focus:ring-ring"
          disabled={category.articleCount === 0}
          aria-pressed={selectedCategory === category.name}
          aria-label={`Kategorie ${category.name || 'Ohne Kategorie'} (${category.articleCount} Artikel)`}
        >
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            <span className="truncate">{category.name || 'Ohne Kategorie'}</span>
          </div>
          <Badge variant="secondary">
            {category.articleCount}
          </Badge>
        </Button>
      ))}
    </div>
  );
}