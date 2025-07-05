"use client";

import { useState, useEffect, useCallback } from "react";
import Navigation from "../components/navigation";
import DocumentationContent from "../components/documentation-content";
import DocumentationSidebar from "../components/documentation-sidebar";
// Remove direct import of getDatabasePages and getPageContent from notion-service
import { NotionPageData } from "../../../lib/notion-service";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { Skeleton } from "../../../components/ui/skeleton";

export default function DocumentationPage() {
  const [allPagesMeta, setAllPagesMeta] = useState<NotionPageData[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activePageContent, setActivePageContent] = useState<BlockObjectResponse[] | null>(null);
  const [fetchedPageContents, setFetchedPageContents] = useState<Record<string, BlockObjectResponse[]>>({});
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(true);
  const [errorMeta, setErrorMeta] = useState<string | null>(null);
  const [errorContent, setErrorContent] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInitialPages() {
      setIsLoadingMeta(true);
      setErrorMeta(null);
      try {
        const response = await fetch('/api/documentation/pages');
        if (!response.ok) {
          throw new Error(`Failed to fetch page metadata: ${response.statusText}`);
        }
        const pagesData: NotionPageData[] = await response.json();

        pagesData.sort((a, b) => {
          const categoryA = a.category || "General";
          const categoryB = b.category || "General";
          if (categoryA < categoryB) return -1;
          if (categoryA > categoryB) return 1;
          if (a.title < b.title) return -1;
          if (a.title > b.title) return 1;
          return 0;
        });
        setAllPagesMeta(pagesData);
        if (pagesData.length > 0) {
          setActivePageId(pagesData[0].id);
        }
      } catch (err) {
        console.error("Error fetching initial pages:", err);
        setErrorMeta((err as Error).message || "An unknown error occurred while fetching page list.");
      } finally {
        setIsLoadingMeta(false);
      }
    }
    fetchInitialPages();
  }, []);

  const handleSelectPage = useCallback((pageId: string) => {
    setActivePageId(pageId);
    setErrorContent(null); // Clear previous content errors when selecting a new page
  }, []);

  useEffect(() => {
    async function fetchContentForActivePage() {
      if (!activePageId) {
        setActivePageContent(null);
        return;
      }

      if (fetchedPageContents[activePageId]) {
        setActivePageContent(fetchedPageContents[activePageId]);
        setErrorContent(null); // Clear error if content is found in cache
        return;
      }

      setIsLoadingContent(true);
      setErrorContent(null);
      try {
        const response = await fetch(`/api/documentation/pages/${activePageId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch page content: ${response.statusText}`);
        }
        const content: BlockObjectResponse[] = await response.json();
        setFetchedPageContents(prev => ({ ...prev, [activePageId]: content }));
        setActivePageContent(content);
      } catch (err) {
        console.error(`Failed to fetch content for page ${activePageId}:`, err);
        setErrorContent((err as Error).message || `An unknown error occurred while fetching content for page ${activePageId}.`);
        setActivePageContent([]); // Set to empty or null to indicate error
      } finally {
        setIsLoadingContent(false);
      }
    }

    fetchContentForActivePage();
  }, [activePageId, fetchedPageContents]);

  const activePageData: NotionPageData | undefined = allPagesMeta.find(p => p.id === activePageId);
  const displayPage: NotionPageData | null = activePageData && activePageContent
    ? { ...activePageData, content: activePageContent }
    : null;

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <DocumentationSidebar
              pages={allPagesMeta}
              activePageId={activePageId}
              onSelectPage={handleSelectPage}
              isLoading={isLoadingMeta}
            />
            <div className="lg:col-span-3">
              {isLoadingContent || (isLoadingMeta && !displayPage) ? (
                // Basic Skeleton Loader for content area
                <div className="space-y-6">
                  <Skeleton className="h-10 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : displayPage ? (
                <DocumentationContent page={displayPage} />
              ) : !isLoadingMeta && allPagesMeta.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <h1 className="text-3xl font-bold text-foreground mb-4">No Documentation Available</h1>
                    <p className="text-lg text-muted-foreground">
                      There are currently no documentation pages to display.
                    </p>
                 </div>
              ) : (
                !isLoadingMeta && !activePageId && allPagesMeta.length > 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <h1 className="text-3xl font-bold text-foreground mb-4">Select a Page</h1>
                    <p className="text-lg text-muted-foreground">
                      Please select a document from the sidebar to view its content.
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
