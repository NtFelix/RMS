"use client"; // This page now needs client-side hooks for state and effects

import { useState, useEffect } from "react";
import Navigation from "../components/navigation";
import DocumentationContent from "../components/documentation-content";
import DocumentationSidebar from "../components/documentation-sidebar";
import { getDatabasePages, NotionPageData, getPageContent, NotionFileData } from "../../../lib/notion-service";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export default function DocumentationPage() {
  const [allPagesMetadata, setAllPagesMetadata] = useState<NotionPageData[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [currentPageContent, setCurrentPageContent] = useState<BlockObjectResponse[] | null>(null);
  const [currentPageFiles, setCurrentPageFiles] = useState<NotionFileData[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start with loading true for initial metadata fetch
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);

  // Fetch all page metadata (titles, categories, filesAndMedia) on initial load
  useEffect(() => {
    async function fetchInitialData() {
      setIsLoading(true);
      const metadata = await getDatabasePages();
      // Sort pages: by category (alphabetically), then by title (alphabetically)
      metadata.sort((a, b) => {
        const categoryA = a.category || "General";
        const categoryB = b.category || "General";
        if (categoryA < categoryB) return -1;
        if (categoryA > categoryB) return 1;
        if (a.title < b.title) return -1;
        if (a.title > b.title) return 1;
        return 0;
      });
      setAllPagesMetadata(metadata);
      setInitialLoadComplete(true);
      // Don't set isLoading to false here yet, content loading will handle it
    }
    fetchInitialData();
  }, []);

  // Effect to select the first page by default once metadata is loaded
  useEffect(() => {
    if (initialLoadComplete && allPagesMetadata.length > 0 && !selectedPageId) {
      setSelectedPageId(allPagesMetadata[0].id);
    } else if (initialLoadComplete && allPagesMetadata.length === 0) {
      // No pages found, stop loading
      setIsLoading(false);
    }
  }, [initialLoadComplete, allPagesMetadata, selectedPageId]);

  // Fetch content for the selected page
  useEffect(() => {
    if (!selectedPageId) {
      // If no page is selected (e.g. initial state before default selection, or if allPagesMetadata is empty)
      // and metadata load is complete, ensure loading is false.
      if (initialLoadComplete) setIsLoading(false);
      return;
    }

    async function fetchPageData() {
      setIsLoading(true);
      setCurrentPageContent(null); // Clear previous content
      setCurrentPageFiles(null);   // Clear previous files

      try {
        const content = await getPageContent(selectedPageId!);
        setCurrentPageContent(content);

        const selectedPageMetadata = allPagesMetadata.find(p => p.id === selectedPageId);
        if (selectedPageMetadata && selectedPageMetadata.filesAndMedia) {
          setCurrentPageFiles(selectedPageMetadata.filesAndMedia);
        } else {
          setCurrentPageFiles(null);
        }
      } catch (error) {
        console.error("Error fetching page content:", error);
        setCurrentPageContent([]); // Set to empty array on error to avoid stale content
        setCurrentPageFiles(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPageData();
  }, [selectedPageId, allPagesMetadata, initialLoadComplete]); // Add initialLoadComplete to dependencies

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
              <DocumentationContent
                isLoading={isLoading && !currentPageContent} // Show loading only if content isn't there yet
                pageContent={currentPageContent}
                pageFiles={currentPageFiles}
                pages={allPagesMetadata} // Keep this prop if DocumentationContent expects it for some fallback/message
                                         // or modify DocumentationContent to not require it if only showing one page's details
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
