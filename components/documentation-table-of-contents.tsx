'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, ChevronDown, FileText, FolderOpen, Folder } from 'lucide-react';
import { Category } from './documentation-categories';
import { Article } from './documentation-article-list';

interface TableOfContentsProps {
  categories: Category[];
  articles: Article[];
  selectedCategory: string | null;
  selectedArticle: Article | null;
  onCategorySelect: (category: string | null) => void;
  onArticleSelect: (article: Article) => void;
  isLoading?: boolean;
  className?: string;
}

interface CategoryWithArticles extends Category {
  articles: Article[];
  isExpanded: boolean;
}

export function DocumentationTableOfContents({
  categories,
  articles,
  selectedCategory,
  selectedArticle,
  onCategorySelect,
  onArticleSelect,
  isLoading = false,
  className = ""
}: TableOfContentsProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group articles by category and create expanded state
  const categoriesWithArticles = useMemo(() => {
    const categoryMap = new Map<string, CategoryWithArticles>();
    
    // Initialize categories
    categories.forEach(category => {
      categoryMap.set(category.name, {
        ...category,
        articles: [],
        isExpanded: expandedCategories.has(category.name) || selectedCategory === category.name
      });
    });

    // Group articles by category
    articles.forEach(article => {
      const categoryName = article.kategorie || 'Uncategorized';
      const category = categoryMap.get(categoryName);
      if (category) {
        category.articles.push(article);
      } else {
        // Create category if it doesn't exist
        categoryMap.set(categoryName, {
          name: categoryName,
          articleCount: 1,
          articles: [article],
          isExpanded: expandedCategories.has(categoryName) || selectedCategory === categoryName
        });
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, articles, expandedCategories, selectedCategory]);

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
    
    // Also select the category
    onCategorySelect(categoryName);
  };

  const handleArticleClick = (article: Article) => {
    onArticleSelect(article);
  };

  if (isLoading) {
    return (
      <Card className={`shadow-lg border-0 bg-card/50 backdrop-blur-sm ${className}`}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <div className="ml-4 space-y-1">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`shadow-lg border-0 bg-card/50 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Inhaltsverzeichnis
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {/* All Articles Button */}
          <Button
            variant={selectedCategory === null ? "default" : "ghost"}
            onClick={() => onCategorySelect(null)}
            className="w-full justify-start h-auto p-3 text-left"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Alle Artikel</span>
            </div>
            <Badge variant="secondary" className="ml-2 flex-shrink-0 text-xs">
              {articles.length}
            </Badge>
          </Button>

          {/* Categories with Articles */}
          {categoriesWithArticles.map((category) => (
            <div key={category.name} className="space-y-1">
              {/* Category Header */}
              <Button
                variant="ghost"
                onClick={() => toggleCategory(category.name)}
                className="w-full justify-start h-auto p-3 text-left hover:bg-muted/50"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {category.isExpanded ? (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  )}
                  <Folder className="h-4 w-4 flex-shrink-0" />
                  <span 
                    className="text-sm font-medium truncate"
                    title={category.name}
                  >
                    {category.name}
                  </span>
                </div>
                <Badge variant="secondary" className="ml-2 flex-shrink-0 text-xs">
                  {category.articles.length}
                </Badge>
              </Button>

              {/* Articles in Category */}
              {category.isExpanded && (
                <div className="ml-6 space-y-1">
                  {category.articles.map((article) => (
                    <Button
                      key={article.id}
                      variant={selectedArticle?.id === article.id ? "default" : "ghost"}
                      onClick={() => handleArticleClick(article)}
                      className="w-full justify-start h-auto p-2 text-left text-xs hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-3 w-3 flex-shrink-0 opacity-60" />
                        <span 
                          className="truncate"
                          title={article.titel}
                        >
                          {article.titel}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}