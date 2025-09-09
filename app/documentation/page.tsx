'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DocumentationSearch } from '@/components/documentation-search';
import { DocumentationCategories, Category } from '@/components/documentation-categories';
import { DocumentationArticleList, Article } from '@/components/documentation-article-list';
import { DocumentationArticleViewer } from '@/components/documentation-article-viewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

function DocumentationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [state, setState] = useState<DocumentationState>({
    categories: [],
    articles: [],
    selectedCategory: null,
    selectedArticle: null,
    searchQuery: '',
    isLoadingCategories: true,
    isLoadingArticles: false,
    error: null,
  });

  // Initialize state from URL parameters
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const articleParam = searchParams.get('article');
    const searchParam = searchParams.get('search') || '';

    setState(prev => ({
      ...prev,
      selectedCategory: categoryParam,
      searchQuery: searchParam,
    }));

    // If there's an article ID in the URL, we'll load it after articles are fetched
    if (articleParam) {
      loadArticleById(articleParam);
    }
  }, [searchParams]);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load articles when category or search changes
  useEffect(() => {
    if (state.searchQuery) {
      searchArticles(state.searchQuery);
    } else {
      loadArticles(state.selectedCategory);
    }
  }, [state.selectedCategory, state.searchQuery]);

  const updateURL = useCallback((params: { 
    category?: string | null; 
    article?: string | null; 
    search?: string | null;
  }) => {
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

    const newURL = `/documentation${newParams.toString() ? `?${newParams.toString()}` : ''}`;
    router.replace(newURL, { scroll: false });
  }, [router]);

  const loadCategories = async () => {
    try {
      setState(prev => ({ ...prev, isLoadingCategories: true, error: null }));
      
      const response = await fetch('/api/documentation/categories');
      if (!response.ok) {
        throw new Error(`Failed to load categories: ${response.statusText}`);
      }
      
      const categories = await response.json();
      setState(prev => ({ ...prev, categories, isLoadingCategories: false }));
    } catch (error) {
      console.error('Error loading categories:', error);
      setState(prev => ({ 
        ...prev, 
        isLoadingCategories: false, 
        error: 'Fehler beim Laden der Kategorien' 
      }));
      toast({
        title: 'Fehler',
        description: 'Kategorien konnten nicht geladen werden.',
        variant: 'destructive',
      });
    }
  };

  const loadArticles = async (category: string | null) => {
    try {
      setState(prev => ({ ...prev, isLoadingArticles: true, error: null }));
      
      const url = category 
        ? `/api/documentation?category=${encodeURIComponent(category)}`
        : '/api/documentation';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load articles: ${response.statusText}`);
      }
      
      const articles = await response.json();
      setState(prev => ({ ...prev, articles, isLoadingArticles: false }));
    } catch (error) {
      console.error('Error loading articles:', error);
      setState(prev => ({ 
        ...prev, 
        isLoadingArticles: false, 
        error: 'Fehler beim Laden der Artikel' 
      }));
      toast({
        title: 'Fehler',
        description: 'Artikel konnten nicht geladen werden.',
        variant: 'destructive',
      });
    }
  };

  const searchArticles = async (query: string) => {
    if (!query.trim()) {
      loadArticles(state.selectedCategory);
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoadingArticles: true, error: null }));
      
      const response = await fetch(`/api/documentation/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const articles = await response.json();
      setState(prev => ({ ...prev, articles, isLoadingArticles: false }));
    } catch (error) {
      console.error('Error searching articles:', error);
      setState(prev => ({ 
        ...prev, 
        isLoadingArticles: false, 
        error: 'Fehler bei der Suche' 
      }));
      toast({
        title: 'Fehler',
        description: 'Suche konnte nicht durchgeführt werden.',
        variant: 'destructive',
      });
    }
  };

  const loadArticleById = async (articleId: string) => {
    try {
      const response = await fetch(`/api/documentation/${articleId}`);
      if (!response.ok) {
        throw new Error(`Failed to load article: ${response.statusText}`);
      }
      
      const article = await response.json();
      setState(prev => ({ ...prev, selectedArticle: article }));
    } catch (error) {
      console.error('Error loading article:', error);
      toast({
        title: 'Fehler',
        description: 'Artikel konnte nicht geladen werden.',
        variant: 'destructive',
      });
    }
  };

  const handleSearch = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query, selectedArticle: null }));
    updateURL({ 
      search: query || null, 
      category: query ? null : state.selectedCategory,
      article: null 
    });
  }, [updateURL, state.selectedCategory]);

  const handleCategorySelect = useCallback((category: string | null) => {
    setState(prev => ({ 
      ...prev, 
      selectedCategory: category, 
      selectedArticle: null,
      searchQuery: '' 
    }));
    updateURL({ category, article: null, search: null });
  }, [updateURL]);

  const handleArticleSelect = useCallback((article: Article) => {
    setState(prev => ({ ...prev, selectedArticle: article }));
    updateURL({ 
      category: state.selectedCategory, 
      article: article.id, 
      search: state.searchQuery || null 
    });
  }, [updateURL, state.selectedCategory, state.searchQuery]);

  const handleBackToList = useCallback(() => {
    setState(prev => ({ ...prev, selectedArticle: null }));
    updateURL({ 
      category: state.selectedCategory, 
      article: null, 
      search: state.searchQuery || null 
    });
  }, [updateURL, state.selectedCategory, state.searchQuery]);

  if (state.selectedArticle) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <DocumentationArticleViewer
          article={state.selectedArticle}
          onBack={handleBackToList}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Dokumentation</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Finden Sie Antworten auf Ihre Fragen und lernen Sie, wie Sie Mietfluss optimal nutzen können.
        </p>
      </div>

      {/* Search */}
      <div className="mb-8 max-w-2xl mx-auto">
        <DocumentationSearch
          onSearch={handleSearch}
          placeholder="Dokumentation durchsuchen..."
        />
      </div>

      {/* Error Display */}
      {state.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar - Categories */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentationCategories
                categories={state.categories}
                selectedCategory={state.selectedCategory}
                onCategorySelect={handleCategorySelect}
                isLoading={state.isLoadingCategories}
              />
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Articles */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {state.searchQuery ? (
                  `Suchergebnisse für "${state.searchQuery}"`
                ) : state.selectedCategory ? (
                  `Artikel in "${state.selectedCategory}"`
                ) : (
                  'Alle Artikel'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentationArticleList
                articles={state.articles}
                searchQuery={state.searchQuery}
                onArticleSelect={handleArticleSelect}
                isLoading={state.isLoadingArticles}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense
function DocumentationLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <Skeleton className="h-8 w-64 mx-auto mb-4" />
        <Skeleton className="h-4 w-96 mx-auto" />
      </div>
      
      <div className="mb-8 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DocumentationPage() {
  return (
    <Suspense fallback={<DocumentationLoading />}>
      <DocumentationContent />
    </Suspense>
  );
}