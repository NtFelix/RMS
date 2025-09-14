"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, Search, Folder, Atom } from "lucide-react"; // Using Folder for categories, Atom for AI mode
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { NotionPageData } from "../../../lib/notion-service"; // NotionPageData now refers to metadata only
import { useAIAssistantStore } from "../../../hooks/use-ai-assistant-store";
import Link from "next/link";
import { naturalSort } from "@/lib/utils";

interface DocumentationSidebarProps {
  pages: NotionPageData[]; // This is now allPagesMetadata
  activePageId: string | null;
}

interface SidebarItem {
  id: string;
  title: string;
  // href is no longer needed as we use onSelectPage
}

interface SidebarSection {
  title: string;
  icon: React.ElementType;
  isCategory: boolean;
  items: SidebarItem[];
}

export default function DocumentationSidebar({ pages, activePageId }: DocumentationSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // AI Assistant store
  const { currentMode, switchToSearch, switchToAI } = useAIAssistantStore();

  // Handle mode switching effects
  useEffect(() => {
    if (currentMode === 'ai') {
      // Clear search query when switching to AI mode
      setSearchQuery('');
    }
  }, [currentMode]);

  // Group pages by category (using 'pages' prop which contains metadata)
  const groupedPages = useMemo(() => {
    // If in AI mode, don't filter pages - show all for context
    if (currentMode === 'ai') {
      const groups: Record<string, NotionPageData[]> = {};
      const ungrouped: NotionPageData[] = [];

      pages.forEach(page => {
        if (page.category) {
          if (!groups[page.category]) {
            groups[page.category] = [];
          }
          groups[page.category].push(page);
        } else {
          ungrouped.push(page);
        }
      });
      return { groups, ungrouped };
    }

    // Regular search mode - apply search filter
    const groups: Record<string, NotionPageData[]> = {};
    const ungrouped: NotionPageData[] = [];

    pages.forEach(page => {
      const category = page.category || "General";
      // Apply search filter
      if (searchQuery &&
          !page.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(page.category || "General").toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      if (page.category) {
        if (!groups[page.category]) {
          groups[page.category] = [];
        }
        groups[page.category].push(page);
      } else {
        ungrouped.push(page);
      }
    });
    return { groups, ungrouped };
  }, [pages, searchQuery, currentMode]);

  // Automatically expand categories based on search, mode, or default state
  useEffect(() => {
    let newExpanded: string[] = [];
    
    if (currentMode === 'ai') {
      // In AI mode, expand all categories for better context visibility
      newExpanded = Object.keys(groupedPages.groups).filter(cat => groupedPages.groups[cat].length > 0);
      if (groupedPages.ungrouped.length > 0) {
        newExpanded.push("General");
      }
    } else if (searchQuery) {
      // In search mode with query, expand matching categories
      Object.keys(groupedPages.groups).forEach(categoryTitle => {
        if (categoryTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
            groupedPages.groups[categoryTitle].some(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))) {
          newExpanded.push(categoryTitle);
        }
      });
      if (groupedPages.ungrouped.some(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))) {
        if (!newExpanded.includes("General")) { // Ensure "General" is added if not already
             newExpanded.push("General");
        }
      }
    } else {
      // Default expansion: expand all categories that have items
      newExpanded = Object.keys(groupedPages.groups).filter(cat => groupedPages.groups[cat].length > 0);
      if (groupedPages.ungrouped.length > 0) {
        newExpanded.push("General");
      }
    }
    setExpandedSections(newExpanded);
  }, [searchQuery, groupedPages, currentMode]);


  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionTitle) ? prev.filter((title) => title !== sectionTitle) : [...prev, sectionTitle]
    );
  };

  // Navigation is handled via <Link> to update the search param (?pageId=...)

  const dynamicSidebarSections: SidebarSection[] = useMemo(() => {
    const sections: SidebarSection[] = [];

    Object.entries(groupedPages.groups)
      .sort(([catA], [catB]) => naturalSort(catA, catB))
      .forEach(([categoryTitle, categoryPages]) => {
        sections.push({
          title: categoryTitle,
          icon: Folder,
          isCategory: true,
          items: categoryPages
            .map(page => ({
              id: page.id,
              title: page.title || "Untitled Page",
            }))
            .sort((a,b) => naturalSort(a.title, b.title)),
        });
      });

    if (groupedPages.ungrouped.length > 0) {
      const generalItems = groupedPages.ungrouped
        .map(page => ({
            id: page.id,
            title: page.title || "Untitled Page",
        }))
        .sort((a,b) => naturalSort(a.title, b.title));

      // Add "General" section if it has items, regardless of other categories
      // This ensures "General" appears if it's the only category or alongside others.
      if (generalItems.length > 0) {
        sections.push({
          title: "General",
          icon: Folder,
          isCategory: true,
          items: generalItems,
        });
      }
    }
    // Ensure "General" section (if added) is also sorted relative to other categories if needed,
    // or decide on its fixed position (e.g., always last or first).
    // For now, it's added after categorized sections. If specific order is needed, adjust here.
    // Example: if "General" should be first: sections.unshift(...) and handle duplicates if necessary.
    // Or, if sorting all sections by title (including "General"):
    // sections.sort((a, b) => a.title.localeCompare(b.title));
    // Current logic keeps General last if other categories exist.

    return sections;
  }, [groupedPages]);

  const hasResults = dynamicSidebarSections.some(section => section.items.length > 0);
  const noPagesAvailable = pages.length === 0;


  return (
    <div className="sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto pb-6"> {/* Adjusted height and overflow */}
      <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-sm">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={currentMode === 'ai' ? "Ask AI about documentation..." : "Search documentation..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-12"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (currentMode === 'search') {
                switchToAI();
              } else {
                switchToSearch();
              }
            }}
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-full transition-all duration-200 ${
              currentMode === 'ai' 
                ? 'bg-primary/20 text-primary hover:bg-primary/30' 
                : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
            }`}
            title={currentMode === 'ai' ? 'Switch to documentation search' : 'Switch to AI assistant'}
          >
            <Atom className="h-4 w-4" />
          </Button>
          
          {/* Visual indicator for current mode */}
          {currentMode === 'ai' && (
            <div className="absolute -bottom-1 left-3 right-12 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full" />
          )}
        </div>

        {/* Mode indicator */}
        {currentMode === 'ai' && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Atom className="h-4 w-4" />
              <span className="font-medium">AI Assistant Mode</span>
            </div>
            <p className="text-xs text-primary/80 mt-1">
              Ask questions about the documentation content below
            </p>
          </div>
        )}

        <nav className="space-y-1">
          {dynamicSidebarSections.map((section) => (
            section.items.length > 0 && ( // Only render section if it has items after filtering
            <div key={section.title}>
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full p-2 text-left text-foreground/80 hover:text-foreground hover:bg-muted rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <section.icon className="w-4 h-4" />
                  <span className="font-medium">{section.title}</span>
                </div>
                {expandedSections.includes(section.title) ? (
                  <ChevronDown className="w-4 h-4 group-hover:text-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 group-hover:text-foreground" />
                )}
              </button>

              <motion.div
                initial={false}
                animate={{
                  height: expandedSections.includes(section.title) ? "auto" : 0,
                  opacity: expandedSections.includes(section.title) ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-4 mt-1 pl-2 border-l border-border/50 space-y-1">
                  {section.items.map((item) => {
                    const isActive = item.id === activePageId;
                    return (
                      <Link
                        key={item.id}
                        href={{ pathname: "/modern/documentation", query: { pageId: item.id } }}
                        className={`block w-full text-left p-2 text-sm rounded-md transition-colors ${
                          isActive
                            ? "font-semibold text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        }`}
                      >
                        {item.title}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            </div>
            )
          ))}
          {!noPagesAvailable && !hasResults && searchQuery && currentMode === 'search' && (
             <p className="p-2 text-sm text-muted-foreground">No documents match your search for &quot;{searchQuery}&quot;.</p>
          )}
          {noPagesAvailable && !searchQuery && currentMode === 'search' && ( // Show this only if pages array is truly empty and no search
             <p className="p-2 text-sm text-muted-foreground">No documents found for Version 2.0.</p>
          )}
        </nav>
      </div>
    </div>
  );
}
