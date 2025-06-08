"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronDown, ChevronRight, Search, Book, Code, Zap, Settings, HelpCircle } from "lucide-react"
import { Input } from "@/components/ui/input"

const sidebarSections = [
  {
    title: "Getting Started",
    icon: Book,
    items: [
      { title: "Introduction", href: "#introduction" },
      { title: "Installation", href: "#installation" },
      { title: "Quick Start", href: "#quick-start" },
      { title: "Configuration", href: "#configuration" },
    ],
  },
  {
    title: "API Reference",
    icon: Code,
    items: [
      { title: "Authentication", href: "#authentication" },
      { title: "Endpoints", href: "#endpoints" },
      { title: "Response Format", href: "#response-format" },
      { title: "Error Handling", href: "#error-handling" },
    ],
  },
  {
    title: "Components",
    icon: Zap,
    items: [
      { title: "Buttons", href: "#buttons" },
      { title: "Forms", href: "#forms" },
      { title: "Navigation", href: "#navigation" },
      { title: "Cards", href: "#cards" },
    ],
  },
  {
    title: "Advanced",
    icon: Settings,
    items: [
      { title: "Custom Themes", href: "#custom-themes" },
      { title: "Performance", href: "#performance" },
      { title: "Best Practices", href: "#best-practices" },
      { title: "Troubleshooting", href: "#troubleshooting" },
    ],
  },
  {
    title: "Support",
    icon: HelpCircle,
    items: [
      { title: "FAQ", href: "#faq" },
      { title: "Community", href: "#community" },
      { title: "Contact", href: "#contact" },
    ],
  },
]

export default function DocumentationSidebar() {
  const [expandedSections, setExpandedSections] = useState<string[]>(["Getting Started"])
  const [searchQuery, setSearchQuery] = useState("")

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionTitle) ? prev.filter((title) => title !== sectionTitle) : [...prev, sectionTitle],
    )
  }

  const handleNavClick = (href: string) => {
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  const filteredSections = sidebarSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase())),
    }))
    .filter((section) => section.items.length > 0 || searchQuery === "")

  return (
    <div className="sticky top-20 h-fit">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder-slate-400 focus:border-slate-500"
          />
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {filteredSections.map((section) => (
            <div key={section.title}>
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full p-2 text-left text-slate-300 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <section.icon className="w-4 h-4" />
                  <span className="font-medium">{section.title}</span>
                </div>
                {expandedSections.includes(section.title) ? (
                  <ChevronDown className="w-4 h-4 group-hover:text-slate-300" />
                ) : (
                  <ChevronRight className="w-4 h-4 group-hover:text-slate-300" />
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
                      key={item.title}
                      onClick={() => handleNavClick(item.href)}
                      className="block w-full text-left p-2 text-sm text-slate-400 hover:text-slate-300 hover:bg-zinc-800/30 rounded-md transition-colors"
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
}
