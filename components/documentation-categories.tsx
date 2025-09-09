'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, Folder } from 'lucide-react';

export interface Category {
  name: string;
  articleCount: number;
}

interface CategoryListProps {
  categories: Category[];
  onCategorySelect: (category: string | null) => void;
  selectedCategory?: string | null;
  isLoading?: boolean;
  className?: string;
}

export function DocumentationCategories({
  categories,
  onCategorySelect,
  selectedCategory,
  isLoading = false,
  className = ""
}: CategoryListProps) {
  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="mb-4">
          <Skeleton className="h-6 w-32" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Keine Kategorien verfügbar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Kategorien</h3>
      </div>
      
      {/* All Articles Button */}
      <Button
        variant={selectedCategory === null ? "default" : "ghost"}
        onClick={() => onCategorySelect(null)}
        className="w-full justify-between h-auto p-3"
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          <span>Alle Artikel</span>
        </div>
        <Badge variant="secondary">
          {categories.reduce((sum, cat) => sum + cat.articleCount, 0)}
        </Badge>
      </Button>

      {/* Category Buttons */}
      {categories.map((category) => (
        <Button
          key={category.name}
          variant={selectedCategory === category.name ? "default" : "ghost"}
          onClick={() => onCategorySelect(category.name)}
          className="w-full justify-between h-auto p-3"
          disabled={category.articleCount === 0}
        >
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            <span className="truncate">{category.name || 'Ohne Kategorie'}</span>
          </div>
          <Badge variant="secondary">
            {category.articleCount}
          </Badge>
        </Button>
      ))}
    </div>
  );
}