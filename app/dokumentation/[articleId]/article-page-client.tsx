'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentationArticleViewer } from '@/components/documentation-article-viewer';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Article } from '@/types/documentation';

interface ArticlePageClientProps {
  articleId: string;
}

export default function ArticlePageClient({ articleId }: ArticlePageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadArticle = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/dokumentation/${articleId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Artikel nicht gefunden');
          } else {
            throw new Error(`Failed to load article: ${response.statusText}`);
          }
          return;
        }

        const articleData = await response.json();
        setArticle(articleData);
      } catch (error) {
        console.error('Error loading article:', error);
        setError('Fehler beim Laden des Artikels');
        toast({
          title: 'Fehler',
          description: 'Artikel konnte nicht geladen werden.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (articleId) {
      loadArticle();
    }
  }, [articleId, toast]);

  const handleBack = () => {
    router.push('/dokumentation');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-8 w-32 mb-8" />
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/2 mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <Alert variant="destructive" className="mb-8">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Artikel konnte nicht geladen werden'}
              </AlertDescription>
            </Alert>
            <button
              onClick={handleBack}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              ← Zurück zur Dokumentation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <DocumentationArticleViewer
            article={article}
            onBack={handleBack}
            selectedCategory={null}
            searchQuery=""
          />
        </div>
      </div>
    </div>
  );
}