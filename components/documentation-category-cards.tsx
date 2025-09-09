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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Card
            key={category.name}
            className="group cursor-pointer border-0 bg-card/30 hover:bg-card/50 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => onCategorySelect(category.name)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {category.name || 'Ohne Kategorie'}
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="group-hover:bg-primary/20 transition-colors">
                  {category.articleCount}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>
                    {category.articleCount} {category.articleCount === 1 ? 'Artikel' : 'Artikel'}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm text-muted-foreground mt-2 overflow-hidden text-ellipsis" style={{ 
                display: '-webkit-box', 
                WebkitLineClamp: 2, 
                WebkitBoxOrient: 'vertical' 
              }}>
                Entdecken Sie alle Artikel in der Kategorie "{category.name || 'Ohne Kategorie'}" 
                und finden Sie die Informationen, die Sie benötigen.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-6 px-6 py-3 bg-muted/30 rounded-full">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-sm font-medium">
              {categories.length} {categories.length === 1 ? 'Kategorie' : 'Kategorien'}
            </span>
          </div>
          <div className="w-px h-4 bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">
              {categories.reduce((sum, cat) => sum + cat.articleCount, 0)} Artikel insgesamt
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}