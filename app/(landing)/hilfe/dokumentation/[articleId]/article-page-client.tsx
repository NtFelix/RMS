'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { Article } from '@/types/documentation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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

interface ArticlePageClientProps {
  article: Article;
}

export default function ArticlePageClient({ article }: ArticlePageClientProps) {
  const router = useRouter();

  const handleBack = () => {
    router.push('/hilfe/dokumentation');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <DocumentationArticleViewer
            article={article}
            onBack={handleBack}
            selectedCategory={null}
            searchQuery=""
          />
        </div>
      </div>
    </div>
  );
}
