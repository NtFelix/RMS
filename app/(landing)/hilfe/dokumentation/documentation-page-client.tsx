'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { DocumentationSearch } from '@/components/documentation/documentation-search';
import { DocumentationArticleList, Article } from '@/components/documentation/documentation-article-list';
import { DocumentationCategoryCards } from '@/components/documentation/documentation-category-cards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAIAssistantStore } from '@/hooks/use-ai-assistant-store';
import { useModalStore } from '@/hooks/use-modal-store';
import type { Category } from '@/components/documentation/documentation-categories';

const DocumentationTableOfContents = dynamic(
  () =>
    import('@/components/documentation/documentation-table-of-contents').then(
      (mod) => mod.DocumentationTableOfContents,
    ),
  {
    ssr: false,
    loading: () => (
      <Card className="border-2 border-input bg-background shadow-sm">
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    ),
  },
)

const DocumentationArticleViewer = dynamic(
  () =>
    import('@/components/documentation/documentation-article-viewer').then(
      (mod) => mod.DocumentationArticleViewer,
    ),
  {
    ssr: false,
    loading: () => (
      <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    ),
  },
)

interface DocumentationPageClientProps {
  initialCategories: Category[];
  initialArticles: Article[];
  initialSelectedArticle: Article | null;
  initialSelectedCategory: string | null;
  initialSearchQuery: string;
}

interface DocumentationState {
  categories: Category[];
  articles: Article[];
  selectedCategory: string | null;
  selectedArticle: Article | null;
  searchQuery: string;
  isLoadingCategories: boolean;
  isLoadingArticles: boolean;
  error: string | null;
}

