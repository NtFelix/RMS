'use client'

import React, { useState, useEffect, useRef, memo, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { useOptimizedAnimations, useMobileDebounce } from '@/hooks/use-mobile-performance'

export interface MobileSearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onFocus?: () => void
  onBlur?: () => void
}

export const MobileSearchBar = memo<MobileSearchBarProps>(({ 
  value, 
  onChange, 
  placeholder = "Suchen...",
  className,
  onFocus,
  onBlur
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const isMobile = useIsMobile()
  const inputRef = useRef<HTMLInputElement>(null)
  const { duration, shouldReduceMotion } = useOptimizedAnimations()

  // Don't render on desktop
  if (!isMobile) {
    return null
  }

  // Debounced onChange for better performance
  const debouncedOnChange = useMobileDebounce(onChange, 150)

  // Optimized expand handler
  const handleExpand = useCallback(() => {
    setIsExpanded(true)
    // Auto-focus after animation starts with requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      setTimeout(() => {
        inputRef.current?.focus()
      }, shouldReduceMotion ? 0 : 100)
    })
  }, [shouldReduceMotion])

  // Optimized collapse handler
  const handleCollapse = useCallback(() => {
    setIsExpanded(false)
    inputRef.current?.blur()
  }, [])

  // Optimized clear handler
  const handleClear = useCallback(() => {
    onChange('')
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }, [onChange])

  // Optimized escape key handler with proper cleanup
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        handleCollapse()
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden && isExpanded) {
        handleCollapse()
      }
    }

    if (isExpanded) {
      document.addEventListener('keydown', handleEscape, { passive: true })
      document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true })
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isExpanded, handleCollapse])

  // Optimized input change handler with debouncing
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    // Update immediately for UI responsiveness
    onChange(newValue)
    // Also call debounced version for expensive operations
    debouncedOnChange(newValue)
  }, [onChange, debouncedOnChange])

  // Optimized input focus handler
  const handleInputFocus = useCallback(() => {
    onFocus?.()
  }, [onFocus])

  // Optimized input blur handler
  const handleInputBlur = useCallback(() => {
    onBlur?.()
    // Don't collapse if there's a value
    if (!value) {
      handleCollapse()
    }
  }, [onBlur, value, handleCollapse])

  // Optimized keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Prevent form submission and blur input
      e.preventDefault()
      inputRef.current?.blur()
    }
  }, [])

  return (
    <div className={cn(
      'relative ease-in-out',
      !shouldReduceMotion && `transition-all duration-${duration}`,
      isExpanded ? 'w-full' : 'w-auto',
      className
    )}
    style={{
      // Hardware acceleration for smooth animations
      transform: 'translate3d(0, 0, 0)',
      backfaceVisibility: 'hidden'
    }}>
      {!isExpanded ? (
        // Collapsed state - Icon only
        <button
          onClick={handleExpand}
          className={cn(
            'flex items-center justify-center rounded-xl border touch-manipulation',
            'min-h-[44px] min-w-[44px] w-[44px] h-[44px]',
            'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
            'active:scale-95 active:bg-opacity-80',
            'shadow-sm',
            !shouldReduceMotion && `transition-all duration-${Math.min(duration, 200)}`
          )}
          style={{
            // Hardware acceleration for smooth animations
            transform: 'translate3d(0, 0, 0)',
            backfaceVisibility: 'hidden'
          }}
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
            'flex items-center gap-2 px-4 py-2 rounded-xl border',
            'bg-white border-gray-200 shadow-sm',
            !shouldReduceMotion && `transition-all duration-${duration}`,
            !shouldReduceMotion && `animate-in slide-in-from-right-4 duration-${duration}`
          )}
          data-mobile-dropdown
          style={{
            // Hardware acceleration for smooth animations
            transform: 'translate3d(0, 0, 0)',
            backfaceVisibility: 'hidden'
          }}
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
                'flex items-center justify-center rounded-full touch-manipulation',
                'w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                'active:scale-95',
                !shouldReduceMotion && `transition-colors duration-${Math.min(duration, 200)}`
              )}
              style={{
                // Hardware acceleration for smooth animations
                transform: 'translate3d(0, 0, 0)',
                backfaceVisibility: 'hidden'
              }}
              aria-label="Suche löschen"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleCollapse}
            className={cn(
              'flex items-center justify-center rounded-full touch-manipulation ml-1',
              'w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100',
              'active:scale-95',
              !shouldReduceMotion && `transition-colors duration-${Math.min(duration, 200)}`
            )}
            style={{
              // Hardware acceleration for smooth animations
              transform: 'translate3d(0, 0, 0)',
              backfaceVisibility: 'hidden'
            }}
            aria-label="Suche schließen"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
})

MobileSearchBar.displayName = 'MobileSearchBar'