"use client"

import { useMemo } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TemplateWithMetadata, CategoryStats } from "@/types/template-modal"

interface CategoryFilterProps {
  templates: TemplateWithMetadata[]
  selectedCategory: string
  onCategoryChange: (category: string) => void
  className?: string
  placeholder?: string
}

export function CategoryFilter({ 
  templates, 
  selectedCategory, 
  onCategoryChange,
  className,
  placeholder = "Kategorie wählen"
}: CategoryFilterProps) {
  // Calculate category statistics from templates
  const categories = useMemo(() => {
    const categoryCount = templates.reduce((acc, template) => {
      const category = template.kategorie || 'Ohne Kategorie'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Convert to CategoryStats array and sort alphabetically
    return Object.entries(categoryCount)
      .map(([name, count]) => ({
        name,
        count,
        lastUsed: undefined // Could be enhanced later with last used tracking
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [templates])

  // Calculate total template count for "Alle Kategorien" option
  const totalCount = templates.length

  return (
    <Select 
      value={selectedCategory} 
      onValueChange={onCategoryChange}
    >
      <SelectTrigger 
        className={className}
        aria-label="Kategorie auswählen"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {/* "All Categories" option */}
        <SelectItem value="all">
          <div className="flex items-center justify-between w-full">
            <span>Alle Kategorien</span>
            <span className="ml-2 text-muted-foreground">({totalCount})</span>
          </div>
        </SelectItem>
        
        {/* Individual category options */}
        {categories.length > 0 ? (
          categories.map((category) => (
            <SelectItem key={category.name} value={category.name}>
              <div className="flex items-center justify-between w-full">
                <span>{category.name}</span>
                <span className="ml-2 text-muted-foreground">({category.count})</span>
              </div>
            </SelectItem>
          ))
        ) : (
          <SelectItem value="no-categories" disabled>
            <span className="text-muted-foreground">Keine Kategorien verfügbar</span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}