export default function DocumentationPageClient({
  initialCategories,
  initialArticles,
  initialSelectedArticle,
  initialSelectedCategory,
  initialSearchQuery,
}: DocumentationPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { switchToSearch } = useAIAssistantStore();
  const { closeAIAssistantModal } = useModalStore();
  const initialArticleKeyRef = useRef(initialSelectedArticle?.id ?? null);

  const [state, setState] = useState<DocumentationState>({
    categories: initialCategories,
    articles: initialArticles,
    selectedCategory: initialSelectedCategory,
    selectedArticle: initialSelectedArticle,
    searchQuery: initialSearchQuery,
    isLoadingCategories: initialCategories.length === 0,
    isLoadingArticles: false,
    error: null,
  });

  const [loadedQueryKey, setLoadedQueryKey] = useState(
    `${initialSelectedCategory ?? ''}::${initialSearchQuery}`,
  );

  const updateURL = useCallback(
    (params: { category?: string | null; article?: string | null; search?: string | null }) => {
      const newParams = new URLSearchParams();

      if (params.category) {
        newParams.set('category', params.category);
      }
      if (params.article) {
        newParams.set('article', params.article);
      }
      if (params.search) {
        newParams.set('search', params.search);
      }

      const nextUrl = `/hilfe/dokumentation${newParams.toString() ? `?${newParams.toString()}` : ''}`;
      router.replace(nextUrl, { scroll: false });
    },
    [router],
  );

  const loadCategories = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoadingCategories: true, error: null }));
      const response = await fetch('/api/dokumentation/categories');
      if (!response.ok) {
        throw new Error(`Failed to load categories: ${response.statusText}`);
      }

      const categories = await response.json();
      setState((prev) => ({ ...prev, categories, isLoadingCategories: false }));
    } catch (error) {
      console.error('Error loading categories:', error);
      setState((prev) => ({
        ...prev,
        isLoadingCategories: false,
        error: 'Fehler beim Laden der Kategorien',
      }));
      toast({
        title: 'Fehler',
        description: 'Kategorien konnten nicht geladen werden.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const loadArticles = useCallback(
    async (category: string | null, query: string) => {
      try {
        setState((prev) => ({ ...prev, isLoadingArticles: true, error: null }));

        const response = await fetch(
          query
            ? `/api/dokumentation/search?q=${encodeURIComponent(query)}`
            : category
              ? `/api/dokumentation?kategorie=${encodeURIComponent(category)}`
              : '/api/dokumentation',
        );

        if (!response.ok) {
          throw new Error(`Failed to load articles: ${response.statusText}`);
        }

        const articles = await response.json();
        setState((prev) => ({ ...prev, articles, isLoadingArticles: false }));
        setLoadedQueryKey(`${category ?? ''}::${query}`);
      } catch (error) {
        console.error('Error loading articles:', error);
        setState((prev) => ({
          ...prev,
          isLoadingArticles: false,
          error: query ? 'Fehler bei der Suche' : 'Fehler beim Laden der Artikel',
        }));
        toast({
          title: 'Fehler',
          description: query
            ? 'Suche konnte nicht durchgeführt werden.'
            : 'Artikel konnten nicht geladen werden.',
          variant: 'destructive',
        });
      }
    },
    [toast],
  );

  const loadArticleById = useCallback(
    async (articleId: string) => {
      try {
        const response = await fetch(`/api/dokumentation/${articleId}`);
        if (!response.ok) {
          throw new Error(`Failed to load article: ${response.statusText}`);
        }

        const article = await response.json();
        setState((prev) => ({ ...prev, selectedArticle: article }));
      } catch (error) {
        console.error('Error loading article:', error);
        toast({
          title: 'Fehler',
          description: 'Artikel konnte nicht geladen werden.',
          variant: 'destructive',
        });
      }
    },
    [toast],
  );

  useEffect(() => {
    if (initialCategories.length === 0) {
      void loadCategories();
    }
  }, [initialCategories.length, loadCategories]);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const articleParam = searchParams.get('article');
    const searchParam = searchParams.get('search') || '';
    const nextQueryKey = `${categoryParam ?? ''}::${searchParam}`;

    setState((prev) => ({
      ...prev,
      selectedCategory: categoryParam,
      searchQuery: searchParam,
      selectedArticle: articleParam ? prev.selectedArticle : null,
    }));

    if (nextQueryKey !== loadedQueryKey) {
      void loadArticles(categoryParam, searchParam);
    }

    if (articleParam && articleParam !== initialArticleKeyRef.current) {
      if (state.selectedArticle?.id !== articleParam) {
        void loadArticleById(articleParam);
      }
    }
  }, [searchParams, loadedQueryKey, loadArticles, loadArticleById, state.selectedArticle?.id]);

  const handleSearch = useCallback(
    (query: string) => {
      setState((prev) => ({ ...prev, searchQuery: query, selectedArticle: null }));
      updateURL({
        search: query || null,
        category: query ? null : state.selectedCategory,
        article: null,
      });
    },
    [state.selectedCategory, updateURL],
  );

  const handleCategorySelect = useCallback(
    (category: string | null) => {
      setState((prev) => ({
        ...prev,
        selectedCategory: category,
        selectedArticle: null,
        searchQuery: '',
      }));
      updateURL({ category, article: null, search: null });
    },
    [updateURL],
  );

  const handleArticleSelect = useCallback(
    (article: Article) => {
      setState((prev) => ({ ...prev, selectedArticle: article }));
      updateURL({
        category: state.selectedCategory,
        article: article.id,
        search: state.searchQuery || null,
      });
    },
    [state.searchQuery, state.selectedCategory, updateURL],
  );

  const handleBackToList = useCallback(() => {
    setState((prev) => ({ ...prev, selectedArticle: null }));
    updateURL({
      category: state.selectedCategory,
      article: null,
      search: state.searchQuery || null,
    });
  }, [state.searchQuery, state.selectedCategory, updateURL]);

  const handleFallbackToSearch = useCallback(() => {
    switchToSearch();
    closeAIAssistantModal();
    toast({
      title: 'Zur normalen Suche gewechselt',
      description: 'Sie können jetzt die normale Dokumentationssuche verwenden.',
    });
  }, [closeAIAssistantModal, switchToSearch, toast]);

  const documentationContext = {
    articles: state.articles,
    categories: state.categories,
    selectedCategory: state.selectedCategory,
    selectedArticle: state.selectedArticle,
    totalArticles: state.articles.length,
    totalCategories: state.categories.length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <BookOpen className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Dokumentation
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
            Finden Sie Antworten auf Ihre Fragen und lernen Sie, wie Sie Mietevo optimal nutzen können.
          </p>

          <div className="max-w-4xl mx-auto mb-8">
            <DocumentationSearch
              onSearch={handleSearch}
              placeholder="Durchsuchen Sie die gesamte Dokumentation..."
              documentationContext={documentationContext}
              onFallbackToSearch={handleFallbackToSearch}
            />
          </div>
        </div>

        {state.error && (
          <Alert variant="destructive" className="mb-8 max-w-4xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
          <div className="lg:col-span-3">
            <div className="sticky top-24">
              <DocumentationTableOfContents
                categories={state.categories}
                articles={state.articles}
                selectedCategory={state.selectedCategory}
                selectedArticle={state.selectedArticle}
                onCategorySelect={handleCategorySelect}
                onArticleSelect={handleArticleSelect}
                isLoading={state.isLoadingCategories || state.isLoadingArticles}
              />
            </div>
          </div>

          <div className="lg:col-span-9">
            {state.selectedArticle ? (
              <DocumentationArticleViewer
                article={state.selectedArticle}
                onBack={handleBackToList}
                selectedCategory={state.selectedCategory}
                searchQuery={state.searchQuery}
              />
            ) : !state.selectedCategory && !state.searchQuery ? (
              <DocumentationCategoryCards
                categories={state.categories}
                onCategorySelect={handleCategorySelect}
                isLoading={state.isLoadingCategories}
              />
            ) : (
              <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold">
                      {state.searchQuery ? (
                        <>
                          Suchergebnisse für <span className="text-primary">"{state.searchQuery}"</span>
                        </>
                      ) : state.selectedCategory ? (
                        <>
                          Artikel in <span className="text-primary">"{state.selectedCategory}"</span>
                        </>
                      ) : (
                        'Alle Artikel'
                      )}
                    </CardTitle>
                    {state.articles.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {state.articles.length} {state.articles.length === 1 ? 'Artikel' : 'Artikel'}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <DocumentationArticleList
                    articles={state.articles}
                    searchQuery={state.searchQuery}
                    selectedArticle={state.selectedArticle}
                    onArticleSelect={handleArticleSelect}
                    isLoading={state.isLoadingArticles}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
