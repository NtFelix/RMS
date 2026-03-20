import DocumentationPageClient from './documentation-page-client'
import { createDocumentationService } from '@/lib/documentation-service'

type SearchParamValue = string | string[] | undefined

interface DocumentationPageProps {
  searchParams?: Promise<Record<string, SearchParamValue>>
}

function getSingleParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value
}

export default async function DocumentationPage({
  searchParams,
}: DocumentationPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const selectedCategory = getSingleParam(resolvedSearchParams.category) ?? null
  const selectedArticleId = getSingleParam(resolvedSearchParams.article) ?? null
  const searchQuery = getSingleParam(resolvedSearchParams.search) ?? ''

  const documentationService = createDocumentationService(true)

  const [initialCategories, initialArticles, initialSelectedArticle] = await Promise.all([
    documentationService.getCategories(),
    searchQuery
      ? documentationService.searchArticles(searchQuery)
      : documentationService.getAllArticles(
          selectedCategory ? { kategorie: selectedCategory } : {},
        ),
    selectedArticleId ? documentationService.getArticleById(selectedArticleId) : Promise.resolve(null),
  ])

  return (
    <DocumentationPageClient
      initialCategories={initialCategories}
      initialArticles={initialArticles}
      initialSelectedArticle={initialSelectedArticle}
      initialSelectedCategory={selectedCategory}
      initialSearchQuery={searchQuery}
    />
  )
}
