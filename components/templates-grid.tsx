"use client"

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TemplateCard } from '@/components/template-card'
import { ArrowUpDown, Grid3X3, List, SortAsc, SortDesc } from 'lucide-react'
import type { Template } from '@/types/template'
import type { TemplateWithMetadata } from '@/types/template-modal'

interface CategoryGroup {
  category: string
  templates: (Template | TemplateWithMetadata)[]
  count: number
}

interface TemplatesGridProps {
  templates: (Template | TemplateWithMetadata)[]
  groupByCategory: boolean
  onEditTemplate: (templateId: string) => void
  onDeleteTemplate: (templateId: string) => Promise<void>
  viewMode?: 'grid' | 'list'
  onViewModeChange?: (mode: 'grid' | 'list') => void
}

type SortOption = 'title' | 'created' | 'modified' | 'category'
type SortOrder = 'asc' | 'desc'

export function TemplatesGrid({ 
  templates, 
  groupByCategory, 
  onEditTemplate, 
  onDeleteTemplate,
  viewMode = 'grid',
  onViewModeChange
}: TemplatesGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>('title')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Sort templates based on selected criteria
  const sortedTemplates = useMemo(() => {
    const sorted = [...templates].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'title':
          comparison = a.titel.localeCompare(b.titel, 'de-DE')
          break
        case 'created':
          comparison = new Date(a.erstellungsdatum).getTime() - new Date(b.erstellungsdatum).getTime()
          break
        case 'modified':
          const aModified = a.aktualisiert_am || a.erstellungsdatum
          const bModified = b.aktualisiert_am || b.erstellungsdatum
          comparison = new Date(aModified).getTime() - new Date(bModified).getTime()
          break
        case 'category':
          const aCat = a.kategorie || 'Ohne Kategorie'
          const bCat = b.kategorie || 'Ohne Kategorie'
          comparison = aCat.localeCompare(bCat, 'de-DE')
          break
        default:
          comparison = 0
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [templates, sortBy, sortOrder])

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    if (!groupByCategory) {
      return [{
        category: 'Alle Vorlagen',
        templates: sortedTemplates,
        count: sortedTemplates.length
      }]
    }

    const groups = sortedTemplates.reduce((acc, template) => {
      const category = template.kategorie || 'Ohne Kategorie'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(template)
      return acc
    }, {} as Record<string, (Template | TemplateWithMetadata)[]>)

    return Object.entries(groups)
      .map(([category, templates]) => ({
        category,
        templates: templates.sort((a, b) => {
          // Within categories, always sort by title for consistency
          return a.titel.localeCompare(b.titel, 'de-DE')
        }),
        count: templates.length
      }))
      .sort((a, b) => {
        // Sort categories alphabetically, but put "Ohne Kategorie" last
        if (a.category === 'Ohne Kategorie') return 1
        if (b.category === 'Ohne Kategorie') return -1
        return a.category.localeCompare(b.category, 'de-DE')
      })
  }, [sortedTemplates, groupByCategory])

  const handleSortChange = (newSortBy: SortOption) => {
    if (newSortBy === sortBy) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new sort field with ascending order
      setSortBy(newSortBy)
      setSortOrder('asc')
    }
  }

  const getSortLabel = (option: SortOption) => {
    const labels = {
      title: 'Titel',
      created: 'Erstellungsdatum',
      modified: 'Änderungsdatum',
      category: 'Kategorie'
    }
    return labels[option]
  }

  const gridClasses = viewMode === 'grid' 
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
    : 'grid grid-cols-1 gap-3'

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-muted-foreground mb-4">
          <Grid3X3 className="h-12 w-12 mx-auto mb-2" />
          <p className="text-lg font-medium">Keine Vorlagen vorhanden</p>
          <p className="text-sm">Erstellen Sie Ihre erste Vorlage, um loszulegen.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sorting and View Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Sortieren nach:</span>
          <Select value={sortBy} onValueChange={(value) => handleSortChange(value as SortOption)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Titel</SelectItem>
              <SelectItem value="created">Erstellungsdatum</SelectItem>
              <SelectItem value="modified">Änderungsdatum</SelectItem>
              {groupByCategory && <SelectItem value="category">Kategorie</SelectItem>}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-2"
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
            <span className="sr-only">
              {sortOrder === 'asc' ? 'Aufsteigend sortiert' : 'Absteigend sortiert'}
            </span>
          </Button>
        </div>

        {onViewModeChange && (
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className="px-2"
            >
              <Grid3X3 className="h-4 w-4" />
              <span className="sr-only">Rasteransicht</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className="px-2"
            >
              <List className="h-4 w-4" />
              <span className="sr-only">Listenansicht</span>
            </Button>
          </div>
        )}
      </div>

      {/* Template Groups */}
      <div className="space-y-8">
        {groupedTemplates.map((group) => (
          <div key={group.category} className="space-y-4">
            {groupByCategory && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    {group.category}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {group.count} {group.count === 1 ? 'Vorlage' : 'Vorlagen'}
                  </Badge>
                </div>
                {group.templates.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Sortiert nach: {getSortLabel(sortBy)} ({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})
                  </div>
                )}
              </div>
            )}

            {group.templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Keine Vorlagen in dieser Kategorie</p>
              </div>
            ) : (
              <div className={gridClasses}>
                {group.templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => onEditTemplate(template.id)}
                    onDelete={onDeleteTemplate}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      {groupByCategory && groupedTemplates.length > 1 && (
        <div className="border-t pt-4 mt-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Gesamt: {templates.length} {templates.length === 1 ? 'Vorlage' : 'Vorlagen'} 
              in {groupedTemplates.length} {groupedTemplates.length === 1 ? 'Kategorie' : 'Kategorien'}
            </span>
            <span>
              Sortiert nach: {getSortLabel(sortBy)} ({sortOrder === 'asc' ? 'aufsteigend' : 'absteigend'})
            </span>
          </div>
        </div>
      )}
    </div>
  )
}