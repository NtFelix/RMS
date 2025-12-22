'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function DocumentationSearchSkeleton() {
  return (
    <div className="relative">
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export function DocumentationCategoriesSkeleton() {
  return (
    <div className="space-y-2">
      <div className="mb-4">
        <Skeleton className="h-6 w-32" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function DocumentationArticleListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-5 w-5 flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DocumentationArticleViewerSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div className="mb-6">
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Article Content */}
      <Card>
        <CardHeader className="pb-4">
          <div className="space-y-4">
            {/* Title */}
            <Skeleton className="h-8 w-3/4" />
            
            {/* Category Badge */}
            <Skeleton className="h-6 w-24" />

            {/* Metadata */}
            <div className="pt-4 border-t">
              <div className="flex flex-col sm:flex-row gap-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Content paragraphs */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function DocumentationPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <Skeleton className="h-10 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>

        {/* Search */}
        <div className="mb-8">
          <DocumentationSearchSkeleton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <DocumentationCategoriesSkeleton />
          </div>

          {/* Articles List */}
          <div className="lg:col-span-3">
            <DocumentationArticleListSkeleton count={5} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Shimmer effect for enhanced loading experience
export function ShimmerSkeleton({ 
  className = "h-4 w-full" 
}: { 
  className?: string 
}) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] rounded ${className}`} 
         style={{
           animation: 'shimmer 2s infinite linear',
         }}>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}