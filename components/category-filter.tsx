"use client"

import { useMemo } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"
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
  const isMobile = useIsMobile()
  
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
    <div>
      <label htmlFor="category-filter" className="sr-only">
        Kategorie zum Filtern auswählen
      </label>
      <Select 
        value={selectedCategory} 
        onValueChange={onCategoryChange}
      >
        <SelectTrigger 
          id="category-filter"
          className={className}
          aria-label="Kategorie auswählen"
          aria-describedby="category-filter-help"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent 
          role="listbox"
          aria-label="Verfügbare Kategorien"
          className={isMobile ? 'max-h-[60vh]' : ''}
        >
          {/* "All Categories" option */}
          <SelectItem 
            value="all"
            aria-label={`Alle Kategorien anzeigen, ${totalCount} Vorlagen insgesamt`}
            className={isMobile ? 'py-3 text-base' : ''}
          >
            <div className="flex items-center justify-between w-full">
              <span>{isMobile ? 'Alle' : 'Alle Kategorien'}</span>
              <span className="ml-2 text-muted-foreground" aria-hidden="true">({totalCount})</span>
            </div>
          </SelectItem>
          
          {/* Individual category options */}
          {categories.length > 0 ? (
            categories.map((category) => (
              <SelectItem 
                key={category.name} 
                value={category.name}
                aria-label={`Kategorie ${category.name}, ${category.count} ${category.count === 1 ? 'Vorlage' : 'Vorlagen'}`}
                className={isMobile ? 'py-3 text-base' : ''}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={isMobile ? 'truncate' : ''}>{category.name}</span>
                  <span className="ml-2 text-muted-foreground shrink-0" aria-hidden="true">({category.count})</span>
                </div>
              </SelectItem>
            ))
          ) : (
            <SelectItem 
              value="no-categories" 
              disabled 
              aria-label="Keine Kategorien verfügbar"
              className={isMobile ? 'py-3 text-base' : ''}
            >
              <span className="text-muted-foreground">Keine Kategorien verfügbar</span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      <div id="category-filter-help" className="sr-only">
        Wählen Sie eine Kategorie aus, um nur Vorlagen dieser Kategorie anzuzeigen
      </div>
    </div>
  )
}