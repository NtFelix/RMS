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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <DocumentationArticleViewer
            article={state.selectedArticle}
            onBack={handleBackToList}
            selectedCategory={state.selectedCategory}
            searchQuery={state.searchQuery}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section with Large Search */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <BookOpen className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Dokumentation
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
            Finden Sie Antworten auf Ihre Fragen und lernen Sie, wie Sie Mietfluss optimal nutzen können.
          </p>
          
          {/* Large Prominent Search Bar */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="relative">
              <DocumentationSearch
                onSearch={handleSearch}
                placeholder="Durchsuchen Sie die gesamte Dokumentation..."
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{state.articles.length} Artikel verfügbar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>{state.categories.length} Kategorien</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {state.error && (
          <Alert variant="destructive" className="mb-8 max-w-4xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-7xl mx-auto">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-lg border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Navigation</CardTitle>
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
          <div className="lg:col-span-4">
            <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold">
                    {state.searchQuery ? (
                      <>
                        Suchergebnisse für{' '}
                        <span className="text-primary">"{state.searchQuery}"</span>
                      </>
                    ) : state.selectedCategory ? (
                      <>
                        Artikel in{' '}
                        <span className="text-primary">"{state.selectedCategory}"</span>
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
                  onArticleSelect={handleArticleSelect}
                  isLoading={state.isLoadingArticles}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense
function DocumentationLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section Loading */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-12 w-64" />
          </div>
          <Skeleton className="h-6 w-96 mx-auto mb-12" />
          
          {/* Large Search Bar Loading */}
          <div className="max-w-4xl mx-auto mb-8">
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>

          {/* Quick Stats Loading */}
          <div className="flex items-center justify-center gap-8">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        {/* Main Content Loading */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-7xl mx-auto">
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-0 bg-card/50">
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-4">
            <Card className="shadow-lg border-0 bg-card/50">
              <CardHeader>
                <Skeleton className="h-7 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="border-0 bg-muted/30">
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