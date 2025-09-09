'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentationArticleViewer } from '@/components/documentation-article-viewer';
import { Article } from '@/components/documentation-article-list';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ArticlePageState {
  article: Article | null;
  isLoading: boolean;
  error: string | null;
}

interface ArticlePageClientProps {
  articleId: string;
}

export default function ArticlePageClient({ articleId }: ArticlePageClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [state, setState] = useState<ArticlePageState>({
    article: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (articleId) {
      loadArticle(articleId);
    }
  }, [articleId]);

  const loadArticle = async (id: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch(`/api/documentation/${id}`);
      
      if (response.status === 404) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: 'Artikel nicht gefunden' 
        }));
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to load article: ${response.statusText}`);
      }
      
      const article = await response.json();
      setState(prev => ({ ...prev, article, isLoading: false }));
    } catch (error) {
      console.error('Error loading article:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Fehler beim Laden des Artikels' 
      }));
      toast({
        title: 'Fehler',
        description: 'Artikel konnte nicht geladen werden.',
        variant: 'destructive',
      });
    }
  };

  const handleBackToDocumentation = () => {
    router.push('/documentation');
  };

  if (state.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Navigation Skeleton */}
        <div className="mb-6">
          <Skeleton className="h-10 w-48" />
        </div>

        {/* Article Content Skeleton */}
        <Card>
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2 pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (state.error || !state.article) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Navigation */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={handleBackToDocumentation}
            className="gap-2 px-0 hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Dokumentation
          </Button>
        </div>

        {/* Error Display */}
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {state.error || 'Artikel konnte nicht gefunden werden.'}
          </AlertDescription>
        </Alert>

        <div className="mt-6 text-center">
          <Button onClick={handleBackToDocumentation}>
            Zur Dokumentation zurückkehren
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <DocumentationArticleViewer
        article={state.article}
        onBack={handleBackToDocumentation}
      />
    </div>
  );
}