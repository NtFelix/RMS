'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Search } from 'lucide-react';
import type { Article } from '@/types/documentation';

interface VirtualArticleListProps {
  articles: Article[];
  searchQuery?: string;
  onArticleSelect: (article: Article) => void;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  className?: string;
}

interface VirtualItem {
  index: number;
  article: Article;
  top: number;
  height: number;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$1')})`, 'gi');
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

export function VirtualArticleList({
  articles,
  searchQuery = '',
  onArticleSelect,
  itemHeight = 120,
  containerHeight = 600,
  overscan = 5,
  className = ""
}: VirtualArticleListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      articles.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, articles.length]);

  // Calculate virtual items
  const virtualItems = useMemo((): VirtualItem[] => {
    const items: VirtualItem[] = [];
    
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (articles[i]) {
        items.push({
          index: i,
          article: articles[i],
          top: i * itemHeight,
          height: itemHeight,
        });
      }
    }
    
    return items;
  }, [articles, visibleRange, itemHeight]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Scroll to top when articles change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [articles]);

  const totalHeight = articles.length * itemHeight;

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

  return (
    <div className={className}>
      {/* Virtual scroll container */}
      <div
        ref={containerRef}
        className="overflow-auto border rounded-lg"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* Total height spacer */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Visible items */}
          {virtualItems.map((virtualItem) => {
            const { article, top, height } = virtualItem;
            const previewText = getPreviewText(article.seiteninhalt);
            
            return (
              <div
                key={article.id}
                style={{
                  position: 'absolute',
                  top,
                  height,
                  width: '100%',
                  padding: '8px',
                }}
              >
                <Card 
                  className="h-full cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => onArticleSelect(article)}
                >
                  <CardHeader className="pb-2 px-4 pt-3">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-base font-semibold leading-tight line-clamp-2">
                        {highlightText(article.titel, searchQuery)}
                      </h3>
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    </div>
                    {article.kategorie && (
                      <Badge variant="outline" className="w-fit text-xs">
                        {article.kategorie}
                      </Badge>
                    )}
                  </CardHeader>
                  {previewText && (
                    <CardContent className="pt-0 px-4 pb-3">
                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                        {highlightText(previewText, searchQuery)}
                      </p>
                    </CardContent>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Article count indicator */}
      <div className="mt-2 text-sm text-muted-foreground text-center">
        {articles.length} Artikel{articles.length !== 1 ? '' : ''}
        {searchQuery && ` für "${searchQuery}"`}
      </div>
    </div>
  );
}

// Hook for managing virtual scrolling state
export function useVirtualScroll(
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, itemCount]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    const targetScrollTop = index * itemHeight;
    setScrollTop(targetScrollTop);
    return targetScrollTop;
  }, [itemHeight]);

  const scrollToTop = useCallback(() => {
    setScrollTop(0);
  }, []);

  return {
    scrollTop,
    visibleRange,
    handleScroll,
    scrollToIndex,
    scrollToTop,
    totalHeight: itemCount * itemHeight,
  };
}