"use client"; // This page now needs to be a client component for useState and useEffect

import { useState, useEffect } from "react";
import Navigation from "../components/navigation";
import DocumentationContent from "../components/documentation-content";
import DocumentationSidebar from "../components/documentation-sidebar";
// Removed direct imports from notion-service: getDatabasePages, getPageContent
import { NotionPageData } from "../../../lib/notion-service"; // Keep NotionPageData for type info if needed by child components directly
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

// Define a type for the page that includes content
interface PageWithContent extends NotionPageData {
  content: BlockObjectResponse[];
}

export default function DocumentationPage() {
  const [allPagesMeta, setAllPagesMeta] = useState<NotionPageData[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageWithContent | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Combined loading state
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInitialPages() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/doclisting'); // Updated path
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // Try to parse error, default to empty object
          throw new Error(errorData.details || `Failed to fetch page list: ${response.statusText}`);
        }
        let pagesWithoutContent: NotionPageData[] = await response.json();

        // Sort pages: by category (alphabetically), then by title (alphabetically)
        pagesWithoutContent.sort((a, b) => {
          const categoryA = a.category || "General";
          const categoryB = b.category || "General";
          if (categoryA < categoryB) return -1;
          if (categoryA > categoryB) return 1;
          if (a.title < b.title) return -1;
          if (a.title > b.title) return 1;
          return 0;
        });

        setAllPagesMeta(pagesWithoutContent);

        if (pagesWithoutContent.length > 0) {
          // Fetch content for the first page
          await fetchAndSetSelectedPage(pagesWithoutContent[0].id, pagesWithoutContent);
        } else {
          setIsLoading(false); // No pages to load content for
        }
      } catch (e) {
        console.error("Failed to fetch documentation pages list:", e);
        setError(e instanceof Error ? e.message : "Failed to load documentation index. Please try again later.");
        setIsLoading(false);
      }
    }
    fetchInitialPages();
  }, []); // Empty dependency array means this runs once on mount

  const fetchAndSetSelectedPage = async (pageId: string, currentMeta?: NotionPageData[]) => {
    setIsLoading(true);
    // setError(null); // Keep previous error until new data/error comes

    const metaList = currentMeta || allPagesMeta;
    const pageMeta = metaList.find(p => p.id === pageId);

    if (!pageMeta) {
      setError("Selected page metadata not found.");
      setIsLoading(false);
      setSelectedPage(null);
      return;
    }

    try {
      const response = await fetch(`/api/documentation/page/${pageId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || `Failed to fetch page content for ${pageMeta.title}: ${response.statusText}`);
      }
      const content: BlockObjectResponse[] = await response.json();
      setSelectedPage({ ...pageMeta, content });
      setError(null); // Clear error on successful content load
    } catch (e) {
      console.error(`Failed to fetch content for page ${pageId}:`, e);
      setError(e instanceof Error ? e.message : `Failed to load content for ${pageMeta.title}. Please try again.`);
      setSelectedPage(null); // Clear selected page on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPage = (pageId: string) => {
    // Find the page meta to ensure it exists before fetching
    const pageExists = allPagesMeta.some(p => p.id === pageId);
    if (pageExists) {
      fetchAndSetSelectedPage(pageId);
    } else {
      console.warn(`Attempted to select non-existent page ID: ${pageId}`);
      setError("The selected page could not be found.");
      setSelectedPage(null);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <DocumentationSidebar
              pages={allPagesMeta}
              onSelectPage={handleSelectPage}
              selectedPageId={selectedPage?.id}
            />
            <div className="lg:col-span-3">
              {isLoading && <p>Loading documentation...</p>}
              {error && <p className="text-red-500">{error}</p>}
              {!isLoading && !error && selectedPage && (
                <DocumentationContent page={selectedPage} />
              )}
              {!isLoading && !error && !selectedPage && allPagesMeta.length > 0 && (
                <p>Select a page from the sidebar to view its content.</p>
              )}
               {!isLoading && !error && allPagesMeta.length === 0 && (
                <p>No documentation pages available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
