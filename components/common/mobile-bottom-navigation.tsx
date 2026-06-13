'use client'

import React, { useEffect, useReducer, useRef, useCallback } from 'react'
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
import { SidebarUserData } from '@/lib/server/user-data'
import { useCommandMenu } from '@/hooks/use-command-menu'
import { useFeatureFlagEnabled } from 'posthog-js/react'
import { cn } from '@/lib/utils'
import { SettingsModal } from '@/components/modals/settings-modal'
import { createClient } from '@/utils/supabase/client'
import { ROUTES } from '@/lib/constants'

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
  sidebarData?: SidebarUserData
}

type NavUiState = {
  mounted: boolean
  isMobile: boolean
  isDropdownOpen: boolean
  focusedItemIndex: number
  isSettingsModalOpen: boolean
  announcement: string
  touchedItem: string | null
  isNavigating: boolean
  touchStartTime: number
  touchStartPosition: { x: number; y: number }
}

type NavAction =
  | { type: 'SET_MOUNTED'; payload: boolean }
  | { type: 'SET_MOBILE'; payload: boolean }
  | { type: 'SET_DROPDOWN_OPEN'; payload: boolean }
  | { type: 'SET_FOCUSED_ITEM_INDEX'; payload: number }
  | { type: 'SET_SETTINGS_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_ANNOUNCEMENT'; payload: string }
  | { type: 'SET_TOUCHED_ITEM'; payload: string | null }
  | { type: 'SET_NAVIGATING'; payload: boolean }
  | { type: 'SET_TOUCH_START_TIME'; payload: number }
  | { type: 'SET_TOUCH_START_POSITION'; payload: { x: number; y: number } }
  | { type: 'TOGGLE_DROPDOWN' }

const initialNavState: NavUiState = {
  mounted: false,
  isMobile: false,
  isDropdownOpen: false,
  focusedItemIndex: -1,
  isSettingsModalOpen: false,
  announcement: '',
  touchedItem: null,
  isNavigating: false,
  touchStartTime: 0,
  touchStartPosition: { x: 0, y: 0 },
}

function navReducer(state: NavUiState, action: NavAction): NavUiState {
  switch (action.type) {
    case 'SET_MOUNTED':
      return { ...state, mounted: action.payload }
    case 'SET_MOBILE':
      return { ...state, isMobile: action.payload }
    case 'SET_DROPDOWN_OPEN':
      return { ...state, isDropdownOpen: action.payload, focusedItemIndex: action.payload ? -1 : state.focusedItemIndex }
    case 'SET_FOCUSED_ITEM_INDEX':
      return { ...state, focusedItemIndex: action.payload }
    case 'SET_SETTINGS_MODAL_OPEN':
      return { ...state, isSettingsModalOpen: action.payload }
    case 'SET_ANNOUNCEMENT':
      return { ...state, announcement: action.payload }
    case 'SET_TOUCHED_ITEM':
      return { ...state, touchedItem: action.payload }
    case 'SET_NAVIGATING':
      return { ...state, isNavigating: action.payload }
    case 'SET_TOUCH_START_TIME':
      return { ...state, touchStartTime: action.payload }
    case 'SET_TOUCH_START_POSITION':
      return { ...state, touchStartPosition: action.payload }
    case 'TOGGLE_DROPDOWN':
      return { ...state, isDropdownOpen: !state.isDropdownOpen, focusedItemIndex: !state.isDropdownOpen ? -1 : state.focusedItemIndex }
    default:
      return state
  }
}

