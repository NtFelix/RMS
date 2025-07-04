import Navigation from "../components/navigation";
import DocumentationContent from "../components/documentation-content";
import DocumentationSidebar from "../components/documentation-sidebar";
import { getDatabasePages, NotionPageData, getPageContent } from "../../../lib/notion-service"; // Adjusted path

export default async function DocumentationPage() {
  const pagesWithoutContent = await getDatabasePages();

  // Fetch content for each page
  let pages: NotionPageData[] = await Promise.all(
    pagesWithoutContent.map(async (page) => {
      const content = await getPageContent(page.id);
      return { ...page, content };
    })
  );

  // Sort pages: by category (alphabetically), then by title (alphabetically)
  // Pages without a category (or 'General') will be handled by giving them a consistent category name for sorting.
  pages.sort((a, b) => {
    const categoryA = a.category || "General"; // Treat null/undefined category as "General" for sorting
    const categoryB = b.category || "General";

    if (categoryA < categoryB) return -1;
    if (categoryA > categoryB) return 1;

    // If categories are the same, sort by title
    if (a.title < b.title) return -1;
    if (a.title > b.title) return 1;

    return 0;
  });

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
