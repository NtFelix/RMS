'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileText, Search } from 'lucide-react';

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
  isLoading = false,
  className = ""
}: ArticleListProps) {
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

  return (
    <div className={`space-y-4 ${className}`}>
      {articles.map((article) => {
        const previewText = getPreviewText(article.seiteninhalt);
        
        return (
          <Card 
            key={article.id} 
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => onArticleSelect(article)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold leading-tight">
                  {highlightText(article.titel, searchQuery)}
                </h3>
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              </div>
              {article.kategorie && (
                <Badge variant="outline" className="w-fit">
                  {article.kategorie}
                </Badge>
              )}
            </CardHeader>
            {previewText && (
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {highlightText(previewText, searchQuery)}
                </p>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}