function useMobileNavigation(sidebarData: SidebarUserData | undefined, isRouteActive: (route: string) => boolean) {
  const { setOpen: setCommandMenuOpen } = useCommandMenu()
  const documentsEnabled = useFeatureFlagEnabled('documents_tab_access')

  const [navState, dispatch] = useReducer(navReducer, initialNavState)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const dropdownItemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const navigationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Hydration safety and responsive behavior
  useEffect(() => {
    dispatch({ type: 'SET_MOUNTED', payload: true })

    const checkScreenSize = () => {
      const newIsMobile = window.innerWidth < 768
      dispatch({ type: 'SET_MOBILE', payload: newIsMobile })
      return newIsMobile
    }

    checkScreenSize()

    let resizeTimeout: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        const newIsMobile = checkScreenSize()

        if (!newIsMobile && navState.isDropdownOpen) {
          dispatch({ type: 'SET_DROPDOWN_OPEN', payload: false })
          dispatch({ type: 'SET_ANNOUNCEMENT', payload: 'Navigation switched to desktop mode.' })
        }

        if (newIsMobile !== navState.isMobile) {
          dispatch({ type: 'SET_ANNOUNCEMENT', payload:
            newIsMobile
              ? 'Switched to mobile navigation.'
              : 'Switched to desktop navigation.'
          })
        }
      }, 150)
    }

    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [navState.isDropdownOpen, navState.isMobile])

  // Debounced navigation handler
  const debouncedNavigate = useDebouncedCallback((callback: () => void) => {
    if (navState.isNavigating) return

    dispatch({ type: 'SET_NAVIGATING', payload: true })
    callback()

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current)
    }
    navigationTimeoutRef.current = setTimeout(() => {
      dispatch({ type: 'SET_NAVIGATING', payload: false })
    }, 300)
  }, 150)

  // Touch feedback handlers
  const handleTouchStart = useCallback((itemId: string, event: React.TouchEvent) => {
    dispatch({ type: 'SET_TOUCHED_ITEM', payload: itemId })
    dispatch({ type: 'SET_TOUCH_START_TIME', payload: Date.now() })
    dispatch({ type: 'SET_TOUCH_START_POSITION', payload: {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    }})
  }, [])

  const handleTouchEnd = useCallback((itemId: string, event: React.TouchEvent) => {
    const touchEndTime = Date.now()
    const touchDuration = touchEndTime - navState.touchStartTime

    if (touchDuration < 500) {
      const touchEndPosition = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY
      }
      const touchDistance = Math.sqrt(
        Math.pow(touchEndPosition.x - navState.touchStartPosition.x, 2) +
        Math.pow(touchEndPosition.y - navState.touchStartPosition.y, 2)
      )
      if (touchDistance < 10) {
        if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
          try { navigator.vibrate(10) } catch { }
        }
      }
    }

    if (touchDuration < 500 && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(10) } catch { }
    }

    setTimeout(() => {
      dispatch({ type: 'SET_TOUCHED_ITEM', payload: null })
    }, 150)
  }, [navState.touchStartTime, navState.touchStartPosition])

  const handleTouchCancel = useCallback(() => {
    dispatch({ type: 'SET_TOUCHED_ITEM', payload: null })
  }, [])

  // Dropdown toggle
  const handleMoreClick = () => {
    debouncedNavigate(() => {
      const newState = !navState.isDropdownOpen
      dispatch({ type: 'SET_DROPDOWN_OPEN', payload: newState })
      dispatch({ type: 'SET_FOCUSED_ITEM_INDEX', payload: -1 })

      if (newState) {
        dispatch({ type: 'SET_ANNOUNCEMENT', payload: 'More menu opened. Use arrow keys to navigate.' })
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (dropdownItemRefs.current[0]) {
              dropdownItemRefs.current[0]?.focus()
              dispatch({ type: 'SET_FOCUSED_ITEM_INDEX', payload: 0 })
            }
          })
        })
      } else {
        dispatch({ type: 'SET_ANNOUNCEMENT', payload: 'More menu closed.' })
        requestAnimationFrame(() => {
          moreButtonRef.current?.focus()
        })
      }
    })
  }

  // Search click
  const handleSearchClick = () => {
    debouncedNavigate(() => {
      setCommandMenuOpen(true)
      dispatch({ type: 'SET_ANNOUNCEMENT', payload: 'Search opened.' })
    })
  }

  // Primary navigation items
  const primaryNavItems: NavigationItem[] = [
    { id: 'home', title: 'Home', href: ROUTES.HOME, icon: BarChart3 },
    { id: 'tenants', title: 'Mieter', href: '/mieter', icon: Users },
    { id: 'search', title: 'Suchen', icon: SearchIcon, onClick: handleSearchClick },
    { id: 'finance', title: 'Finanzen', href: '/finanzen', icon: Wallet },
    { id: 'more', title: 'Mehr', icon: Menu, onClick: handleMoreClick }
  ]

  // Profile click
  const handleProfileClick = () => {
    dispatch({ type: 'SET_SETTINGS_MODAL_OPEN', payload: true })
    dispatch({ type: 'SET_DROPDOWN_OPEN', payload: false })
    dispatch({ type: 'SET_ANNOUNCEMENT', payload: 'Settings opened.' })
  }

  // Logout
  const handleLogout = async () => {
    dispatch({ type: 'SET_DROPDOWN_OPEN', payload: false })
    dispatch({ type: 'SET_ANNOUNCEMENT', payload: 'Logging out...' })

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error)
      dispatch({ type: 'SET_ANNOUNCEMENT', payload: 'Logout failed.' })
    }
  }

  // Dropdown items
  const dropdownItems: DropdownItem[] = [
    { id: 'profile', title: 'Profil', icon: User, onClick: handleProfileClick },
    { id: 'homepage', title: 'Homepage', href: '/', icon: Globe },
    { id: 'houses', title: 'Häuser', href: '/haeuser', icon: Building2 },
    { id: 'apartments', title: 'Wohnungen', href: '/wohnungen', icon: Home },
    { id: 'operating-costs', title: 'Betriebskosten', href: '/betriebskosten', icon: FileSpreadsheet },
    { id: 'organisation', title: 'Organisationen', href: '/organisation', icon: Building2, hidden: !sidebarData?.hasOrganisationPermission || sidebarData?.isOrganisationHidden },
    { id: 'tasks', title: 'Aufgaben', href: '/todos', icon: CheckSquare },
    { id: 'documents', title: 'Dokumente', href: '/dateien', icon: Folder, hidden: !documentsEnabled },
    { id: 'logout', title: 'Abmelden', icon: LogOut, onClick: handleLogout }
  ]

  // More button active state
  const dropdownRoutes = dropdownItems
    .filter(item => item.href && !item.onClick)
    .map(item => item.href!)

  const isMoreActive = dropdownRoutes.some(route => isRouteActive(route))

  // Visible dropdown items
  const visibleDropdownItems = dropdownItems.filter(item => !item.hidden)

  // Keyboard navigation
  const handleDropdownKeyDown = useCallback((event: KeyboardEvent) => {
    if (!navState.isDropdownOpen) return

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        dispatch({ type: 'SET_DROPDOWN_OPEN', payload: false })
        dispatch({ type: 'SET_ANNOUNCEMENT', payload: 'More menu closed.' })
        moreButtonRef.current?.focus()
        break
      case 'ArrowDown':
        event.preventDefault()
        const nextIndex = navState.focusedItemIndex < visibleDropdownItems.length - 1
          ? navState.focusedItemIndex + 1
          : 0
        dispatch({ type: 'SET_FOCUSED_ITEM_INDEX', payload: nextIndex })
        dropdownItemRefs.current[nextIndex]?.focus()
        break
      case 'ArrowUp':
        event.preventDefault()
        const prevIndex = navState.focusedItemIndex > 0
          ? navState.focusedItemIndex - 1
          : visibleDropdownItems.length - 1
        dispatch({ type: 'SET_FOCUSED_ITEM_INDEX', payload: prevIndex })
        dropdownItemRefs.current[prevIndex]?.focus()
        break
      case 'Home':
        event.preventDefault()
        dispatch({ type: 'SET_FOCUSED_ITEM_INDEX', payload: 0 })
        dropdownItemRefs.current[0]?.focus()
        break
      case 'End':
        event.preventDefault()
        const lastIndex = visibleDropdownItems.length - 1
        dispatch({ type: 'SET_FOCUSED_ITEM_INDEX', payload: lastIndex })
        dropdownItemRefs.current[lastIndex]?.focus()
        break
      case 'Tab':
        dispatch({ type: 'SET_DROPDOWN_OPEN', payload: false })
        dispatch({ type: 'SET_ANNOUNCEMENT', payload: 'More menu closed.' })
        break
    }
  }, [navState.isDropdownOpen, navState.focusedItemIndex, visibleDropdownItems.length])

  // Navigation selection
  const handleNavigationSelect = useCallback((itemTitle: string, callback?: () => void) => {
    if (navState.isNavigating) return

    dispatch({ type: 'SET_NAVIGATING', payload: true })
    dispatch({ type: 'SET_ANNOUNCEMENT', payload: `Navigating to ${itemTitle}.` })

    callback?.()

    setTimeout(() => {
      dispatch({ type: 'SET_NAVIGATING', payload: false })
    }, 300)
  }, [navState.isNavigating])

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(event.target as Node)
      ) {
        dispatch({ type: 'SET_DROPDOWN_OPEN', payload: false })
        dispatch({ type: 'SET_ANNOUNCEMENT', payload: 'More menu closed.' })
      }
    }

    if (navState.isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside, { passive: true })
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
      }
    }
  }, [navState.isDropdownOpen])

  // Keyboard event listener
  useEffect(() => {
    if (navState.isDropdownOpen) {
      document.addEventListener('keydown', handleDropdownKeyDown)
      return () => {
        document.removeEventListener('keydown', handleDropdownKeyDown)
      }
    }
  }, [navState.isDropdownOpen, handleDropdownKeyDown])

  // Announcement auto-clear
  useEffect(() => {
    if (navState.announcement) {
      const timer = setTimeout(() => dispatch({ type: 'SET_ANNOUNCEMENT', payload: '' }), 1000)
      return () => clearTimeout(timer)
    }
  }, [navState.announcement])

  // Cleanup navigation timeout
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
      }
    }
  }, [])

  return {
    navState,
    dispatch,
    dropdownRef,
    moreButtonRef,
    dropdownItemRefs,
    primaryNavItems,
    dropdownItems,
    isMoreActive,
    visibleDropdownItems,
    handleNavigationSelect,
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel
  }
}

