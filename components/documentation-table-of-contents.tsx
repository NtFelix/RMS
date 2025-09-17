'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, ChevronDown, FileText, FolderOpen, Folder } from 'lucide-react';
import { Category } from './documentation-categories';
import { Article } from './documentation-article-list';
import { naturalSort } from '@/lib/utils';

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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    // Initialize with selected category expanded
    return selectedCategory ? new Set([selectedCategory]) : new Set();
  });

  // Auto-expand selected category
  useEffect(() => {
    if (selectedCategory && !expandedCategories.has(selectedCategory)) {
      setExpandedCategories(prev => new Set([...prev, selectedCategory]));
    }
  }, [selectedCategory, expandedCategories]);

  // Group articles by category and create expanded state
  const categoriesWithArticles = useMemo(() => {
    const categoryMap = new Map<string, CategoryWithArticles>();
    
    // If a specific category is selected, only show that category
    if (selectedCategory) {
      // Find the selected category
      const selectedCat = categories.find(cat => cat.name === selectedCategory);
      if (selectedCat) {
        const categoryArticles = articles.filter(article => article.kategorie === selectedCategory);
        categoryMap.set(selectedCategory, {
          ...selectedCat,
          articles: categoryArticles.sort((a, b) => naturalSort(a.titel, b.titel)),
          isExpanded: expandedCategories.has(selectedCategory)
        });
      }
    } else {
      // Show all categories when no specific category is selected
      // Initialize categories
      categories.forEach(category => {
        categoryMap.set(category.name, {
          ...category,
          articles: [],
          isExpanded: expandedCategories.has(category.name)
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
            isExpanded: expandedCategories.has(categoryName)
          });
        }
      });

      // Sort articles within each category
      categoryMap.forEach(category => {
        category.articles.sort((a, b) => naturalSort(a.titel, b.titel));
      });
    }

    return Array.from(categoryMap.values()).sort((a, b) => naturalSort(a.name, b.name));
  }, [categories, articles, expandedCategories, selectedCategory]);

  const toggleCategory = (categoryName: string, event: React.MouseEvent) => {
    // Prevent all event propagation and default behavior
    event.preventDefault();
    event.stopPropagation();
    
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
    
    // NEVER trigger category selection when just toggling
  };

  const handleCategorySelect = (categoryName: string, event: React.MouseEvent) => {
    // Prevent all event propagation and default behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Only select the category if it's different from current
    if (selectedCategory !== categoryName) {
      // Expand the category if not already expanded
      if (!expandedCategories.has(categoryName)) {
        setExpandedCategories(prev => new Set([...prev, categoryName]));
      }
      onCategorySelect(categoryName);
    }
  };

  const handleArticleClick = (article: Article, event: React.MouseEvent) => {
    // Prevent all event propagation and default behavior
    event.preventDefault();
    event.stopPropagation();
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
    <Card className={`border-2 border-input bg-background shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${className}`}>
      <CardHeader className="pb-4 bg-muted/30 border-b border-border">
        <CardTitle className="text-lg font-semibold flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <FolderOpen className="h-4 w-4 text-primary" />
          </div>
          Inhaltsverzeichnis
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 overflow-hidden">
        <div className="space-y-1 overflow-hidden">
          {/* All Articles Button */}
          <Button
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCategorySelect(null);
            }}
            className={`w-full justify-start h-10 p-3 text-left transition-all duration-300 ease-out overflow-hidden rounded-lg border-2 group relative ${
              selectedCategory === null 
                ? "bg-primary hover:bg-primary/90 border-primary text-primary-foreground shadow-lg shadow-primary/25" 
                : "bg-card hover:bg-primary/10 border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
            }`}
          >
            {/* Hover gradient overlay */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
              selectedCategory === null 
                ? "bg-gradient-to-r from-primary-foreground/5 to-transparent" 
                : "bg-gradient-to-r from-primary/5 to-transparent"
            }`} />
            
            <div className="flex items-center justify-between w-full min-w-0 overflow-hidden relative z-10">
              <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-out ${
                  selectedCategory === null 
                    ? "bg-primary-foreground/20 group-hover:bg-primary-foreground/30 group-hover:shadow-sm" 
                    : "bg-primary/10 group-hover:bg-primary/20 group-hover:shadow-sm group-hover:shadow-primary/20"
                }`}>
                  <FileText className={`h-4 w-4 transition-all duration-300 ease-out ${
                    selectedCategory === null 
                      ? "text-primary-foreground group-hover:drop-shadow-sm" 
                      : "text-primary group-hover:drop-shadow-sm"
                  }`} strokeWidth={2} />
                </div>
                <span className={`text-sm font-semibold truncate transition-all duration-300 ease-out ${
                  selectedCategory === null 
                    ? "text-primary-foreground group-hover:drop-shadow-sm" 
                    : "text-foreground group-hover:text-primary group-hover:font-bold"
                }`}>
                  Alle Artikel
                </span>
              </div>
              <Badge 
                variant="secondary" 
                className={`ml-2 flex-shrink-0 text-xs px-2 py-1 font-semibold transition-all duration-300 ease-out ${
                  selectedCategory === null 
                    ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 group-hover:bg-primary-foreground/30 group-hover:shadow-sm" 
                    : "bg-primary/10 text-primary border-primary/30 group-hover:bg-primary/20 group-hover:border-primary/50 group-hover:shadow-sm group-hover:shadow-primary/20"
                }`}
              >
                {articles.length}
              </Badge>
            </div>
          </Button>

          {/* Categories with Articles */}
          {categoriesWithArticles.map((category) => (
            <div key={category.name} className="space-y-1">
              {/* Category Header */}
              <div className="flex items-center w-full overflow-hidden rounded-lg border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all duration-300 ease-out group relative">
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-r from-primary/3 to-transparent rounded-lg" />
                
                {/* Expand/Collapse Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => toggleCategory(category.name, e)}
                  className="p-0 h-10 w-10 hover:bg-primary/10 hover:shadow-sm hover:shadow-primary/20 transition-all duration-300 ease-out flex-shrink-0 rounded-lg relative z-10 flex items-center justify-center"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/5 hover:bg-primary/10 flex items-center justify-center transition-all duration-300 ease-out group-hover:shadow-sm">
                    <motion.div
                      animate={{ rotate: category.isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-primary transition-all duration-300 ease-out hover:drop-shadow-sm" />
                    </motion.div>
                  </div>
                </Button>
                
                {/* Category Selection Button */}
                <Button
                  variant="ghost"
                  onClick={(e) => handleCategorySelect(category.name, e)}
                  className={`flex-1 justify-start h-10 p-3 text-left transition-all duration-300 ease-out min-w-0 overflow-hidden rounded-r-lg relative z-10 ${
                    selectedCategory === category.name 
                      ? "bg-primary/20 hover:bg-primary/30 text-primary shadow-md" 
                      : "hover:bg-primary/10 hover:text-primary hover:shadow-sm hover:shadow-primary/10"
                  }`}
                >
                  <div className="flex items-center justify-between w-full min-w-0 overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-out ${
                        selectedCategory === category.name 
                          ? "bg-primary/20 group-hover:bg-primary/30 group-hover:shadow-sm" 
                          : "bg-primary/10 group-hover:bg-primary/20 group-hover:shadow-sm group-hover:shadow-primary/20"
                      }`}>
                        <Folder className={`h-3.5 w-3.5 transition-all duration-300 ease-out ${
                          selectedCategory === category.name 
                            ? "text-primary group-hover:drop-shadow-sm" 
                            : "text-primary group-hover:drop-shadow-sm"
                        }`} />
                      </div>
                      <span 
                        className={`text-sm font-medium truncate transition-all duration-300 ease-out ${
                          selectedCategory === category.name 
                            ? "text-primary font-semibold group-hover:drop-shadow-sm" 
                            : "text-foreground group-hover:text-primary group-hover:font-semibold"
                        }`}
                        title={category.name}
                      >
                        {category.name}
                      </span>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`ml-2 flex-shrink-0 text-xs px-2 py-1 font-medium transition-all duration-300 ease-out ${
                        selectedCategory === category.name 
                          ? "bg-primary/20 text-primary border-primary/40 group-hover:shadow-sm" 
                          : "bg-primary/10 text-primary border-primary/20 group-hover:bg-primary/20 group-hover:border-primary/40 group-hover:shadow-sm group-hover:shadow-primary/20"
                      }`}
                    >
                      {category.articles.length}
                    </Badge>
                  </div>
                </Button>
              </div>

              {/* Articles in Category with Animation */}
              <AnimatePresence>
                {category.isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ 
                      duration: 0.3, 
                      ease: "easeInOut",
                      opacity: { duration: 0.2 }
                    }}
                    className="overflow-hidden"
                  >
                    <div className="ml-8 space-y-2 pb-2">
                      {category.articles.map((article, index) => (
                        <motion.div
                          key={article.id}
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ 
                            delay: index * 0.05,
                            duration: 0.2,
                            ease: "easeOut"
                          }}
                        >
                          <Button
                            variant="ghost"
                            onClick={(e) => handleArticleClick(article, e)}
                            className={`w-full justify-start h-8 p-2 text-left text-sm transition-all duration-300 ease-out overflow-hidden rounded-md border-2 group relative ${
                              selectedArticle?.id === article.id 
                                ? "bg-primary hover:bg-primary/90 border-primary text-primary-foreground shadow-md shadow-primary/25" 
                                : "bg-card hover:bg-primary/10 border-transparent hover:border-primary/30 hover:shadow-md hover:shadow-primary/10"
                            }`}
                          >
                            {/* Hover gradient overlay */}
                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-md ${
                              selectedArticle?.id === article.id 
                                ? "bg-gradient-to-r from-primary-foreground/5 to-transparent" 
                                : "bg-gradient-to-r from-primary/5 to-transparent"
                            }`} />
                            
                            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden relative z-10">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-out ${
                                selectedArticle?.id === article.id 
                                  ? "bg-primary-foreground/20 group-hover:bg-primary-foreground/30 group-hover:shadow-sm" 
                                  : "bg-primary/10 group-hover:bg-primary/20 group-hover:shadow-sm group-hover:shadow-primary/20"
                              }`}>
                                <FileText className={`h-2.5 w-2.5 transition-all duration-300 ease-out ${
                                  selectedArticle?.id === article.id 
                                    ? "text-primary-foreground group-hover:drop-shadow-sm" 
                                    : "text-primary group-hover:drop-shadow-sm"
                                }`} />
                              </div>
                              <span 
                                className={`truncate transition-all duration-300 ease-out ${
                                  selectedArticle?.id === article.id 
                                    ? "text-primary-foreground font-semibold group-hover:drop-shadow-sm" 
                                    : "text-foreground group-hover:text-primary group-hover:font-semibold"
                                }`}
                                title={article.titel}
                              >
                                {article.titel}
                              </span>
                            </div>
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}