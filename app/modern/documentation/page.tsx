import { Metadata } from 'next';
import Navigation from "../components/navigation";
import DocumentationContent from "../components/documentation-content";
import DocumentationSidebar from "../components/documentation-sidebar";
import DocumentationErrorBoundary from "../components/documentation-error-boundary";
import { getDatabasePages, getPageContent, NotionFileData, NotionPageData, BlockWithChildren } from "../../../lib/notion-service";

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }): Promise<Metadata> {
  try {
    const resolvedSearchParams = (await searchParams) || {};
    const paramRaw = resolvedSearchParams?.["pageId"];
    const paramId = Array.isArray(paramRaw) ? paramRaw[0] : paramRaw;
    
    if (paramId && typeof paramId === "string") {
      // Use cached data if available, otherwise fetch
      const pages = await getDatabasePages();
      const selectedPage = pages.find(p => p.id === paramId);
      
      if (selectedPage) {
        return {
          title: `${selectedPage.title} - Documentation`,
          description: `Documentation for ${selectedPage.title}${selectedPage.category ? ` in ${selectedPage.category}` : ''}`,
          openGraph: {
            title: `${selectedPage.title} - Documentation`,
            description: `Documentation for ${selectedPage.title}${selectedPage.category ? ` in ${selectedPage.category}` : ''}`,
            type: 'article',
          },
        };
      }
    }
    
    return {
      title: 'Documentation - RMS',
      description: 'Comprehensive documentation for the Rent Management System',
      openGraph: {
        title: 'Documentation - RMS',
        description: 'Comprehensive documentation for the Rent Management System',
        type: 'website',
      },
    };
  } catch (error) {
    console.error("Error generating documentation metadata:", error);
    return {
      title: 'Documentation - RMS',
      description: 'Comprehensive documentation for the Rent Management System',
    };
  }
}

type SearchParams = { [key: string]: string | string[] | undefined };

interface PageProps {
  searchParams?: Promise<SearchParams>;
}

export default async function DocumentationPage({
  searchParams: searchParamsPromise,
}: PageProps) {
  const searchParams = (await searchParamsPromise) || {};
  let allPagesMetadata: NotionPageData[] = [];
  let selectedPageId: string | null = null;
  let currentPageContent: BlockWithChildren[] | null = null;
  let currentPageFiles: NotionFileData[] | null = null;
  let error: string | null = null;

  try {
    // Fetch all pages server-side
    allPagesMetadata = await getDatabasePages();
    
    // Early return if no pages found
    if (allPagesMetadata.length === 0) {
      error = "No documentation pages found";
      return renderPage(allPagesMetadata, selectedPageId, currentPageContent, currentPageFiles, error);
    }

    // Sort by category then title
    allPagesMetadata.sort((a, b) => {
      const categoryA = a.category || "General";
      const categoryB = b.category || "General";
      return categoryA.localeCompare(categoryB) || a.title.localeCompare(b.title);
    });

    // Determine selected page (from search param or first)
    const paramRaw = searchParams?.["pageId"];
    const paramId = Array.isArray(paramRaw) ? paramRaw[0] : paramRaw;
    selectedPageId = typeof paramId === "string" && paramId.length > 0 ? paramId : allPagesMetadata[0]?.id ?? null;

    if (selectedPageId) {
      // Validate that the selected page exists
      const selectedMeta = allPagesMetadata.find((p) => p.id === selectedPageId);
      if (!selectedMeta) {
        // If invalid pageId, fallback to first page
        selectedPageId = allPagesMetadata[0]?.id ?? null;
      }

      if (selectedPageId) {
        // Fetch content and find metadata
        const meta = allPagesMetadata.find((p) => p.id === selectedPageId);
        const content = await getPageContent(selectedPageId);
        
        currentPageContent = content;
        currentPageFiles = meta?.filesAndMedia ?? null;
      }
    }
  } catch (e) {
    console.error("Server error loading documentation:", e);
    error = e instanceof Error ? e.message : String(e);
  }

  return renderPage(allPagesMetadata, selectedPageId, currentPageContent, currentPageFiles, error);
}

function renderPage(
  allPagesMetadata: NotionPageData[],
  selectedPageId: string | null,
  currentPageContent: BlockWithChildren[] | null,
  currentPageFiles: NotionFileData[] | null,
  error: string | null
) {

  return (
    <>
      <Navigation />
      <DocumentationErrorBoundary>
        <div className="min-h-screen pt-16">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <DocumentationSidebar
                pages={allPagesMetadata}
                activePageId={selectedPageId}
              />
              <div className="lg:col-span-3">
                <DocumentationContent
                  isLoading={false}
                  pageContent={currentPageContent}
                  pageFiles={currentPageFiles}
                  pages={allPagesMetadata}
                  error={error}
                />
              </div>
            </div>
          </div>
        </div>
      </DocumentationErrorBoundary>
    </>
  );
}
