'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { Article } from './documentation-article-list';

interface ArticleViewerProps {
  article: Article;
  onBack: () => void;
  className?: string;
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

function formatContent(content: string | null): React.ReactNode {
  if (!content) return null;

  // Basic HTML content rendering - in a real app, you might want to use a proper markdown/HTML renderer
  // For now, we'll handle basic formatting and preserve line breaks
  const formattedContent = content
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  return (
    <div 
      className="prose prose-sm max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ 
        __html: `<p>${formattedContent}</p>` 
      }}
    />
  );
}

export function DocumentationArticleViewer({
  article,
  onBack,
  className = ""
}: ArticleViewerProps) {
  const createdDate = article.meta?.created_time;
  const lastEditedDate = article.meta?.last_edited_time;
  const createdBy = article.meta?.created_by?.name || article.meta?.created_by?.object;
  const lastEditedBy = article.meta?.last_edited_by?.name || article.meta?.last_edited_by?.object;

  return (
    <div className={className}>
      {/* Back Navigation */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="gap-2 px-0 hover:bg-transparent"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Button>
      </div>

      {/* Article Content */}
      <Card>
        <CardHeader className="pb-4">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold leading-tight">
              {article.titel}
            </h1>
            
            {article.kategorie && (
              <Badge variant="outline" className="w-fit">
                {article.kategorie}
              </Badge>
            )}

            {/* Metadata */}
            {(createdDate || lastEditedDate) && (
              <>
                <Separator />
                <div className="flex flex-col sm:flex-row gap-4 text-sm text-muted-foreground">
                  {createdDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Erstellt: {formatDate(createdDate)}</span>
                      {createdBy && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {createdBy}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {lastEditedDate && lastEditedDate !== createdDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Bearbeitet: {formatDate(lastEditedDate)}</span>
                      {lastEditedBy && lastEditedBy !== createdBy && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {lastEditedBy}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {article.seiteninhalt ? (
            <div className="space-y-4">
              {formatContent(article.seiteninhalt)}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Kein Inhalt verfügbar für diesen Artikel.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Metadata */}
      {article.meta && Object.keys(article.meta).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <h3 className="text-lg font-semibold">Zusätzliche Informationen</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {Object.entries(article.meta)
                .filter(([key]) => !['created_time', 'last_edited_time', 'created_by', 'last_edited_by'].includes(key))
                .map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <dt className="font-medium text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </dt>
                    <dd className="text-foreground">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </dd>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}