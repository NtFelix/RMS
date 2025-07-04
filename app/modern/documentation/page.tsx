import Navigation from "../components/navigation";
import DocumentationContent from "../components/documentation-content";
import DocumentationSidebar from "../components/documentation-sidebar";
import { getDatabasePages, NotionPageData, getPageContent } from "../../../lib/notion-service"; // Adjusted path

export default async function DocumentationPage() {
  const pagesWithoutContent = await getDatabasePages();

  // Fetch content for each page
  // Note: This makes sequential requests. For many pages, consider parallelizing.
  const pages: NotionPageData[] = await Promise.all(
    pagesWithoutContent.map(async (page) => {
      const content = await getPageContent(page.id);
      return { ...page, content };
    })
  );

  return (
    <>
      <Navigation />
      {/* Theming will be handled by ThemeProvider and globals.css */}
      <div className="min-h-screen pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <DocumentationSidebar pages={pages} />
            <div className="lg:col-span-3">
              <DocumentationContent pages={pages} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
