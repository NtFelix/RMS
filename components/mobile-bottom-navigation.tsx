'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { 
  BarChart3, 
  Users, 
  Search as SearchIcon, 
  Wallet, 
  Menu,
  Building2,
  Home,
  FileSpreadsheet,
  CheckSquare,
  Folder
} from 'lucide-react'
import { useSidebarActiveState } from '@/hooks/use-active-state-manager'
import { useCommandMenu } from '@/hooks/use-command-menu'
import { useFeatureFlagEnabled } from 'posthog-js/react'
import { cn } from '@/lib/utils'

// TypeScript interfaces for NavigationItem and DropdownItem
interface NavigationItem {
  id: string
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
  badge?: number
}

interface DropdownItem {
  id: string
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  hidden?: boolean
}

interface MobileBottomNavigationProps {
  className?: string
}

export default function MobileBottomNavigation({ className }: MobileBottomNavigationProps) {
  const { isRouteActive } = useSidebarActiveState()
  const { setOpen: setCommandMenuOpen } = useCommandMenu()
  const documentsEnabled = useFeatureFlagEnabled('documents_tab_access')
  
  // Local state for dropdown management
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [focusedItemIndex, setFocusedItemIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const dropdownItemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  
  // Screen reader announcement state
  const [announcement, setAnnouncement] = useState('')

  // Handle dropdown toggle
  const handleMoreClick = () => {
    const newState = !isDropdownOpen
    setIsDropdownOpen(newState)
    setFocusedItemIndex(-1)
    
    // Announce state change to screen readers
    if (newState) {
      setAnnouncement('More menu opened. Use arrow keys to navigate.')
      // Focus first item when opening
      setTimeout(() => {
        if (dropdownItemRefs.current[0]) {
          dropdownItemRefs.current[0]?.focus()
          setFocusedItemIndex(0)
        }
      }, 100)
    } else {
      setAnnouncement('More menu closed.')
      // Return focus to More button when closing
      moreButtonRef.current?.focus()
    }
  }

  // Handle search button click
  const handleSearchClick = () => {
    setCommandMenuOpen(true)
    setAnnouncement('Search opened.')
  }

  // Define primary navigation items
  const primaryNavItems: NavigationItem[] = [
    {
      id: 'home',
      title: 'Home',
      href: '/home',
      icon: BarChart3
    },
    {
      id: 'tenants',
      title: 'Mieter',
      href: '/mieter',
      icon: Users
    },
    {
      id: 'search',
      title: 'Suchen',
      icon: SearchIcon,
      onClick: handleSearchClick
    },
    {
      id: 'finance',
      title: 'Finanzen',
      href: '/finanzen',
      icon: Wallet
    },
    {
      id: 'more',
      title: 'Mehr',
      icon: Menu,
      onClick: handleMoreClick
    }
  ]

  // Define dropdown items for "More" menu
  const dropdownItems: DropdownItem[] = [
    {
      id: 'houses',
      title: 'Häuser',
      href: '/haeuser',
      icon: Building2
    },
    {
      id: 'apartments',
      title: 'Wohnungen',
      href: '/wohnungen',
      icon: Home
    },
    {
      id: 'operating-costs',
      title: 'Betriebskosten',
      href: '/betriebskosten',
      icon: FileSpreadsheet
    },
    {
      id: 'tasks',
      title: 'Aufgaben',
      href: '/todos',
      icon: CheckSquare
    },
    {
      id: 'documents',
      title: 'Dokumente',
      href: '/dateien',
      icon: Folder,
      hidden: !documentsEnabled
    }
  ]

  // Define dropdown routes to check for "More" button active state
  const dropdownRoutes = dropdownItems.map(item => item.href)
  
  // Check if any dropdown route is active to highlight "More" button
  const isMoreActive = dropdownRoutes.some(route => isRouteActive(route))
  
  // Get visible dropdown items for keyboard navigation
  const visibleDropdownItems = dropdownItems.filter(item => !item.hidden)
  
  // Keyboard navigation handler for dropdown
  const handleDropdownKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isDropdownOpen) return
    
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        setIsDropdownOpen(false)
        setAnnouncement('More menu closed.')
        moreButtonRef.current?.focus()
        break
        
      case 'ArrowDown':
        event.preventDefault()
        const nextIndex = focusedItemIndex < visibleDropdownItems.length - 1 
          ? focusedItemIndex + 1 
          : 0
        setFocusedItemIndex(nextIndex)
        dropdownItemRefs.current[nextIndex]?.focus()
        break
        
      case 'ArrowUp':
        event.preventDefault()
        const prevIndex = focusedItemIndex > 0 
          ? focusedItemIndex - 1 
          : visibleDropdownItems.length - 1
        setFocusedItemIndex(prevIndex)
        dropdownItemRefs.current[prevIndex]?.focus()
        break
        
      case 'Home':
        event.preventDefault()
        setFocusedItemIndex(0)
        dropdownItemRefs.current[0]?.focus()
        break
        
      case 'End':
        event.preventDefault()
        const lastIndex = visibleDropdownItems.length - 1
        setFocusedItemIndex(lastIndex)
        dropdownItemRefs.current[lastIndex]?.focus()
        break
        
      case 'Tab':
        // Allow normal tab behavior but close dropdown
        setIsDropdownOpen(false)
        setAnnouncement('More menu closed.')
        break
    }
  }, [isDropdownOpen, focusedItemIndex, visibleDropdownItems.length])
  
  // Handle navigation item selection
  const handleNavigationSelect = useCallback((itemTitle: string) => {
    setAnnouncement(`Navigating to ${itemTitle}.`)
  }, [])

  // Click outside handler to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
        setAnnouncement('More menu closed.')
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isDropdownOpen])
  
  // Keyboard navigation event listener
  useEffect(() => {
    if (isDropdownOpen) {
      document.addEventListener('keydown', handleDropdownKeyDown)
      return () => {
        document.removeEventListener('keydown', handleDropdownKeyDown)
      }
    }
  }, [isDropdownOpen, handleDropdownKeyDown])
  
  // Clear announcement after it's been read
  useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => setAnnouncement(''), 1000)
      return () => clearTimeout(timer)
    }
  }, [announcement])

  return (
    <>
      {/* Dropdown Menu - positioned above navigation bar */}
      {isDropdownOpen && (
        <div
          id="more-dropdown-menu"
          ref={dropdownRef}
          className={cn(
            "fixed bottom-16 left-0 right-0 z-40",
            "bg-background border border-border rounded-t-lg shadow-lg",
            "mx-4 mb-2",
            "animate-in slide-in-from-bottom-2 duration-200"
          )}
          role="menu"
          aria-label="More navigation options"
          aria-orientation="vertical"
          aria-activedescendant={
            focusedItemIndex >= 0 
              ? `dropdown-item-${visibleDropdownItems[focusedItemIndex]?.id}` 
              : undefined
          }
        >
          <div className="py-2">
            {visibleDropdownItems.map((item, index) => {
              const IconComponent = item.icon
              const isActive = isRouteActive(item.href)
              const isFocused = index === focusedItemIndex
              
              return (
                <Link
                  key={item.id}
                  id={`dropdown-item-${item.id}`}
                  ref={(el) => {
                    dropdownItemRefs.current[index] = el
                  }}
                  href={item.href}
                  onClick={() => {
                    setIsDropdownOpen(false)
                    handleNavigationSelect(item.title)
                  }}
                  onMouseEnter={() => setFocusedItemIndex(index)}
                  onFocus={() => setFocusedItemIndex(index)}
                  className={cn(
                    "flex items-center px-4 py-3",
                    "min-h-[44px]",
                    "transition-colors duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset",
                    isActive 
                      ? "bg-accent text-accent-foreground" 
                      : "text-foreground hover:bg-accent/10",
                    isFocused && !isActive && "bg-accent/5"
                  )}
                  role="menuitem"
                  tabIndex={isFocused ? 0 : -1}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={`Navigate to ${item.title}${isActive ? ' (current page)' : ''}`}
                >
                  <IconComponent 
                    className={cn(
                      "w-5 h-5 mr-3 transition-transform duration-200",
                      isActive && "scale-110"
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn(
                    "text-sm transition-all duration-200",
                    isActive ? "font-semibold" : "font-medium"
                  )}>
                    {item.title}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Screen reader announcements */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        role="status"
      >
        {announcement}
      </div>
      
      {/* Hidden description for More button */}
      <div id="more-button-description" className="sr-only">
        Opens additional navigation options. Use arrow keys to navigate when open.
      </div>

      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "bg-background border-t border-border",
          "md:hidden",
          className
        )}
        role="navigation"
        aria-label="Main mobile navigation"
      >
        <div className="flex items-center justify-around px-2 py-2 h-16">
          {primaryNavItems.map((item) => {
            const IconComponent = item.icon
            
            // Determine if this item is active
            let isActive = false
            if (item.href) {
              isActive = isRouteActive(item.href)
            } else if (item.id === 'more') {
              // Special case: "More" button is active if any dropdown route is active
              isActive = isMoreActive
            }
            
            // Handle "More" button separately due to ref requirement
            if (item.id === 'more') {
              return (
                <button
                  key={item.id}
                  ref={moreButtonRef}
                  onClick={item.onClick}
                  className={cn(
                    "flex flex-col items-center justify-center",
                    "min-h-[44px] min-w-[44px] px-2 py-1",
                    "transition-colors duration-200",
                    "rounded-md",
                    "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset",
                    // Active state styling using application color scheme
                    isActive 
                      ? "bg-accent text-accent-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                  )}
                  aria-label={`${item.title} menu${isActive ? ' (current section)' : ''}`}
                  aria-current={isActive ? "page" : undefined}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="menu"
                  aria-controls={isDropdownOpen ? "more-dropdown-menu" : undefined}
                  aria-describedby="more-button-description"
                >
                  <IconComponent 
                    className={cn(
                      "w-5 h-5 mb-1 transition-transform duration-200",
                      isActive && "scale-110",
                      isDropdownOpen && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn(
                    "text-xs transition-all duration-200",
                    isActive ? "font-semibold" : "font-medium"
                  )}>
                    {item.title}
                  </span>
                </button>
              )
            }
            
            // If item has href, render as Link, otherwise as button
            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => handleNavigationSelect(item.title)}
                  className={cn(
                    "flex flex-col items-center justify-center",
                    "min-h-[44px] min-w-[44px] px-2 py-1",
                    "transition-colors duration-200",
                    "rounded-md",
                    "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset",
                    // Active state styling using application color scheme
                    isActive 
                      ? "bg-accent text-accent-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                  )}
                  aria-label={`Navigate to ${item.title}${isActive ? ' (current page)' : ''}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <IconComponent 
                    className={cn(
                      "w-5 h-5 mb-1 transition-transform duration-200",
                      isActive && "scale-110"
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn(
                    "text-xs transition-all duration-200",
                    isActive ? "font-semibold" : "font-medium"
                  )}>
                    {item.title}
                  </span>
                </Link>
              )
            } else {
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.onClick?.()
                    handleNavigationSelect(item.title)
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center",
                    "min-h-[44px] min-w-[44px] px-2 py-1",
                    "transition-colors duration-200",
                    "rounded-md",
                    "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset",
                    // Active state styling using application color scheme
                    isActive 
                      ? "bg-accent text-accent-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                  )}
                  aria-label={`${item.title}${item.id === 'search' ? ' - Open search' : ''}${isActive ? ' (current page)' : ''}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <IconComponent 
                    className={cn(
                      "w-5 h-5 mb-1 transition-transform duration-200",
                      isActive && "scale-110"
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn(
                    "text-xs transition-all duration-200",
                    isActive ? "font-semibold" : "font-medium"
                  )}>
                    {item.title}
                  </span>
                </button>
              )
            }
          })}
        </div>
      </nav>
    </>
  )
}

// Export interfaces for use in other components
export type { NavigationItem, DropdownItem }