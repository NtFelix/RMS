"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, Search, Folder, FileText } from "lucide-react"; // Using Folder for categories
import { Input } from "../../../components/ui/input";
import { NotionPageData } from "../../../lib/notion-service";

interface DocumentationSidebarProps {
  pages: NotionPageData[];
}

interface SidebarSection {
  title: string;
  icon: React.ElementType;
  isCategory: boolean;
  items: {
    id: string;
    title: string;
    href: string;
  }[];
}

export default function DocumentationSidebar({ pages }: DocumentationSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Group pages by category
  const groupedPages = useMemo(() => {
    const groups: Record<string, NotionPageData[]> = {};
    const ungrouped: NotionPageData[] = [];

    pages.forEach(page => {
      const category = page.category || "General"; // Default category if none
      if (searchQuery && !page.title.toLowerCase().includes(searchQuery.toLowerCase()) && !(page.category || "General").toLowerCase().includes(searchQuery.toLowerCase())) {
        return; // Skip if page title and category don't match search query
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

  // Automatically expand categories that have search results within them or if the category title matches
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
       // Also expand "General" if it has search results and search is active
      if (groupedPages.ungrouped.some(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))) {
        if (!newExpanded.includes("General")) {
          newExpanded.push("General");
        }
      }
      setExpandedSections(newExpanded);
    } else {
      // Optionally, collapse all or restore previous state when search is cleared
      // For now, let's default to expanding categories that have pages
      const defaultExpanded = Object.keys(groupedPages.groups).filter(cat => groupedPages.groups[cat].length > 0);
      if (groupedPages.ungrouped.length > 0) defaultExpanded.push("General");
      setExpandedSections(defaultExpanded);
    }
  }, [searchQuery, groupedPages]);


  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionTitle) ? prev.filter((title) => title !== sectionTitle) : [...prev, sectionTitle]
    );
  };

  const handleNavClick = (pageId: string) => {
    const element = document.getElementById(`doc-page-${pageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const dynamicSidebarSections: SidebarSection[] = useMemo(() => {
    const sections: SidebarSection[] = [];

    // Add categorized pages
    Object.entries(groupedPages.groups)
      .sort(([catA], [catB]) => catA.localeCompare(catB)) // Sort categories alphabetically
      .forEach(([categoryTitle, categoryPages]) => {
        sections.push({
          title: categoryTitle,
          icon: Folder,
          isCategory: true,
          items: categoryPages
            .map(page => ({
              id: page.id,
              title: page.title || "Untitled Page",
              href: `#doc-page-${page.id}`,
            }))
            .sort((a,b) => a.title.localeCompare(b.title)), // Sort pages within category
        });
      });

    // Add ungrouped pages under a "General" category, or list them if no other categories exist
    if (groupedPages.ungrouped.length > 0) {
      const generalItems = groupedPages.ungrouped
        .map(page => ({
            id: page.id,
            title: page.title || "Untitled Page",
            href: `#doc-page-${page.id}`,
        }))
        .sort((a,b) => a.title.localeCompare(b.title));

      // If there are other categories, or if "General" is the only one with items.
      if (sections.length > 0 || generalItems.length > 0) {
         sections.push({
          title: "General", // Section for pages without a category
          icon: Folder, // Or use FileText if it's meant to be a collection of loose files
          isCategory: true, // Treat "General" as a collapsible category
          items: generalItems,
        });
      }
    }
    return sections;
  }, [groupedPages]);

  const hasResults = dynamicSidebarSections.some(section => section.items.length > 0);

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
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className="block w-full text-left p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-md transition-colors"
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
          {(!pages || pages.length === 0) && !searchQuery && (
             <p className="p-2 text-sm text-muted-foreground">No documents found for Version 2.0.</p>
          )}
        </nav>
      </div>
    </div>
  );
}
