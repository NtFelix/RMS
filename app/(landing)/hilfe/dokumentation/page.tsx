'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DocumentationSearch } from '@/components/documentation-search';
import { DocumentationCategories, Category } from '@/components/documentation-categories';
import { DocumentationArticleList, Article } from '@/components/documentation-article-list';
import { DocumentationArticleViewer } from '@/components/documentation-article-viewer';
import { DocumentationCategoryCards } from '@/components/documentation-category-cards';
import { DocumentationTableOfContents } from '@/components/documentation-table-of-contents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAIAssistantStore } from '@/hooks/use-ai-assistant-store';
import { useModalStore } from '@/hooks/use-modal-store';

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
  
  // AI Assistant store
  const { 
    switchToSearch,
    currentMode 
  } = useAIAssistantStore();

  // Modal store
  const { openAIAssistantModal, closeAIAssistantModal } = useModalStore();

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

    const newURL = `/hilfe/dokumentation${newParams.toString() ? `?${newParams.toString()}` : ''}`;
    router.replace(newURL, { scroll: false });
  }, [router]);

  const loadCategories = async () => {
    try {
      setState(prev => ({ ...prev, isLoadingCategories: true, error: null }));
      
      const response = await fetch('/api/dokumentation/categories');
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
        ? `/api/dokumentation?kategorie=${encodeURIComponent(category)}`
        : '/api/dokumentation';
      
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
      
      const response = await fetch(`/api/dokumentation/search?q=${encodeURIComponent(query)}`);
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
      const response = await fetch(`/api/dokumentation/${articleId}`);
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

  // AI Assistant handlers
  const handleFallbackToSearch = useCallback(() => {
    switchToSearch();
    closeAIAssistantModal();
    toast({
      title: 'Zur normalen Suche gewechselt',
      description: 'Sie können jetzt die normale Dokumentationssuche verwenden.',
    });
  }, [switchToSearch, closeAIAssistantModal, toast]);

  // Prepare documentation context for AI assistant
  const documentationContext = useCallback(() => {
    return {
      articles: state.articles,
      categories: state.categories,
      selectedCategory: state.selectedCategory,
      selectedArticle: state.selectedArticle,
      totalArticles: state.articles.length,
      totalCategories: state.categories.length
    };
  }, [state.articles, state.categories, state.selectedCategory, state.selectedArticle]);

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
                documentationContext={documentationContext()}
                onFallbackToSearch={handleFallbackToSearch}
              />
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
          {/* Table of Contents - Left Sidebar */}
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

          {/* Main Content - Articles */}
          <div className="lg:col-span-9">
            {state.selectedArticle ? (
              /* Article View */
              <DocumentationArticleViewer
                article={state.selectedArticle}
                onBack={handleBackToList}
                selectedCategory={state.selectedCategory}
                searchQuery={state.searchQuery}
              />
            ) : !state.selectedCategory && !state.searchQuery ? (
              /* Category Cards View */
              <DocumentationCategoryCards
                categories={state.categories}
                onCategorySelect={handleCategorySelect}
                isLoading={state.isLoadingCategories}
              />
            ) : (
              /* Articles List View */
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
          <div className="lg:col-span-3">
            <DocumentationTableOfContents
              categories={[]}
              articles={[]}
              selectedCategory={null}
              selectedArticle={null}
              onCategorySelect={() => {}}
              onArticleSelect={() => {}}
              isLoading={true}
            />
          </div>
          
          <div className="lg:col-span-9">
            <DocumentationCategoryCards
              categories={[]}
              onCategorySelect={() => {}}
              isLoading={true}
            />
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