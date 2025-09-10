"use client"

import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'
import { usePerformanceMonitor } from '@/hooks/use-editor-performance'
import { MentionItem } from './mention-extension'

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

    // Performance monitoring
    usePerformanceMonitor('MentionList', process.env.NODE_ENV === 'development')

    // Debounce items to reduce expensive grouping operations
    const debouncedItems = useDebounce(items, 50)

    // Memoized grouping of items by category for better performance
    const { groupedItems, categories, flatItems } = useMemo(() => {
      const grouped = debouncedItems.reduce((groups, item) => {
        const category = item.category || 'Sonstiges'
        if (!groups[category]) {
          groups[category] = []
        }
        groups[category].push(item)
        return groups
      }, {} as Record<string, MentionItem[]>)

      const sortedCategories = Object.keys(grouped).sort()
      
      return {
        groupedItems: grouped,
        categories: sortedCategories,
        flatItems: debouncedItems // Keep flat list for keyboard navigation
      }
    }, [debouncedItems])

    useEffect(() => {
      setSelectedIndex(0)
    }, [flatItems.length])

    // Memoized item selection handler
    const selectItem = useCallback((index: number) => {
      const item = flatItems[index]
      if (item) {
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

    // Memoized mouse enter handler
    const handleMouseEnter = useCallback((index: number) => {
      setSelectedIndex(index)
    }, [])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          upHandler()
          return true
        }

        if (event.key === 'ArrowDown') {
          downHandler()
          return true
        }

        if (event.key === 'Enter') {
          enterHandler()
          return true
        }

        return false
      },
    }))

    if (flatItems.length === 0) {
      return (
        <div className="mention-popup bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Keine Variablen gefunden
          </div>
        </div>
      )
    }

    return (
      <div className="mention-popup bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
        <div className="p-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
            Verfügbare Variablen
          </div>
          
          {categories.map((category) => (
            <div key={category} className="mb-3 last:mb-0">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 px-2">
                {category}
              </div>
              
              {groupedItems[category].map((item) => {
                const itemIndex = flatItems.findIndex(flatItem => flatItem.id === item.id)
                const isSelected = itemIndex === selectedIndex
                
                return (
                  <button
                    key={item.id}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                      'hover:bg-gray-100 dark:hover:bg-gray-700',
                      'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700',
                      isSelected && 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    )}
                    onClick={() => selectItem(itemIndex)}
                    onMouseEnter={() => handleMouseEnter(itemIndex)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          @{item.label}
                        </div>
                        {item.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </div>
                      
                      {item.context && item.context.length > 0 && (
                        <div className="flex gap-1 ml-2 flex-shrink-0">
                          {item.context.slice(0, 2).map((ctx) => (
                            <span
                              key={ctx}
                              className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                            >
                              {ctx}
                            </span>
                          ))}
                          {item.context.length > 2 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              +{item.context.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">↑↓</kbd>
            {' '}zum Navigieren, {' '}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">Enter</kbd>
            {' '}zum Auswählen, {' '}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">Esc</kbd>
            {' '}zum Schließen
          </div>
        </div>
      </div>
    )
  }
)

MentionList.displayName = 'MentionList'