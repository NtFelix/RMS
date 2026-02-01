'use client';

import { useRouter } from 'next/navigation';
import { DocumentationArticleViewer } from '@/components/documentation/documentation-article-viewer';
import type { Article } from '@/types/documentation';

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