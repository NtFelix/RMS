"use client"; // This page now needs client-side hooks for state and effects

import { useState, useEffect } from "react";
import Navigation from "../components/navigation";
import DocumentationContent from "../components/documentation-content";
import DocumentationSidebar from "../components/documentation-sidebar";
// NotionPageData and NotionFileData are still needed for typing state.
// getDatabasePages and getPageContent are no longer directly called from here.
import { NotionPageData, NotionFileData } from "../../../lib/notion-service";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export default function DocumentationPage() {
  const [allPagesMetadata, setAllPagesMetadata] = useState<NotionPageData[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [currentPageContent, setCurrentPageContent] = useState<BlockObjectResponse[] | null>(null);
  const [currentPageFiles, setCurrentPageFiles] = useState<NotionFileData[] | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(true);
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);


  // Fetch all page metadata (titles, categories, filesAndMedia) on initial load via API route
  useEffect(() => {
    async function fetchInitialData() {
      setIsLoadingMetadata(true);
      setError(null);
      try {
        const response = await fetch('/api/documentation/pages');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || `Failed to fetch page metadata: ${response.statusText}`);
        }
        let metadata: NotionPageData[] = await response.json();

        // Sort pages: by category (alphabetically), then by title (alphabetically)
        // Use String.prototype.localeCompare() for more concise and readable sorting logic.
        metadata.sort((a, b) => {
          const categoryA = a.category || "General";
          const categoryB = b.category || "General";
          return categoryA.localeCompare(categoryB) || a.title.localeCompare(b.title);
        });
        setAllPagesMetadata(metadata);
        if (metadata.length > 0 && !selectedPageId) {
          setSelectedPageId(metadata[0].id); // Select first page by default
        }
      } catch (err) {
        console.error("Error fetching initial page metadata:", err);
        setError(err instanceof Error ? err.message : String(err));
        setAllPagesMetadata([]); // Clear metadata on error
      } finally {
        setIsLoadingMetadata(false);
      }
    }
    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // selectedPageId removed from deps to avoid re-fetching metadata on selection change


  // Fetch content for the selected page via API route
  useEffect(() => {
    if (!selectedPageId) {
      setCurrentPageContent(null);
      setCurrentPageFiles(null);
      setIsLoadingContent(false); // Not loading if no page selected
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    async function fetchPageData() {
      setIsLoadingContent(true);
      setError(null);
      setCurrentPageContent(null); // Clear previous content
      setCurrentPageFiles(null);   // Clear previous files

      try {
        const response = await fetch(`/api/documentation/content/${selectedPageId}`, { signal });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || `Failed to fetch page content: ${response.statusText}`);
        }
        const content: BlockObjectResponse[] = await response.json();
        setCurrentPageContent(content);

        // Files are part of metadata, so retrieve from allPagesMetadata
        const selectedPageMetadata = allPagesMetadata.find(p => p.id === selectedPageId);
        if (selectedPageMetadata && selectedPageMetadata.filesAndMedia) {
          setCurrentPageFiles(selectedPageMetadata.filesAndMedia);
        } else {
          setCurrentPageFiles(null);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Fetch was aborted, this is expected on cleanup, so we can ignore.
          console.log('Fetch aborted');
        } else {
          console.error("Error fetching page content:", err);
          setError(err instanceof Error ? err.message : String(err));
          setCurrentPageContent([]); // Set to empty array on error to avoid stale content
          setCurrentPageFiles(null);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoadingContent(false);
        }
      }
    }

    fetchPageData();

    return () => {
      controller.abort();
    };
  }, [selectedPageId, allPagesMetadata]);

  const handleSelectPage = (pageId: string) => {
    setSelectedPageId(pageId);
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <DocumentationSidebar
              pages={allPagesMetadata} // Pass all metadata for sidebar construction
              onSelectPage={handleSelectPage}
              activePageId={selectedPageId}
            />
            <div className="lg:col-span-3">
              {/* Pass combined loading state: true if either metadata or content is loading */}
              <DocumentationContent
                isLoading={isLoadingMetadata || isLoadingContent}
                pageContent={currentPageContent}
                pageFiles={currentPageFiles}
                pages={allPagesMetadata} // For fallback messages if allPagesMetadata is empty
                error={error} // Pass error state to content for display
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
