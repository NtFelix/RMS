"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, Search, BookOpen } from "lucide-react"; // Replaced Book with BookOpen for variety
import { Input } from "../../../components/ui/input";
import { NotionPageData } from "../../../lib/notion-service"; // Adjusted path

interface DocumentationSidebarProps {
  pages: NotionPageData[];
}

// Helper to generate a slug from a title
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
};

export default function DocumentationSidebar({ pages }: DocumentationSidebarProps) {
  // For dynamic content, we might not need predefined expanded sections,
  // or we can default to expanding the first available section if pages exist.
  const [expandedSections, setExpandedSections] = useState<string[]>(
    pages.length > 0 ? ["All Documents"] : []
  );
  const [searchQuery, setSearchQuery] = useState("");

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

  const dynamicSidebarSections = useMemo(() => {
    if (!pages || pages.length === 0) return [];

    const items = pages
      .map((page) => ({
        id: page.id,
        title: page.title || "Untitled Page",
        href: `#doc-page-${page.id}`, // Use page ID for unique href
        slug: slugify(page.title || "Untitled Page"), // Use slug for cleaner URLs if needed later or for IDs
      }))
      .filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (items.length === 0 && searchQuery === "") return []; // No items and no search query means nothing to show (or all filtered out)
    if (items.length === 0 && searchQuery !== "") return []; // All items filtered out by search

    return [
      {
        title: "All Documents", // A single section for all Notion pages
        icon: BookOpen,
        items: items,
      },
    ];
  }, [pages, searchQuery]);


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

        <nav className="space-y-2">
          {dynamicSidebarSections.map((section) => (
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
                <div className="ml-6 mt-2 space-y-1">
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
          ))}
          {pages && pages.length === 0 && !searchQuery && (
             <p className="p-2 text-sm text-muted-foreground">No documents found.</p>
          )}
          {searchQuery && dynamicSidebarSections.every(sec => sec.items.length === 0) && (
             <p className="p-2 text-sm text-muted-foreground">No documents match your search.</p>
          )}
        </nav>
      </div>
    </div>
  );
}
