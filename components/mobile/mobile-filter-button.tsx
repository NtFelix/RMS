'use client'

import React, { useState, useEffect } from 'react'
import { Filter, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

export interface FilterOption {
  id: string
  label: string
  count?: number
}

export interface MobileFilterButtonProps {
  filters: FilterOption[]
  activeFilters: string[]
  onFilterChange: (filters: string[]) => void
  className?: string
}

export function MobileFilterButton({ 
  filters, 
  activeFilters, 
  onFilterChange,
  className 
}: MobileFilterButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isMobile = useIsMobile()

  // Don't render on desktop
  if (!isMobile) {
    return null
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsExpanded(false)
    }
  }

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when dropdown is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isExpanded])

  // Handle filter toggle
  const handleFilterToggle = (filterId: string) => {
    const newActiveFilters = activeFilters.includes(filterId)
      ? activeFilters.filter(id => id !== filterId)
      : [...activeFilters, filterId]
    
    onFilterChange(newActiveFilters)
  }

  // Clear all filters
  const handleClearAll = () => {
    onFilterChange([])
  }

  // Get active filter count
  const activeFilterCount = activeFilters.length

  return (
    <>
      {/* Filter Button */}
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 touch-manipulation',
          'min-h-[44px] min-w-[44px]',
          'active:scale-95 active:bg-opacity-80',
          activeFilterCount > 0
            ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
          className
        )}
        aria-label={`Filter options${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
        role="button"
      >
        <Filter className="w-4 h-4" />
        <span className="font-medium">Filter</span>
        {activeFilterCount > 0 && (
          <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown className="w-4 h-4 ml-auto" />
      </button>

      {/* Dropdown Menu */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label="Filter Menü"
        >
          <div className="fixed bottom-4 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300 max-h-[70vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Filter
                </h3>
                {activeFilterCount > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-sm font-medium px-2 py-1 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded transition-colors touch-manipulation"
                    aria-label="Alle Filter löschen"
                  >
                    Alle löschen
                  </button>
                )}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors touch-manipulation"
                  aria-label="Filter Menü schließen"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Filter Options */}
            <div className="p-2 overflow-y-auto flex-1">
              {filters.map((filter) => {
                const isActive = activeFilters.includes(filter.id)
                return (
                  <button
                    key={filter.id}
                    onClick={() => handleFilterToggle(filter.id)}
                    className={cn(
                      'w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 touch-manipulation',
                      'hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98]',
                      'text-left',
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:text-gray-900'
                    )}
                    aria-label={`${isActive ? 'Deaktiviere' : 'Aktiviere'} Filter: ${filter.label}`}
                    role="checkbox"
                    aria-checked={isActive}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                        isActive
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      )}>
                        {isActive && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium">
                        {filter.label}
                      </span>
                    </div>
                    {filter.count !== undefined && (
                      <span className={cn(
                        'text-sm px-2 py-1 rounded-full',
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      )}>
                        {filter.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Footer with Apply Button */}
            <div className="p-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setIsExpanded(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors touch-manipulation active:scale-[0.98]"
                aria-label="Filter anwenden"
              >
                Filter anwenden
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}