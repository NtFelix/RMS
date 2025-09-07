'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

export interface MobileSearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onFocus?: () => void
  onBlur?: () => void
}

export function MobileSearchBar({ 
  value, 
  onChange, 
  placeholder = "Suchen...",
  className,
  onFocus,
  onBlur
}: MobileSearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isMobile = useIsMobile()
  const inputRef = useRef<HTMLInputElement>(null)

  // Don't render on desktop
  if (!isMobile) {
    return null
  }

  // Handle expand animation and auto-focus
  const handleExpand = () => {
    setIsExpanded(true)
    // Auto-focus after animation starts
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  // Handle collapse
  const handleCollapse = () => {
    setIsExpanded(false)
    inputRef.current?.blur()
  }

  // Handle clear search
  const handleClear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        handleCollapse()
      }
    }

    if (isExpanded) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isExpanded])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  // Handle input focus
  const handleInputFocus = () => {
    onFocus?.()
  }

  // Handle input blur
  const handleInputBlur = () => {
    onBlur?.()
    // Don't collapse if there's a value
    if (!value) {
      handleCollapse()
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Prevent form submission and blur input
      e.preventDefault()
      inputRef.current?.blur()
    }
  }

  return (
    <div className={cn(
      'relative transition-all duration-300 ease-in-out',
      isExpanded ? 'w-full' : 'w-auto',
      className
    )}>
      {!isExpanded ? (
        // Collapsed state - Icon only
        <button
          onClick={handleExpand}
          className={cn(
            'flex items-center justify-center rounded-xl border transition-all duration-200 touch-manipulation',
            'min-h-[44px] min-w-[44px] w-[44px] h-[44px]',
            'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
            'active:scale-95 active:bg-opacity-80',
            'shadow-sm'
          )}
          aria-label="Suche öffnen"
          role="button"
          data-mobile-nav
        >
          <Search className="w-5 h-5" />
        </button>
      ) : (
        // Expanded state - Full input field
        <div 
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300',
            'bg-white border-gray-200 shadow-sm',
            'animate-in slide-in-from-right-4 duration-300'
          )}
          data-mobile-dropdown
        >
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              'flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500',
              'text-base leading-6',
              'min-w-0' // Prevent input from growing beyond container
            )}
            aria-label="Suchfeld"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          {value && (
            <button
              onClick={handleClear}
              className={cn(
                'flex items-center justify-center rounded-full transition-colors touch-manipulation',
                'w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                'active:scale-95'
              )}
              aria-label="Suche löschen"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleCollapse}
            className={cn(
              'flex items-center justify-center rounded-full transition-colors touch-manipulation ml-1',
              'w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100',
              'active:scale-95'
            )}
            aria-label="Suche schließen"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}