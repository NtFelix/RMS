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
  Folder,
  User,
  LogOut,
  Globe
} from 'lucide-react'
import { useSidebarActiveState } from '@/hooks/use-active-state-manager'
import { useCommandMenu } from '@/hooks/use-command-menu'
import { useFeatureFlagEnabled } from 'posthog-js/react'
import { cn } from '@/lib/utils'
import { SettingsModal } from '@/components/modals/settings-modal'
import { createClient } from '@/utils/supabase/client'

// Touch interaction debounce utility
const useDebouncedCallback = (callback: (...args: any[]) => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => callback(...args), delay)
  }, [callback, delay])
}

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
  href?: string
  icon: React.ComponentType<{ className?: string }>
  hidden?: boolean
  onClick?: () => void
}

interface MobileBottomNavigationProps {
  className?: string
}

export default function MobileBottomNavigation({ className }: MobileBottomNavigationProps) {
  const { isRouteActive } = useSidebarActiveState()
  const { setOpen: setCommandMenuOpen } = useCommandMenu()
  const documentsEnabled = useFeatureFlagEnabled('documents_tab_access')

  // Hydration safety - prevent SSR/client mismatch
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Local state for dropdown management
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [focusedItemIndex, setFocusedItemIndex] = useState(-1)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const dropdownItemRefs = useRef<(HTMLAnchorElement | null)[]>([])

  // Screen reader announcement state
  const [announcement, setAnnouncement] = useState('')

  // Touch interaction states for enhanced feedback
  const [touchedItem, setTouchedItem] = useState<string | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const navigationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Touch event tracking for better mobile interactions
  const [touchStartTime, setTouchStartTime] = useState(0)
  const [touchStartPosition, setTouchStartPosition] = useState({ x: 0, y: 0 })

  // Hydration safety and responsive behavior
  useEffect(() => {
    // Set mounted to true to prevent hydration mismatches
    setMounted(true)

    // Check initial screen size
    const checkScreenSize = () => {
      const newIsMobile = window.innerWidth < 768
      setIsMobile(newIsMobile)
      return newIsMobile
    }

    // Set initial state
    checkScreenSize()

    // Add resize listener for responsive behavior with debouncing
    let resizeTimeout: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        const newIsMobile = checkScreenSize()

        // Close dropdown when switching from mobile to desktop
        if (!newIsMobile && isDropdownOpen) {
          setIsDropdownOpen(false)
          setAnnouncement('Navigation switched to desktop mode.')
        }

        // Announce responsive behavior changes
        if (newIsMobile !== isMobile) {
          setAnnouncement(
            newIsMobile
              ? 'Switched to mobile navigation.'
              : 'Switched to desktop navigation.'
          )
        }
      }, 150) // Debounce resize events
    }

    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [isDropdownOpen, isMobile])

  // Debounced navigation handler to prevent rapid navigation attempts
  const debouncedNavigate = useDebouncedCallback((callback: () => void) => {
    if (isNavigating) return

    setIsNavigating(true)
    callback()

    // Reset navigation state after a short delay
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current)
    }
    navigationTimeoutRef.current = setTimeout(() => {
      setIsNavigating(false)
    }, 300)
  }, 150)

  // Enhanced touch feedback handlers
  const handleTouchStart = useCallback((itemId: string, event: React.TouchEvent) => {
    setTouchedItem(itemId)
    setTouchStartTime(Date.now())
    setTouchStartPosition({
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    })
  }, [])

  const handleTouchEnd = useCallback((itemId: string, event: React.TouchEvent) => {
    const touchEndTime = Date.now()
    const touchDuration = touchEndTime - touchStartTime

    // Only trigger if it's a quick tap (not a long press or drag)
    if (touchDuration < 500) {
      const touchEndPosition = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY
      }

      // Check if touch didn't move too much (not a swipe)
      const touchDistance = Math.sqrt(
        Math.pow(touchEndPosition.x - touchStartPosition.x, 2) +
        Math.pow(touchEndPosition.y - touchStartPosition.y, 2)
      )

      if (touchDistance < 10) {
        // Valid tap - provide haptic feedback if available
        if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
          try {
            navigator.vibrate(10)
          } catch (error) {
            // Silently fail if vibration is not supported
          }
        }
      }
    }

    // Always provide haptic feedback for valid touch end events
    if (touchDuration < 500 && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(10)
      } catch (error) {
        // Silently fail if vibration is not supported
      }
    }

    // Clear touched state after a short delay for visual feedback
    setTimeout(() => {
      setTouchedItem(null)
    }, 150)
  }, [touchStartTime, touchStartPosition])

  const handleTouchCancel = useCallback(() => {
    setTouchedItem(null)
  }, [])

  // Handle dropdown toggle with debouncing
  const handleMoreClick = () => {
    debouncedNavigate(() => {
      const newState = !isDropdownOpen
      setIsDropdownOpen(newState)
      setFocusedItemIndex(-1)

      // Announce state change to screen readers
      if (newState) {
        setAnnouncement('More menu opened. Use arrow keys to navigate.')
        // Focus first item when opening - use multiple animation frames for better timing
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (dropdownItemRefs.current[0]) {
              dropdownItemRefs.current[0]?.focus()
              setFocusedItemIndex(0)
            }
          })
        })
      } else {
        setAnnouncement('More menu closed.')
        // Return focus to More button when closing
        requestAnimationFrame(() => {
          moreButtonRef.current?.focus()
        })
      }
    })
  }

  // Handle search button click with debouncing
  const handleSearchClick = () => {
    debouncedNavigate(() => {
      setCommandMenuOpen(true)
      setAnnouncement('Search opened.')
    })
  }



  // Define primary navigation items
  const primaryNavItems: NavigationItem[] = [
    {
      id: 'home',
      title: 'Home',
      href: '/dashboard',
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

  // Handle profile button click
  const handleProfileClick = () => {
    setIsSettingsModalOpen(true)
    setIsDropdownOpen(false)
    setAnnouncement('Settings opened.')
  }

  // Handle logout
  const handleLogout = async () => {
    setIsDropdownOpen(false)
    setAnnouncement('Logging out...')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      // Redirect will be handled by middleware
    } catch (error) {
      console.error('Error signing out:', error)
      setAnnouncement('Logout failed.')
    }
  }



  // Define dropdown items for "More" menu
  const dropdownItems: DropdownItem[] = [
    {
      id: 'profile',
      title: 'Profil',
      icon: User,
      onClick: handleProfileClick
    },
    {
      id: 'homepage',
      title: 'Homepage',
      href: '/',
      icon: Globe
    },
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
    },
    {
      id: 'logout',
      title: 'Abmelden',
      icon: LogOut,
      onClick: handleLogout
    }
  ]

  // Define dropdown routes to check for "More" button active state (only include items with href)
  const dropdownRoutes = dropdownItems
    .filter(item => item.href && !item.onClick) // Only include link items, not button items
    .map(item => item.href!)

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

  // Handle navigation item selection with debouncing
  const handleNavigationSelect = useCallback((itemTitle: string, callback?: () => void) => {
    if (isNavigating) return

    setIsNavigating(true)
    setAnnouncement(`Navigating to ${itemTitle}.`)

    // Execute callback immediately for better UX
    callback?.()

    // Reset navigation state after delay
    setTimeout(() => {
      setIsNavigating(false)
    }, 300)
  }, [isNavigating])

  // Enhanced click/touch outside handler to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
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
      // Listen for both mouse and touch events for better mobile support
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside, { passive: true })
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
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

  // Cleanup navigation timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
      }
    }
  }, [])

  // Prevent hydration mismatches by rendering a CSS-only fallback until mounted
  if (!mounted) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/50 shadow-lg shadow-black/5 mobile-nav-responsive hydration-safe-mobile prevent-layout-shift"
        role="navigation"
        aria-label="Main mobile navigation"
        style={{
          // CSS-only fallback - ensure proper responsive behavior
          display: 'block',
          // Safe area support with balanced padding
          paddingTop: '0.5rem',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'
        }}
      >
        {/* Main navigation items fallback */}
        <div className="flex items-center justify-around px-1 h-16">
          {/* Render static navigation items as fallback with enhanced styling */}
          <div className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 text-muted-foreground rounded-lg mobile-nav-item">
            <BarChart3 className="w-5 h-5 mb-1 transition-all duration-300" aria-hidden="true" />
            <span className="text-xs font-medium transition-all duration-300">Home</span>
          </div>
          <div className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 text-muted-foreground rounded-lg mobile-nav-item">
            <Users className="w-5 h-5 mb-1 transition-all duration-300" aria-hidden="true" />
            <span className="text-xs font-medium transition-all duration-300">Mieter</span>
          </div>
          <div className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 text-muted-foreground rounded-lg mobile-nav-item">
            <SearchIcon className="w-5 h-5 mb-1 transition-all duration-300" aria-hidden="true" />
            <span className="text-xs font-medium transition-all duration-300">Suchen</span>
          </div>
          <div className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 text-muted-foreground rounded-lg mobile-nav-item">
            <Wallet className="w-5 h-5 mb-1 transition-all duration-300" aria-hidden="true" />
            <span className="text-xs font-medium transition-all duration-300">Finanzen</span>
          </div>
          <div className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 text-muted-foreground rounded-lg mobile-nav-item">
            <Menu className="w-5 h-5 mb-1 transition-all duration-300" aria-hidden="true" />
            <span className="text-xs font-medium transition-all duration-300">Mehr</span>
          </div>
        </div>
      </nav>
    )
  }

  // Don't render on desktop screens (additional safety check)
  if (!isMobile && mounted) {
    return null
  }

  return (
    <>
      {/* Dropdown Menu - positioned above navigation bar */}
      {isDropdownOpen && (
        <div
          id="more-dropdown-menu"
          ref={dropdownRef}
          className={cn(
            "fixed bottom-16 left-0 right-0 z-40",
            "bg-background/98 backdrop-blur-md border border-border/40 rounded-t-xl shadow-xl shadow-black/15",
            "mx-3 mb-2 mobile-dropdown",
            "animate-in slide-in-from-bottom-4 fade-in-0 duration-300 ease-out",
            // Ensure proper background and prevent overlap
            "overflow-hidden"
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
              const isActive = item.href ? isRouteActive(item.href) : false
              const isFocused = index === focusedItemIndex

              // Handle button items (like profile)
              if (item.onClick) {
                return (
                  <div key={item.id}>
                    <button
                      id={`dropdown-item-${item.id}`}
                      ref={(el) => {
                        dropdownItemRefs.current[index] = el as any
                      }}
                      onClick={() => {
                        handleNavigationSelect(item.title, () => {
                          item.onClick?.()
                        })
                      }}
                      onMouseEnter={() => setFocusedItemIndex(index)}
                      onFocus={() => setFocusedItemIndex(index)}
                      onTouchStart={(e) => handleTouchStart(`dropdown-${item.id}`, e)}
                      onTouchEnd={(e) => handleTouchEnd(`dropdown-${item.id}`, e)}
                      onTouchCancel={handleTouchCancel}
                      className={cn(
                        "flex items-center px-4 py-3 mx-2 rounded-lg",
                        "min-h-[44px] mobile-dropdown-item touch-feedback",
                        "transition-all duration-200 ease-out",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                        "active:scale-95",
                        // Enhanced touch feedback
                        touchedItem === `dropdown-${item.id}` && "scale-95 bg-accent/20",
                        // Button styling - exactly identical to link items (no active state since buttons don't have href)
                        "text-foreground hover:bg-accent/10",
                        // Focus state styling - exactly identical to link items
                        isFocused && "bg-accent/5"
                      )}
                      role="menuitem"
                      tabIndex={0}
                      aria-label={`Open ${item.title}`}
                    >
                      <IconComponent
                        className={cn(
                          "w-5 h-5 mr-3 transition-all duration-300 ease-out",
                          // Icon styling exactly identical to link items (no active state for buttons)
                          isFocused && "text-foreground"
                        )}
                        aria-hidden="true"
                      />
                      <span className={cn(
                        "text-sm transition-all duration-300 ease-out",
                        // Text styling exactly identical to link items (no active state for buttons)
                        "font-medium",
                        isFocused && "font-medium"
                      )}>
                        {item.title}
                      </span>
                    </button>
                    {/* Add separator after profile */}
                    {item.id === 'profile' && (
                      <div className="mx-4 my-3 border-t border-border/30" />
                    )}
                  </div>
                )
              }

              // Handle link items
              return (
                <div key={item.id}>
                  <Link
                    id={`dropdown-item-${item.id}`}
                    ref={(el) => {
                      dropdownItemRefs.current[index] = el
                    }}
                    href={item.href!}
                    onClick={() => {
                      handleNavigationSelect(item.title, () => {
                        setIsDropdownOpen(false)
                      })
                    }}
                    onMouseEnter={() => setFocusedItemIndex(index)}
                    onFocus={() => setFocusedItemIndex(index)}
                    onTouchStart={(e) => handleTouchStart(`dropdown-${item.id}`, e)}
                    onTouchEnd={(e) => handleTouchEnd(`dropdown-${item.id}`, e)}
                    onTouchCancel={handleTouchCancel}
                    className={cn(
                      "flex items-center px-4 py-3 mx-2 rounded-lg",
                      "min-h-[44px] mobile-dropdown-item touch-feedback",
                      "transition-all duration-200 ease-out",
                      "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                      "active:scale-95",
                      // Enhanced touch feedback
                      touchedItem === `dropdown-${item.id}` && "scale-95 bg-accent/20",
                      // Active state styling - mobile optimized without scaling
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-foreground hover:bg-accent/10",
                      // Focus state styling - mobile optimized without scaling
                      isFocused && !isActive && "bg-accent/5"
                    )}
                    role="menuitem"
                    tabIndex={0}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={`Navigate to ${item.title}${isActive ? ' (current page)' : ''}`}
                  >
                    <IconComponent
                      className={cn(
                        "w-5 h-5 mr-3 transition-all duration-300 ease-out",
                        isActive && "text-primary",
                        isFocused && !isActive && "text-foreground"
                      )}
                      aria-hidden="true"
                    />
                    <span className={cn(
                      "text-sm transition-all duration-300 ease-out",
                      isActive ? "font-semibold text-primary" : "font-medium",
                      isFocused && !isActive && "font-medium"
                    )}>
                      {item.title}
                    </span>
                  </Link>
                  {/* Add separator before logout */}
                  {item.id === 'documents' && (
                    <div className="mx-4 my-3 border-t border-border/30" />
                  )}
                </div>
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
          "bg-background/95 backdrop-blur-sm border-t border-border/50",
          "shadow-lg shadow-black/5",
          // Enhanced CSS-only responsive fallbacks
          "mobile-nav-responsive",
          "hydration-safe-mobile",
          // Prevent layout shift during hydration
          "prevent-layout-shift",
          // Mobile navigation container optimizations
          "mobile-nav-container",
          className
        )}
        role="navigation"
        aria-label="Main mobile navigation"
        // Enhanced CSS-only fallback for responsive behavior
        style={{
          // Ensure proper responsive behavior even without JS
          display: 'block',
          // Safe area support with balanced padding
          paddingTop: '0.5rem',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'
        }}
      >
        {/* Main navigation items */}
        <div className="flex items-center justify-around px-1 h-16">
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
                  onTouchStart={(e) => handleTouchStart(item.id, e)}
                  onTouchEnd={(e) => handleTouchEnd(item.id, e)}
                  onTouchCancel={handleTouchCancel}
                  disabled={isNavigating}
                  className={cn(
                    "flex flex-col items-center justify-center",
                    "min-h-[44px] min-w-[44px] px-3 py-2 mobile-nav-item touch-feedback",
                    "transition-all duration-200 ease-out",
                    "rounded-lg relative",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                    "active:scale-95",
                    // Enhanced touch feedback
                    touchedItem === item.id && "scale-95 bg-accent/20",
                    // Active state styling - mobile optimized without scaling
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/10",
                    // Special styling when dropdown is open
                    isDropdownOpen && "bg-primary/15 text-primary",
                    // Disabled state for navigation debouncing
                    isNavigating && "opacity-70 pointer-events-none"
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
                      "w-5 h-5 mb-1 transition-all duration-300 ease-out",
                      isActive && "",
                      isDropdownOpen && "rotate-180 "
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn(
                    "text-xs transition-all duration-300 ease-out",
                    isActive ? "font-semibold tracking-wide" : "font-medium",
                    isDropdownOpen && "font-semibold tracking-wide"
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
                  onClick={(e) => {
                    if (isNavigating) {
                      e.preventDefault()
                      return
                    }
                    handleNavigationSelect(item.title)
                  }}
                  onTouchStart={(e) => handleTouchStart(item.id, e)}
                  onTouchEnd={(e) => handleTouchEnd(item.id, e)}
                  onTouchCancel={handleTouchCancel}
                  className={cn(
                    "flex flex-col items-center justify-center",
                    "min-h-[44px] min-w-[44px] px-3 py-2 mobile-nav-item touch-feedback",
                    "transition-all duration-200 ease-out",
                    "rounded-lg relative",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                    "active:scale-95",
                    // Enhanced touch feedback
                    touchedItem === item.id && "scale-95 bg-accent/20",
                    // Active state styling matching desktop navigation
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/10 ",
                    // Disabled state for navigation debouncing
                    isNavigating && "opacity-70 pointer-events-none"
                  )}
                  aria-label={`Navigate to ${item.title}${isActive ? ' (current page)' : ''}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <IconComponent
                    className={cn(
                      "w-5 h-5 mb-1 transition-all duration-300 ease-out",
                      isActive && ""
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn(
                    "text-xs transition-all duration-300 ease-out",
                    isActive ? "font-semibold tracking-wide" : "font-medium"
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
                    handleNavigationSelect(item.title, () => {
                      item.onClick?.()
                    })
                  }}
                  onTouchStart={(e) => handleTouchStart(item.id, e)}
                  onTouchEnd={(e) => handleTouchEnd(item.id, e)}
                  onTouchCancel={handleTouchCancel}
                  disabled={isNavigating}
                  className={cn(
                    "flex flex-col items-center justify-center",
                    "min-h-[44px] min-w-[44px] px-3 py-2 mobile-nav-item touch-feedback",
                    "transition-all duration-200 ease-out",
                    "rounded-lg relative",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                    "active:scale-95",
                    // Enhanced touch feedback
                    touchedItem === item.id && "scale-95 bg-accent/20",
                    // Active state styling matching desktop navigation
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/10 ",
                    // Disabled state for navigation debouncing
                    isNavigating && "opacity-70 pointer-events-none"
                  )}
                  aria-label={`${item.title}${item.id === 'search' ? ' - Open search' : ''}${isActive ? ' (current page)' : ''}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <IconComponent
                    className={cn(
                      "w-5 h-5 mb-1 transition-all duration-300 ease-out",
                      isActive && ""
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn(
                    "text-xs transition-all duration-300 ease-out",
                    isActive ? "font-semibold tracking-wide" : "font-medium"
                  )}>
                    {item.title}
                  </span>
                </button>
              )
            }
          })}
        </div>
      </nav>
      {/* Settings Modal */}
      <SettingsModal open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen} />
    </>
  )
}

// Export interfaces for use in other components
export type { NavigationItem, DropdownItem }