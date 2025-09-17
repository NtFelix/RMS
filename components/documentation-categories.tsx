'use client';

import { useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, Folder, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Boolean for cleaner conditional logic
  const isAllArticlesSelected = selectedCategory === null;

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
      <div className={`space-y-3 ${className} overflow-hidden`}>
        <div className="mb-4 pb-2 border-b border-border/50">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
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
    <div className={`space-y-3 ${className} overflow-hidden`}>
      <div className="mb-4 pb-2 border-b border-border/50">
        <h3 className="text-lg font-semibold text-foreground">Kategorien</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {categories.length} {categories.length === 1 ? 'Kategorie' : 'Kategorien'}
        </p>
      </div>
      
      {/* All Articles Button */}
      <Button
        variant="ghost"
        onClick={() => handleCategorySelect(null)}
        className={cn(
          "w-full justify-between h-auto p-3 focus:ring-2 focus:ring-ring group transition-all duration-300 ease-out rounded-lg border-2 relative overflow-hidden",
          isAllArticlesSelected
            ? "bg-primary hover:bg-primary/90 border-primary text-primary-foreground shadow-lg shadow-primary/25"
            : "bg-card hover:bg-primary/10 border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
        )}
        aria-pressed={isAllArticlesSelected}
        aria-label={`Alle Artikel anzeigen (${totalArticleCount} Artikel)`}
      >
        {/* Hover gradient overlay */}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
          isAllArticlesSelected
            ? "bg-gradient-to-r from-primary-foreground/5 to-transparent"
            : "bg-gradient-to-r from-primary/5 to-transparent"
        )} />
        
        <div className="flex items-center gap-3 min-w-0 flex-1 relative z-10">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-out",
            isAllArticlesSelected
              ? "bg-primary-foreground/20 group-hover:bg-primary-foreground/30 group-hover:shadow-sm"
              : "bg-primary/10 group-hover:bg-primary/20 group-hover:shadow-sm group-hover:shadow-primary/20"
          )}>
            <FolderOpen className={cn(
              "h-4 w-4 transition-all duration-300 ease-out",
              isAllArticlesSelected
                ? "text-primary-foreground group-hover:drop-shadow-sm"
                : "text-primary group-hover:text-primary group-hover:drop-shadow-sm"
            )} strokeWidth={2} />
          </div>
          <span className={cn(
            "text-left text-sm font-semibold transition-all duration-300 ease-out",
            isAllArticlesSelected
              ? "text-primary-foreground group-hover:drop-shadow-sm"
              : "text-foreground group-hover:text-primary group-hover:font-bold"
          )}>
            Alle Artikel
          </span>
        </div>
        <Badge 
          variant="secondary" 
          className={cn(
            "ml-2 flex-shrink-0 text-xs px-2 py-1 font-semibold transition-all duration-300 ease-out relative z-10",
            isAllArticlesSelected
              ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 group-hover:bg-primary-foreground/30 group-hover:shadow-sm"
              : "bg-primary/10 text-primary border-primary/30 group-hover:bg-primary/20 group-hover:border-primary/50 group-hover:shadow-sm group-hover:shadow-primary/20"
          )}
        >
          {totalArticleCount}
        </Badge>
      </Button>

      {/* Category Buttons */}
      {categories.map((category) => (
        <Button
          key={category.name}
          variant="ghost"
          onClick={() => handleCategorySelect(category.name)}
          className={`w-full justify-between h-auto p-3 focus:ring-2 focus:ring-ring group transition-all duration-300 ease-out rounded-lg border-2 relative overflow-hidden ${
            selectedCategory === category.name
              ? "bg-primary hover:bg-primary/90 border-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-card hover:bg-primary/10 border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
          } ${
            category.articleCount === 0 
              ? "opacity-50 cursor-not-allowed hover:shadow-none hover:bg-card hover:border-border" 
              : ""
          }`}
          disabled={category.articleCount === 0}
          aria-pressed={selectedCategory === category.name}
          aria-label={`Kategorie ${category.name || 'Ohne Kategorie'} (${category.articleCount} Artikel)`}
        >
          {/* Hover gradient overlay */}
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
            selectedCategory === category.name 
              ? "bg-gradient-to-r from-primary-foreground/5 to-transparent" 
              : "bg-gradient-to-r from-primary/5 to-transparent"
          } ${
            category.articleCount === 0 ? "group-hover:opacity-0" : ""
          }`} />
          
          <div className="flex items-center gap-2 min-w-0 flex-1 relative z-10">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-out ${
              selectedCategory === category.name 
                ? "bg-primary-foreground/20 group-hover:bg-primary-foreground/30 group-hover:shadow-sm" 
                : "bg-primary/10 group-hover:bg-primary/20 group-hover:shadow-sm group-hover:shadow-primary/20"
            } ${
              category.articleCount === 0 
                ? "group-hover:bg-primary/10 group-hover:shadow-none" 
                : ""
            }`}>
              <Folder className={`h-3.5 w-3.5 transition-all duration-300 ease-out ${
                selectedCategory === category.name 
                  ? "text-primary-foreground group-hover:drop-shadow-sm" 
                  : "text-primary group-disabled:group-hover:text-current group-hover:drop-shadow-sm"
              } ${
                category.articleCount === 0 
                  ? "group-hover:drop-shadow-none" 
                  : ""
              }`} />
            </div>
            <span 
              className={`truncate text-left text-sm font-medium transition-all duration-300 ease-out ${
                selectedCategory === category.name 
                  ? "text-primary-foreground group-hover:drop-shadow-sm" 
                  : "text-foreground group-hover:text-primary group-hover:font-semibold group-disabled:group-hover:text-current group-disabled:group-hover:font-medium"
              }`}
              title={category.name || 'Ohne Kategorie'}
            >
              {category.name || 'Ohne Kategorie'}
            </span>
          </div>
          <Badge 
            variant="secondary" 
            className={`ml-2 flex-shrink-0 text-xs px-2 py-1 font-medium transition-all duration-300 ease-out relative z-10 ${
              selectedCategory === category.name 
                ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 group-hover:bg-primary-foreground/30 group-hover:shadow-sm" 
                : "bg-primary/10 text-primary border-primary/30 group-hover:bg-primary/20 group-hover:border-primary/50 group-hover:shadow-sm group-hover:shadow-primary/20 group-disabled:group-hover:bg-secondary group-disabled:group-hover:border-secondary group-disabled:group-hover:shadow-none"
            }`}
          >
            {category.articleCount}
          </Badge>
        </Button>
      ))}
    </div>
  );
}