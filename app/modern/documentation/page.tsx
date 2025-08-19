import Navigation from "../components/navigation";
import DocumentationContent from "../components/documentation-content";
import DocumentationSidebar from "../components/documentation-sidebar";
import { getDatabasePages, getPageContent, NotionFileData, NotionPageData, BlockWithChildren } from "../../../lib/notion-service";

export default async function DocumentationPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  let allPagesMetadata: NotionPageData[] = [];
  let selectedPageId: string | null = null;
  let currentPageContent: BlockWithChildren[] | null = null;
  let currentPageFiles: NotionFileData[] | null = null;
  let error: string | null = null;

  try {
    // Fetch all pages server-side
    allPagesMetadata = await getDatabasePages();
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
      // Fetch content server-side
      currentPageContent = await getPageContent(selectedPageId);
      // Files come from metadata
      const selectedMeta = allPagesMetadata.find((p) => p.id === selectedPageId);
      currentPageFiles = selectedMeta?.filesAndMedia ?? null;
    }
  } catch (e) {
    console.error("Server error loading documentation:", e);
    error = e instanceof Error ? e.message : String(e);
    // Leave content and files as null/empty for graceful render
  }

  return (
    <>
      <Navigation />
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
    </>
  );
}