// Extracted sub-components
function PrimaryNavBar({
  items,
  moreButtonRef,
  navState: { isMoreActive, isDropdownOpen, isNavigating, touchedItem },
  isRouteActive,
  onNavigationSelect,
  onMoreClick,
  onTouchStart,
  onTouchEnd,
  onTouchCancel,
  className
}: {
  items: NavigationItem[];
  moreButtonRef: React.RefObject<HTMLButtonElement | null>;
  navState: { isMoreActive: boolean; isDropdownOpen: boolean; isNavigating: boolean; touchedItem: string | null };
  isRouteActive: (route: string) => boolean;
  onNavigationSelect: (itemTitle: string, callback?: () => void) => void;
  onMoreClick: () => void;
  onTouchStart: (itemId: string, event: React.TouchEvent) => void;
  onTouchEnd: (itemId: string, event: React.TouchEvent) => void;
  onTouchCancel: () => void;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur-xs border-t border-border/50",
        "shadow-lg shadow-black/5",
        "mobile-nav-responsive",
        "hydration-safe-mobile",
        "prevent-layout-shift",
        "mobile-nav-container",
        className
      )}
      role="navigation"
      aria-label="Main mobile navigation"
      style={{
        display: 'block',
        paddingTop: '0.5rem',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'
      }}
    >
      <div className="flex items-center justify-around px-1 h-16">
        {items.map((item) => {
          const IconComponent = item.icon;
          let isActive = false;
          if (item.href) {
            isActive = isRouteActive(item.href);
          } else if (item.id === 'more') {
            isActive = isMoreActive;
          }

          if (item.id === 'more') {
            return (
              <button
                key={item.id}
                ref={moreButtonRef}
                onClick={onMoreClick}
                onTouchStart={(e) => onTouchStart(item.id, e)}
                onTouchEnd={(e) => onTouchEnd(item.id, e)}
                onTouchCancel={onTouchCancel}
                disabled={isNavigating}
                className={cn(
                  "flex flex-col items-center justify-center",
                  "min-h-[44px] min-w-[44px] px-3 py-2 mobile-nav-item touch-feedback",
                  "transition-all duration-200 ease-out",
                  "rounded-lg relative",
                  "focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                  "active:scale-95",
                  touchedItem === item.id && "scale-95 bg-accent/20",
                  isActive
                    ? "bg-primary/10 text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/10",
                  isDropdownOpen && "bg-primary/15 text-primary",
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
                  className={cn("w-5 h-5 mb-1 transition-all duration-300 ease-out", isActive && "", isDropdownOpen && "rotate-180 ")}
                  aria-hidden="true"
                />
                <span className={cn("text-xs transition-all duration-300 ease-out", isActive ? "font-semibold tracking-wide" : "font-medium", isDropdownOpen && "font-semibold tracking-wide")}>
                  {item.title}
                </span>
              </button>
            );
          }

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  if (isNavigating) { e.preventDefault(); return; }
                  onNavigationSelect(item.title);
                }}
                onTouchStart={(e) => onTouchStart(item.id, e)}
                onTouchEnd={(e) => onTouchEnd(item.id, e)}
                onTouchCancel={onTouchCancel}
                className={cn(
                  "flex flex-col items-center justify-center",
                  "min-h-[44px] min-w-[44px] px-3 py-2 mobile-nav-item touch-feedback",
                  "transition-all duration-200 ease-out",
                  "rounded-lg relative",
                  "focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                  "active:scale-95",
                  touchedItem === item.id && "scale-95 bg-accent/20",
                  isActive
                    ? "bg-primary/10 text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/10 ",
                  isNavigating && "opacity-70 pointer-events-none"
                )}
                aria-label={`Navigate to ${item.title}${isActive ? ' (current page)' : ''}`}
                aria-current={isActive ? "page" : undefined}
              >
                <IconComponent className={cn("w-5 h-5 mb-1 transition-all duration-300 ease-out", isActive && "")} aria-hidden="true" />
                <span className={cn("text-xs transition-all duration-300 ease-out", isActive ? "font-semibold tracking-wide" : "font-medium")}>
                  {item.title}
                </span>
              </Link>
            );
          } else {
            return (
              <button
                key={item.id}
                onClick={() => { onNavigationSelect(item.title, () => { item.onClick?.(); }); }}
                onTouchStart={(e) => onTouchStart(item.id, e)}
                onTouchEnd={(e) => onTouchEnd(item.id, e)}
                onTouchCancel={onTouchCancel}
                disabled={isNavigating}
                className={cn(
                  "flex flex-col items-center justify-center",
                  "min-h-[44px] min-w-[44px] px-3 py-2 mobile-nav-item touch-feedback",
                  "transition-all duration-200 ease-out",
                  "rounded-lg relative",
                  "focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                  "active:scale-95",
                  touchedItem === item.id && "scale-95 bg-accent/20",
                  isActive
                    ? "bg-primary/10 text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/10 ",
                  isNavigating && "opacity-70 pointer-events-none"
                )}
                aria-label={`${item.title}${item.id === 'search' ? ' - Open search' : ''}${isActive ? ' (current page)' : ''}`}
                aria-current={isActive ? "page" : undefined}
              >
                <IconComponent className={cn("w-5 h-5 mb-1 transition-all duration-300 ease-out", isActive && "")} aria-hidden="true" />
                <span className={cn("text-xs transition-all duration-300 ease-out", isActive ? "font-semibold tracking-wide" : "font-medium")}>
                  {item.title}
                </span>
              </button>
            );
          }
        })}
      </div>
    </nav>
  );
}

