"use client"

import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'
import { usePerformanceMonitor } from '@/hooks/use-editor-performance'
import { MentionItem } from './mention-extension'
import { getCategoryColor, getCategoryIcon } from '@/lib/template-variables'
import { Search, ChevronRight, Sparkles } from 'lucide-react'

interface MentionListProps {
  items: MentionItem[]
  command: (item: MentionItem) => void
  variables?: MentionItem[]
  onVariableInsert?: (variable: MentionItem) => void
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command, onVariableInsert }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
    const [hoveredItem, setHoveredItem] = useState<string | null>(null)

    // Performance monitoring
    usePerformanceMonitor('MentionList', process.env.NODE_ENV === 'development')

    // Debounce items and search query to reduce expensive operations
    const debouncedItems = useDebounce(items, 50)
    const debouncedSearchQuery = useDebounce(searchQuery, 150)

    // Memoized filtering and grouping of items by category for better performance
    const { groupedItems, categories, flatItems, totalCount } = useMemo(() => {
      // Filter items based on search query
      let filteredItems = debouncedItems
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase()
        filteredItems = debouncedItems.filter(item => 
          item.label.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query))
        )
      }

      const grouped = filteredItems.reduce((groups, item) => {
        const category = item.category || 'Sonstiges'
        if (!groups[category]) {
          groups[category] = []
        }
        groups[category].push(item)
        return groups
      }, {} as Record<string, MentionItem[]>)

      // Sort categories by priority and name
      const categoryPriority: Record<string, number> = {
        'Mieter': 1,
        'Immobilie': 2,
        'Wohnung': 3,
        'Vermieter': 4,
        'Finanzen': 5,
        'Datum': 6,
        'Vertrag': 7,
        'Betriebskosten': 8,
        'Kündigung': 9,
        'Rechtliches': 10,
        'Instandhaltung': 11
      }

      const sortedCategories = Object.keys(grouped).sort((a, b) => {
        const priorityA = categoryPriority[a] || 999
        const priorityB = categoryPriority[b] || 999
        if (priorityA !== priorityB) {
          return priorityA - priorityB
        }
        return a.localeCompare(b)
      })

      // Sort items within each category
      Object.keys(grouped).forEach(category => {
        grouped[category].sort((a, b) => a.label.localeCompare(b.label))
      })
      
      return {
        groupedItems: grouped,
        categories: sortedCategories,
        flatItems: filteredItems, // Keep flat list for keyboard navigation
        totalCount: filteredItems.length
      }
    }, [debouncedItems, debouncedSearchQuery])

    // Auto-expand categories when searching
    useEffect(() => {
      if (debouncedSearchQuery.trim()) {
        setExpandedCategories(new Set(categories))
      } else {
        // Keep first category expanded by default for better UX
        setExpandedCategories(new Set(categories.slice(0, 1)))
      }
    }, [debouncedSearchQuery, categories])

    useEffect(() => {
      setSelectedIndex(0)
    }, [flatItems.length])

    // Memoized item selection handler with enhanced feedback
    const selectItem = useCallback((index: number) => {
      const item = flatItems[index]
      if (item) {
        // Add visual feedback for selection
        setHoveredItem(item.id)
        setTimeout(() => setHoveredItem(null), 200)
        
        command(item)
        onVariableInsert?.(item)
      }
    }, [flatItems, command, onVariableInsert])

    // Memoized navigation handlers
    const upHandler = useCallback(() => {
      setSelectedIndex((selectedIndex + flatItems.length - 1) % flatItems.length)
    }, [selectedIndex, flatItems.length])

    const downHandler = useCallback(() => {
      setSelectedIndex((selectedIndex + 1) % flatItems.length)
    }, [selectedIndex, flatItems.length])

    const enterHandler = useCallback(() => {
      selectItem(selectedIndex)
    }, [selectItem, selectedIndex])

    // Enhanced mouse handlers
    const handleMouseEnter = useCallback((index: number, itemId: string) => {
      setSelectedIndex(index)
      setHoveredItem(itemId)
    }, [])

    const handleMouseLeave = useCallback(() => {
      setHoveredItem(null)
    }, [])

    // Category toggle handler
    const toggleCategory = useCallback((category: string) => {
      setExpandedCategories(prev => {
        const newSet = new Set(prev)
        if (newSet.has(category)) {
          newSet.delete(category)
        } else {
          newSet.add(category)
        }
        return newSet
      })
    }, [])

    // Search handler
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value)
      setSelectedIndex(0) // Reset selection when searching
    }, [])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        // Handle search input
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          // Allow typing to search
          setSearchQuery(prev => prev + event.key)
          return true
        }

        if (event.key === 'Backspace') {
          if (searchQuery.length > 0) {
            setSearchQuery(prev => prev.slice(0, -1))
            return true
          }
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault()
          upHandler()
          return true
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault()
          downHandler()
          return true
        }

        if (event.key === 'Enter') {
          event.preventDefault()
          enterHandler()
          return true
        }

        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          // Toggle category expansion
          if (flatItems.length > 0) {
            const selectedItem = flatItems[selectedIndex]
            if (selectedItem) {
              toggleCategory(selectedItem.category)
              return true
            }
          }
        }

        return false
      },
    }))

    return (
      <div className="mention-popup bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-96 overflow-hidden flex flex-col">
        {/* Enhanced Header with Search */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Variablen einfügen
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              {totalCount} verfügbar
            </div>
          </div>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <input
              type="text"
              placeholder="Variablen durchsuchen..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {flatItems.length === 0 ? (
            <div className="p-4 text-center">
              <div className="text-gray-400 dark:text-gray-500 mb-2">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {searchQuery.trim() ? 'Keine Variablen gefunden' : 'Keine Variablen verfügbar'}
              </div>
              {searchQuery.trim() && (
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Versuchen Sie einen anderen Suchbegriff
                </div>
              )}
            </div>
          ) : (
            <div className="p-2">
              {categories.map((category) => {
                const categoryItems = groupedItems[category]
                const isExpanded = expandedCategories.has(category)
                const categoryIcon = getCategoryIcon(category)
                const categoryColorClasses = getCategoryColor(category)
                
                return (
                  <div key={category} className="mb-2 last:mb-0">
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md transition-colors group"
                    >
                      <ChevronRight 
                        className={cn(
                          "h-3 w-3 text-gray-400 transition-transform",
                          isExpanded && "rotate-90"
                        )} 
                      />
                      <span className="text-sm">{categoryIcon}</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1">
                        {category}
                      </span>
                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full",
                        categoryColorClasses
                      )}>
                        {categoryItems.length}
                      </span>
                    </button>
                    
                    {/* Category Items */}
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-0.5">
                        {categoryItems.map((item) => {
                          const itemIndex = flatItems.findIndex(flatItem => flatItem.id === item.id)
                          const isSelected = itemIndex === selectedIndex
                          const isHovered = hoveredItem === item.id
                          
                          return (
                            <div key={item.id} className="relative group">
                              <button
                                className={cn(
                                  'w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-150',
                                  'hover:bg-gray-100 dark:hover:bg-gray-700/70',
                                  'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700/70',
                                  isSelected && 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800',
                                  isHovered && 'scale-[1.02] shadow-sm'
                                )}
                                onClick={() => selectItem(itemIndex)}
                                onMouseEnter={() => handleMouseEnter(itemIndex, item.id)}
                                onMouseLeave={handleMouseLeave}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs opacity-60">@</span>
                                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {item.label}
                                      </span>
                                    </div>
                                    {item.description && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 overflow-hidden" style={{ 
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical'
                                      }}>
                                        {item.description}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Context Tags */}
                                  {item.context && item.context.length > 0 && (
                                    <div className="flex gap-1 flex-shrink-0 flex-wrap">
                                      {item.context.slice(0, 2).map((ctx) => (
                                        <span
                                          key={ctx}
                                          className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                                        >
                                          {ctx}
                                        </span>
                                      ))}
                                      {item.context.length > 2 && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500 self-center">
                                          +{item.context.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </button>
                              
                              {/* Enhanced Tooltip */}
                              {isHovered && item.description && (
                                <div className="absolute left-full top-0 ml-2 z-50 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg border border-gray-700 dark:border-gray-600">
                                  <div className="font-medium mb-1">@{item.label}</div>
                                  <div className="text-gray-300 dark:text-gray-400 mb-2">
                                    {item.description}
                                  </div>
                                  {item.context && item.context.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      <span className="text-gray-400 text-xs">Kontext:</span>
                                      {item.context.map((ctx) => (
                                        <span
                                          key={ctx}
                                          className="inline-flex items-center px-1.5 py-0.5 text-xs bg-gray-800 dark:bg-gray-600 text-gray-300 rounded"
                                        >
                                          {ctx}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {/* Tooltip Arrow */}
                                  <div className="absolute left-0 top-3 -ml-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 border-l border-b border-gray-700 dark:border-gray-600 transform rotate-45"></div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* Enhanced Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">↑↓</kbd>
              <span>navigieren</span>
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">Enter</kbd>
              <span>auswählen</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">Esc</kbd>
              <span>schließen</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

MentionList.displayName = 'MentionList'