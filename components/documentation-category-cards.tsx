'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, FileText, ArrowRight } from 'lucide-react';
import { Category } from './documentation-categories';

interface CategoryCardsProps {
  categories: Category[];
  onCategorySelect: (category: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function DocumentationCategoryCards({
  categories,
  onCategorySelect,
  isLoading = false,
  className = ""
}: CategoryCardsProps) {
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-0 bg-card/30">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <FolderOpen className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Keine Kategorien verfügbar</h3>
        <p className="text-muted-foreground">
          Es wurden noch keine Dokumentationskategorien erstellt.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>


      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((category) => (
          <Card
            key={category.name}
            className="group cursor-pointer border-2 border-input hover:border-ring bg-background hover:shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => onCategorySelect(category.name)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110">
                    <FolderOpen className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {category.name || 'Ohne Kategorie'}
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="group-hover:bg-primary/20 group-hover:text-primary transition-colors px-3 py-1">
                  {category.articleCount}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                  <FileText className="h-4 w-4" />
                  <span>
                    {category.articleCount} {category.articleCount === 1 ? 'Artikel' : 'Artikel'}
                  </span>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                Entdecken Sie alle Artikel in der Kategorie "{category.name || 'Ohne Kategorie'}" 
                und finden Sie die Informationen, die Sie benötigen.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-6 px-8 py-4 bg-background border-2 border-input rounded-full shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-foreground">
              {categories.length} {categories.length === 1 ? 'Kategorie' : 'Kategorien'}
            </span>
          </div>
          <div className="w-px h-6 bg-border"></div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-foreground">
              {categories.reduce((sum, cat) => sum + cat.articleCount, 0)} Artikel insgesamt
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}