function MoreDropdownMenu({
  isOpen,
  dropdownRef,
  items,
  focusedItemIndex,
  touchedItem,
  onItemRef,
  isRouteActive,
  onNavigationSelect,
  onTouchStart,
  onTouchEnd,
  onTouchCancel,
  onFocusItem,
  onCloseDropdown
}: {
  isOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  items: DropdownItem[];
  focusedItemIndex: number;
  touchedItem: string | null;
  onItemRef: (index: number, el: HTMLAnchorElement | HTMLButtonElement | null) => void;
  isRouteActive: (route: string) => boolean;
  onNavigationSelect: (itemTitle: string, callback?: () => void) => void;
  onTouchStart: (itemId: string, event: React.TouchEvent) => void;
  onTouchEnd: (itemId: string, event: React.TouchEvent) => void;
  onTouchCancel: () => void;
  onFocusItem: (index: number) => void;
  onCloseDropdown: () => void;
}) {
  if (!isOpen) return null;

  const visibleItems = items.filter(item => !item.hidden);

  return (
    <div
      id="more-dropdown-menu"
      ref={dropdownRef}
      className={cn(
        "fixed bottom-16 left-0 right-0 z-40",
        "bg-background/98 backdrop-blur-md border border-border/40 rounded-t-xl shadow-xl shadow-black/15",
        "mx-3 mb-2 mobile-dropdown",
        "animate-in slide-in-from-bottom-4 fade-in-0 duration-300 ease-out",
        "overflow-hidden"
      )}
      role="menu"
      aria-label="More navigation options"
      aria-orientation="vertical"
      aria-activedescendant={
        focusedItemIndex >= 0
          ? `dropdown-item-${visibleItems[focusedItemIndex]?.id}`
          : undefined
      }
    >
      <div className="py-2">
        {visibleItems.map((item, index) => {
          const IconComponent = item.icon;
          const isActive = item.href ? isRouteActive(item.href) : false;
          const isFocused = index === focusedItemIndex;

          if (item.onClick) {
            return (
              <div key={item.id}>
                <button
                  id={`dropdown-item-${item.id}`}
                  ref={(el) => onItemRef(index, el as any)}
                  onClick={() => {
                    onNavigationSelect(item.title, () => {
                      item.onClick?.();
                    });
                  }}
                  onMouseEnter={() => onFocusItem(index)}
                  onFocus={() => onFocusItem(index)}
                  onTouchStart={(e) => onTouchStart(`dropdown-${item.id}`, e)}
                  onTouchEnd={(e) => onTouchEnd(`dropdown-${item.id}`, e)}
                  onTouchCancel={onTouchCancel}
                  className={cn(
                    "flex items-center px-4 py-3 mx-2 rounded-lg",
                    "min-h-[44px] mobile-dropdown-item touch-feedback",
                    "transition-all duration-200 ease-out",
                    "focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                    "active:scale-95",
                    touchedItem === `dropdown-${item.id}` && "scale-95 bg-accent/20",
                    "text-foreground hover:bg-accent/10",
                    isFocused && "bg-accent/5"
                  )}
                  role="menuitem"
                  tabIndex={0}
                  aria-label={`Open ${item.title}`}
                >
                  <IconComponent
                    className={cn(
                      "w-5 h-5 mr-3 transition-all duration-300 ease-out",
                      isFocused && "text-foreground"
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn(
                    "text-sm transition-all duration-300 ease-out",
                    "font-medium",
                    isFocused && "font-medium"
                  )}>
                    {item.title}
                  </span>
                </button>
                {item.id === 'profile' && (
                  <div className="mx-4 my-3 border-t border-border/30" />
                )}
              </div>
            );
          }

          return (
            <div key={item.id}>
              <Link
                id={`dropdown-item-${item.id}`}
                ref={(el) => onItemRef(index, el)}
                href={item.href!}
                onClick={() => {
                  onNavigationSelect(item.title, () => {
                    onCloseDropdown();
                  });
                }}
                onMouseEnter={() => onFocusItem(index)}
                onFocus={() => onFocusItem(index)}
                onTouchStart={(e) => onTouchStart(`dropdown-${item.id}`, e)}
                onTouchEnd={(e) => onTouchEnd(`dropdown-${item.id}`, e)}
                onTouchCancel={onTouchCancel}
                className={cn(
                  "flex items-center px-4 py-3 mx-2 rounded-lg",
                  "min-h-[44px] mobile-dropdown-item touch-feedback",
                  "transition-all duration-200 ease-out",
                  "focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                  "active:scale-95",
                  touchedItem === `dropdown-${item.id}` && "scale-95 bg-accent/20",
                  isActive
                    ? "bg-primary/10 text-primary shadow-xs"
                    : "text-foreground hover:bg-accent/10",
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
              {item.id === 'documents' && (
                <div className="mx-4 my-3 border-t border-border/30" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MobileBottomNavigation({ className, sidebarData }: MobileBottomNavigationProps) {
  const { isRouteActive } = useSidebarActiveState()

  const {
    navState, dispatch,
    dropdownRef, moreButtonRef, dropdownItemRefs,
    primaryNavItems, dropdownItems, isMoreActive,
    handleNavigationSelect, handleTouchStart, handleTouchEnd, handleTouchCancel
  } = useMobileNavigation(sidebarData, isRouteActive)

  if (!navState.mounted) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xs border-t border-border/50 shadow-lg shadow-black/5 mobile-nav-responsive hydration-safe-mobile prevent-layout-shift"
        role="navigation"
        aria-label="Main mobile navigation"
        style={{
          display: 'block',
          paddingTop: '0.5rem',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'
        }}
      >
        <div className="flex items-center justify-around px-1 h-16">
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

  if (!navState.isMobile && navState.mounted) {
    return null
  }

  return (
    <>
      <MoreDropdownMenu
        isOpen={navState.isDropdownOpen}
        dropdownRef={dropdownRef}
        items={dropdownItems}
        focusedItemIndex={navState.focusedItemIndex}
        touchedItem={navState.touchedItem}
        onItemRef={(index, el) => { dropdownItemRefs.current[index] = el as HTMLAnchorElement | null; }}
        isRouteActive={isRouteActive}
        onNavigationSelect={handleNavigationSelect}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onFocusItem={(index) => dispatch({ type: 'SET_FOCUSED_ITEM_INDEX', payload: index })}
        onCloseDropdown={() => dispatch({ type: 'SET_DROPDOWN_OPEN', payload: false })}
      />

      <output className="sr-only" aria-live="polite" aria-atomic="true">
        {navState.announcement}
      </output>

      <div id="more-button-description" className="sr-only">
        Opens additional navigation options. Use arrow keys to navigate when open.
      </div>

      <PrimaryNavBar
        items={primaryNavItems}
        moreButtonRef={moreButtonRef}
        navState={{
          isMoreActive,
          isDropdownOpen: navState.isDropdownOpen,
          isNavigating: navState.isNavigating,
          touchedItem: navState.touchedItem
        }}
        isRouteActive={isRouteActive}
        onNavigationSelect={handleNavigationSelect}
        onMoreClick={() => dispatch({ type: 'TOGGLE_DROPDOWN' })}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        className={className}
      />
      <SettingsModal open={navState.isSettingsModalOpen} onOpenChange={(open) => dispatch({ type: 'SET_SETTINGS_MODAL_OPEN', payload: open })} />
    </>
  )
}

// Export interfaces for use in other components
export type { NavigationItem, DropdownItem }