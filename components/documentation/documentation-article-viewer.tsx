'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, User, Share2, ExternalLink } from 'lucide-react';
import { Article } from './documentation-article-list';
import { DocumentationBreadcrumb } from './documentation-breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked options once when module loads for better performance
marked.setOptions({
  breaks: true, // Convert line breaks to <br>
  gfm: true, // Enable GitHub Flavored Markdown
});

interface ArticleViewerProps {
  article: Article;
  onBack: () => void;
  selectedCategory?: string | null;
  searchQuery?: string | null;
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

  try {
    // Parse markdown content to HTML synchronously
    const htmlContent = marked.parse(content, { async: false }) as string;

    // Add hook to ensure external links open safely
    DOMPurify.addHook('afterSanitizeAttributes', function (node) {
      // Ensure external links open in new tab with security attributes
      if (node.tagName === 'A' && node.hasAttribute('href')) {
        const href = node.getAttribute('href');
        // Check if it's an external link (starts with http/https or //)
        if (href && (href.startsWith('http') || href.startsWith('//'))) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        }
      }
    });

    // Sanitize the HTML to prevent XSS attacks
    const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
      // Allow common HTML elements for documentation
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'em', 'u', 'del', 'ins',
        'ul', 'ol', 'li',
        'blockquote', 'pre', 'code',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'hr', 'div', 'span'
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'alt', 'src', 'width', 'height',
        'class', 'id', 'target', 'rel'
      ],
      FORBID_ATTR: ['style', 'onclick', 'onerror', 'onload']
    });

    // Remove the hook after sanitization to avoid affecting other calls
    DOMPurify.removeHook('afterSanitizeAttributes');

    return (
      <div
        className="prose prose-sm max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-xs"
        dangerouslySetInnerHTML={{
          __html: sanitizedHtml
        }}
      />
    );
  } catch (error) {
    console.error('Error parsing markdown content:', error);

    // Fallback to basic text rendering if markdown parsing fails
    const fallbackContent = content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');

    // Also sanitize the fallback content
    const sanitizedFallback = DOMPurify.sanitize(`<p>${fallbackContent}</p>`);

    return (
      <div
        className="prose prose-sm max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{
          __html: sanitizedFallback
        }}
      />
    );
  }
}

export function DocumentationArticleViewer({
  article,
  onBack,
  selectedCategory,
  searchQuery,
  className = ""
}: ArticleViewerProps) {
  const { toast } = useToast();
  const createdDate = article.meta?.created_time;
  const lastEditedDate = article.meta?.last_edited_time;
  const createdBy = article.meta?.created_by?.name || article.meta?.created_by?.object;
  const lastEditedBy = article.meta?.last_edited_by?.name || article.meta?.last_edited_by?.object;

  // Build breadcrumb items
  const breadcrumbItems = [];

  if (searchQuery) {
    breadcrumbItems.push({
      label: `Suchergebnisse für "${searchQuery}"`,
      onClick: onBack
    });
  } else if (selectedCategory) {
    breadcrumbItems.push({
      label: selectedCategory,
      onClick: onBack
    });
  } else {
    breadcrumbItems.push({
      label: 'Alle Artikel',
      onClick: onBack
    });
  }

  breadcrumbItems.push({
    label: article.titel
  });

  // Share functionality
  const handleShare = async () => {
    const shareData = {
      title: `${article.titel} - Mietevo Dokumentation`,
      text: `Lesen Sie mehr über "${article.titel}" in der Mietevo Dokumentation.`,
      url: `${window.location.origin}/hilfe/dokumentation/${article.id}`
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: 'Link kopiert',
          description: 'Der Link wurde in die Zwischenablage kopiert.',
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: 'Fehler beim Teilen',
        description: 'Der Link konnte nicht geteilt werden.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenInNewTab = () => {
    window.open(`/hilfe/dokumentation/${article.id}`, '_blank');
  };

  return (
    <div className={className}>
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <DocumentationBreadcrumb items={breadcrumbItems} />
      </div>

      {/* Back Navigation and Actions */}
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 px-0 hover:bg-transparent"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Teilen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInNewTab}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            In neuem Tab öffnen
          </Button>
        </div>
      </div>

      {/* Article Content */}
      <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
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
        <Card className="mt-6 shadow-lg border-0 bg-card/50 backdrop-blur-sm">
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