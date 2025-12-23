'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileText, Search, AlertTriangle } from 'lucide-react';
import { VirtualArticleList } from '@/components/documentation/virtual-article-list';

export interface Article {
  id: string;
  titel: string;
  kategorie: string | null;
  seiteninhalt: string | null;
  meta: Record<string, any> | null;
}

interface ArticleListProps {
  articles: Article[];
  searchQuery?: string;
  onArticleSelect: (article: Article) => void;
  selectedArticle?: Article | null;
  isLoading?: boolean;
  className?: string;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function getPreviewText(content: string | null, maxLength: number = 150): string {
  if (!content) return '';
  
  // Remove HTML tags and normalize whitespace
  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (plainText.length <= maxLength) return plainText;
  
  // Find the last complete word within the limit
  const truncated = plainText.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  return lastSpaceIndex > 0 
    ? truncated.substring(0, lastSpaceIndex) + '...'
    : truncated + '...';
}

export function DocumentationArticleList({
  articles,
  searchQuery = '',
  onArticleSelect,
  selectedArticle = null,
  isLoading = false,
  className = ""
}: ArticleListProps) {
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Error handling for article selection
  const handleArticleSelect = useCallback((article: Article) => {
    try {
      onArticleSelect(article);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to select article');
      setError(error);
      console.error('Error selecting article:', error);
    }
  }, [onArticleSelect]);

  // Retry mechanism
  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount(prev => prev + 1);
  }, []);

  // Memoize article rendering for performance
  const renderedArticles = useMemo(() => {
    return articles.map((article) => {
      const previewText = getPreviewText(article.seiteninhalt);
      
      return (
        <Card 
          key={article.id} 
          className={`group cursor-pointer transition-all duration-300 border-2 focus-within:ring-2 focus-within:ring-ring ${
            selectedArticle?.id === article.id 
              ? "bg-primary/5 border-primary shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/15" 
              : "bg-background border-input hover:border-ring hover:shadow-md"
          }`}
          onClick={() => handleArticleSelect(article)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleArticleSelect(article);
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={`Artikel öffnen: ${article.titel}`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 transition-all duration-300 ${
                  selectedArticle?.id === article.id 
                    ? "bg-primary/20 group-hover:bg-primary/30" 
                    : "bg-primary/10 group-hover:bg-primary/20"
                }`}>
                  <FileText className="h-5 w-5 text-primary transition-all duration-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-semibold leading-tight transition-colors duration-300 ${
                    selectedArticle?.id === article.id 
                      ? "text-primary" 
                      : "text-foreground group-hover:text-primary"
                  }`}>
                    {highlightText(article.titel, searchQuery)}
                  </h3>
                  {article.kategorie && (
                    <Badge 
                      variant="outline" 
                      className={`w-fit mt-2 transition-all duration-300 ${
                        selectedArticle?.id === article.id 
                          ? "border-primary/70 bg-primary/10 text-primary" 
                          : "border-border group-hover:border-primary/50 group-hover:bg-primary/5 group-hover:text-primary"
                      }`}
                    >
                      {article.kategorie}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          {previewText && (
            <CardContent className="pt-0 pl-16">
              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                {highlightText(previewText, searchQuery)}
              </p>
            </CardContent>
          )}
        </Card>
      );
    });
  }, [articles, searchQuery, handleArticleSelect]);

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Fehler beim Laden der Artikel</h3>
          <p className="text-muted-foreground mb-4">
            {error.message}
          </p>
          <Button onClick={handleRetry} variant="outline">
            Erneut versuchen
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          {searchQuery ? (
            <>
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine Ergebnisse gefunden</h3>
              <p className="text-muted-foreground">
                Keine Artikel gefunden für "{searchQuery}". Versuchen Sie andere Suchbegriffe.
              </p>
            </>
          ) : (
            <>
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine Artikel verfügbar</h3>
              <p className="text-muted-foreground">
                In dieser Kategorie sind noch keine Artikel vorhanden.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Use virtual scrolling for large lists
  if (articles.length > 50) {
    return (
      <div className={className}>
        <VirtualArticleList
          articles={articles}
          searchQuery={searchQuery}
          onArticleSelect={handleArticleSelect}
          containerHeight={600}
          itemHeight={120}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`} role="list">
      {renderedArticles}
    </div>
  );
}