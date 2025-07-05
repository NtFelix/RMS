"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, Search, Folder } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { NotionPageData } from "../../../lib/notion-service";
import { Skeleton } from "../../../components/ui/skeleton"; // For loading state
import { cn } from "../../../lib/utils"; // For conditional classes

interface DocumentationSidebarProps {
  pages: NotionPageData[];
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  isLoading: boolean;
}

interface SidebarSectionItem {
  id: string;
  title: string;
  // href is no longer needed as navigation is handled by onSelectPage
}

interface SidebarSection {
  title: string;
  icon: React.ElementType;
  isCategory: boolean;
  items: SidebarSectionItem[];
}

export default function DocumentationSidebar({ pages, activePageId, onSelectPage, isLoading }: DocumentationSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const groupedPages = useMemo(() => {
    const groups: Record<string, NotionPageData[]> = {};
    const ungrouped: NotionPageData[] = [];

    pages.forEach(page => {
      const pageTitleLower = page.title.toLowerCase();
      const pageCategoryLower = (page.category || "General").toLowerCase();
      const queryLower = searchQuery.toLowerCase();

      if (searchQuery && !pageTitleLower.includes(queryLower) && !pageCategoryLower.includes(queryLower)) {
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
  }, [pages, searchQuery]);

  useEffect(() => {
    if (searchQuery) {
      const newExpanded: string[] = [];
      Object.keys(groupedPages.groups).forEach(categoryTitle => {
        if (categoryTitle.toLowerCase().includes(searchQuery.toLowerCase())) {
          newExpanded.push(categoryTitle);
        } else {
          const hasMatchingItem = groupedPages.groups[categoryTitle].some(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase())
          );
          if (hasMatchingItem) {
            newExpanded.push(categoryTitle);
          }
        }
      });
      if (groupedPages.ungrouped.some(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))) {
        if (!newExpanded.includes("General")) {
          newExpanded.push("General");
        }
      }
      setExpandedSections(newExpanded);
    } else {
      const defaultExpanded = Object.keys(groupedPages.groups).filter(cat => groupedPages.groups[cat].length > 0);
      if (groupedPages.ungrouped.length > 0) defaultExpanded.push("General");
      // If an active page is set, ensure its category is expanded
      if (activePageId) {
        const activePage = pages.find(p => p.id === activePageId);
        const activeCategory = activePage?.category || "General";
        if (!defaultExpanded.includes(activeCategory)) {
            defaultExpanded.push(activeCategory);
        }
      }
      setExpandedSections(defaultExpanded);
    }
  }, [searchQuery, groupedPages, pages, activePageId]);


  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionTitle) ? prev.filter((title) => title !== sectionTitle) : [...prev, sectionTitle]
    );
  };

  // No longer scrolling, so handleNavClick becomes a simple call to onSelectPage
  const handlePageItemClick = (pageId: string) => {
    onSelectPage(pageId);
  };

  const dynamicSidebarSections: SidebarSection[] = useMemo(() => {
    const sections: SidebarSection[] = [];

    Object.entries(groupedPages.groups)
      .sort(([catA], [catB]) => catA.localeCompare(catB))
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
            .sort((a,b) => a.title.localeCompare(b.title)),
        });
      });

    if (groupedPages.ungrouped.length > 0) {
      const generalItems = groupedPages.ungrouped
        .map(page => ({
            id: page.id,
            title: page.title || "Untitled Page",
        }))
        .sort((a,b) => a.title.localeCompare(b.title));

      if (sections.length > 0 || generalItems.length > 0) {
         sections.push({
          title: "General",
          icon: Folder,
          isCategory: true,
          items: generalItems,
        });
      }
    }
    return sections;
  }, [groupedPages]);

  const hasResults = dynamicSidebarSections.some(section => section.items.length > 0);

  if (isLoading) {
    return (
      <div className="sticky top-20 h-fit">
        <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-sm">
          <Skeleton className="h-10 w-full mb-6" /> {/* Search Input Skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <Skeleton className="h-8 w-3/4 mb-2" /> {/* Category Title Skeleton */}
                <div className="ml-4 mt-1 pl-2 border-l border-border/50 space-y-2">
                  <Skeleton className="h-6 w-5/6" />
                  <Skeleton className="h-6 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-20 h-fit">
      <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-sm">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <nav className="space-y-1">
          {dynamicSidebarSections.map((section) => (
            section.items.length > 0 && (
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
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handlePageItemClick(item.id)}
                      className={cn(
                        "block w-full text-left p-2 text-sm rounded-md transition-colors",
                        item.id === activePageId
                          ? "bg-primary/10 text-primary font-semibold" // Active style
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70" // Default style
                      )}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
            )
          ))}
          {pages && pages.length > 0 && !hasResults && searchQuery && (
             <p className="p-2 text-sm text-muted-foreground">No documents match your search for &quot;{searchQuery}&quot;.</p>
          )}
          {(!pages || pages.length === 0) && !searchQuery && !isLoading && (
             <p className="p-2 text-sm text-muted-foreground">No documents found.</p> // Updated message
          )}
        </nav>
      </div>
    </div>
  );
}
