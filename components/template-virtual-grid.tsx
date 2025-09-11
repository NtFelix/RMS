/**
 * Virtual scrolling grid component for large template lists
 * Optimizes performance by only rendering visible templates
 */

"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { FixedSizeGrid as Grid, VariableSizeGrid } from 'react-window'
import { TemplateCard } from './template-card'
import { Badge } from './ui/badge'
import type { Template } from '@/types/template'

interface VirtualTemplateGridProps {
  templates: Template[]
  onEditTemplate: (templateId: string) => void
  onDeleteTemplate: (templateId: string) => Promise<void>
  groupByCategory?: boolean
  itemHeight?: number
  itemWidth?: number
  gap?: number
  className?: string
}

interface GridItem {
  type: 'category-header' | 'template'
  data: any
  category?: string
  index: number
}

interface CategoryGroup {
  category: string
  templates: Template[]
  startIndex: number
  endIndex: number
}

/**
 * Virtual grid component for efficient rendering of large template lists
 */
export function VirtualTemplateGrid({
  templates,
  onEditTemplate,
  onDeleteTemplate,
  groupByCategory = false,
  itemHeight = 280,
  itemWidth = 320,
  gap = 16,
  className = ''
}: VirtualTemplateGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<any>(null)
  
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [isVisible, setIsVisible] = useState(false)

  // Calculate grid dimensions
  const gridMetrics = useMemo(() => {
    if (containerSize.width === 0) {
      return { columnCount: 1, rowCount: 0, columnWidth: itemWidth }
    }

    const availableWidth = containerSize.width - gap
    const columnCount = Math.max(1, Math.floor(availableWidth / (itemWidth + gap)))
    const columnWidth = Math.floor((availableWidth - (columnCount - 1) * gap) / columnCount)
    
    return {
      columnCount,
      columnWidth,
      rowCount: Math.ceil(templates.length / columnCount)
    }
  }, [containerSize.width, templates.length, itemWidth, gap])

  // Group templates by category if needed
  const categoryGroups = useMemo((): CategoryGroup[] => {
    if (!groupByCategory) {
      return [{
        category: 'All Templates',
        templates,
        startIndex: 0,
        endIndex: templates.length - 1
      }]
    }

    const groups = new Map<string, Template[]>()
    
    templates.forEach(template => {
      const category = template.kategorie || 'Ohne Kategorie'
      if (!groups.has(category)) {
        groups.set(category, [])
      }
      groups.get(category)!.push(template)
    })

    let currentIndex = 0
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, categoryTemplates]) => {
        const group: CategoryGroup = {
          category,
          templates: categoryTemplates,
          startIndex: currentIndex,
          endIndex: currentIndex + categoryTemplates.length - 1
        }
        currentIndex += categoryTemplates.length + 1 // +1 for category header
        return group
      })
  }, [templates, groupByCategory])

  // Create flat list of grid items including category headers
  const gridItems = useMemo((): GridItem[] => {
    if (!groupByCategory) {
      return templates.map((template, index) => ({
        type: 'template' as const,
        data: template,
        index
      }))
    }

    const items: GridItem[] = []
    let itemIndex = 0

    categoryGroups.forEach(group => {
      // Add category header
      items.push({
        type: 'category-header' as const,
        data: {
          category: group.category,
          count: group.templates.length
        },
        category: group.category,
        index: itemIndex++
      })

      // Add templates
      group.templates.forEach(template => {
        items.push({
          type: 'template' as const,
          data: template,
          category: group.category,
          index: itemIndex++
        })
      })
    })

    return items
  }, [templates, categoryGroups, groupByCategory])

  // Calculate row count for variable height grid (with category headers)
  const variableGridMetrics = useMemo(() => {
    if (!groupByCategory) {
      return gridMetrics
    }

    const headerHeight = 60
    let totalRows = 0
    
    categoryGroups.forEach(group => {
      totalRows += 1 // Category header row
      totalRows += Math.ceil(group.templates.length / gridMetrics.columnCount)
    })

    return {
      ...gridMetrics,
      rowCount: totalRows,
      headerHeight
    }
  }, [gridMetrics, categoryGroups, groupByCategory])

  // Resize observer to track container size
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        const { width, height } = entry.contentRect
        setContainerSize({ width, height })
      }
    })

    resizeObserver.observe(containerRef.current)
    setIsVisible(true)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Get row height for variable size grid
  const getRowHeight = useCallback((rowIndex: number): number => {
    if (!groupByCategory) {
      return itemHeight
    }

    let currentRow = 0
    
    for (const group of categoryGroups) {
      // Category header row
      if (currentRow === rowIndex) {
        return variableGridMetrics.headerHeight
      }
      currentRow++

      // Template rows for this category
      const templateRows = Math.ceil(group.templates.length / gridMetrics.columnCount)
      if (rowIndex < currentRow + templateRows) {
        return itemHeight
      }
      currentRow += templateRows
    }

    return itemHeight
  }, [groupByCategory, categoryGroups, itemHeight, gridMetrics.columnCount, variableGridMetrics.headerHeight])

  // Render grid cell
  const renderCell = useCallback(({ columnIndex, rowIndex, style }: any) => {
    if (!groupByCategory) {
      // Simple grid without categories
      const templateIndex = rowIndex * gridMetrics.columnCount + columnIndex
      const template = templates[templateIndex]

      if (!template) {
        return <div style={style} />
      }

      return (
        <div style={{ ...style, padding: gap / 2 }}>
          <TemplateCard
            template={template}
            onEdit={() => onEditTemplate(template.id)}
            onDelete={() => onDeleteTemplate(template.id)}
          />
        </div>
      )
    }

    // Grid with category grouping
    let currentRow = 0
    
    for (const group of categoryGroups) {
      // Category header row
      if (currentRow === rowIndex) {
        if (columnIndex === 0) {
          return (
            <div 
              style={{ 
                ...style, 
                padding: `${gap / 2}px`,
                gridColumn: `1 / -1`,
                width: containerSize.width - gap
              }}
            >
              <div className="flex items-center justify-between py-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {group.category}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {group.templates.length} {group.templates.length === 1 ? 'Vorlage' : 'Vorlagen'}
                </Badge>
              </div>
            </div>
          )
        }
        return <div style={style} />
      }
      currentRow++

      // Template rows for this category
      const templateRows = Math.ceil(group.templates.length / gridMetrics.columnCount)
      if (rowIndex < currentRow + templateRows) {
        const templateRowIndex = rowIndex - currentRow
        const templateIndex = templateRowIndex * gridMetrics.columnCount + columnIndex
        const template = group.templates[templateIndex]

        if (!template) {
          return <div style={style} />
        }

        return (
          <div style={{ ...style, padding: gap / 2 }}>
            <TemplateCard
              template={template}
              onEdit={() => onEditTemplate(template.id)}
              onDelete={() => onDeleteTemplate(template.id)}
            />
          </div>
        )
      }
      currentRow += templateRows
    }

    return <div style={style} />
  }, [
    templates,
    groupByCategory,
    categoryGroups,
    gridMetrics.columnCount,
    gap,
    containerSize.width,
    onEditTemplate,
    onDeleteTemplate
  ])

  // Scroll to top when templates change
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollToItem({ rowIndex: 0, columnIndex: 0 })
    }
  }, [templates])

  if (!isVisible || containerSize.width === 0) {
    return (
      <div 
        ref={containerRef} 
        className={`w-full h-full min-h-[400px] ${className}`}
        aria-label="Vorlagen werden geladen..."
      >
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-muted-foreground">
            Vorlagen werden vorbereitet...
          </div>
        </div>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div 
        ref={containerRef}
        className={`w-full h-full min-h-[400px] flex items-center justify-center ${className}`}
      >
        <div className="text-center text-muted-foreground">
          <p>Keine Vorlagen vorhanden</p>
        </div>
      </div>
    )
  }

  const GridComponent = groupByCategory ? VariableSizeGrid : Grid

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full ${className}`}
      role="grid"
      aria-label={`${templates.length} Vorlagen`}
    >
      <GridComponent
        ref={gridRef}
        height={containerSize.height}
        width={containerSize.width}
        columnCount={gridMetrics.columnCount}
        columnWidth={gridMetrics.columnWidth}
        rowCount={groupByCategory ? variableGridMetrics.rowCount : gridMetrics.rowCount}
        rowHeight={groupByCategory ? getRowHeight : itemHeight}
        itemData={{
          templates,
          categoryGroups,
          onEditTemplate,
          onDeleteTemplate,
          gap
        }}
        overscanRowCount={2}
        overscanColumnCount={1}
      >
        {renderCell}
      </GridComponent>
    </div>
  )
}

/**
 * Hook for managing virtual grid state and performance
 */
export function useVirtualTemplateGrid(templates: Template[]) {
  const [isVirtualizationEnabled, setIsVirtualizationEnabled] = useState(false)
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    itemCount: 0,
    visibleItemCount: 0
  })

  // Enable virtualization for large lists
  useEffect(() => {
    const shouldVirtualize = templates.length > 50 // Threshold for virtualization
    setIsVirtualizationEnabled(shouldVirtualize)
  }, [templates.length])

  const updatePerformanceMetrics = useCallback((metrics: Partial<typeof performanceMetrics>) => {
    setPerformanceMetrics(prev => ({ ...prev, ...metrics }))
  }, [])

  return {
    isVirtualizationEnabled,
    performanceMetrics,
    updatePerformanceMetrics,
    shouldUseVirtualization: templates.length > 50
  }
}