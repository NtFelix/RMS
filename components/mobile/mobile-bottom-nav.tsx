'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Building2, Plus, Building, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrientationAwareMobile } from '@/hooks/use-orientation'
import { useMobileNavigation } from '@/hooks/use-mobile-nav-store'
import { MobileAddMenu } from './mobile-add-menu'
import { MobileMoreMenu } from './mobile-more-menu'

// TypeScript interfaces for navigation props
export interface NavItem {
  id: string
  label: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  action?: 'navigation' | 'dropdown' | 'add-menu'
}

export interface MobileBottomNavProps {
  currentPath?: string
}

// Navigation items configuration
const navigationItems: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/home',
    icon: Home,
    action: 'navigation'
  },
  {
    id: 'haeuser',
    label: 'Häuser',
    href: '/haeuser',
    icon: Building2,
    action: 'navigation'
  },
  {
    id: 'add',
    label: 'Plus',
    icon: Plus,
    action: 'add-menu'
  },
  {
    id: 'wohnungen',
    label: 'Wohnungen',
    href: '/wohnungen',
    icon: Building,
    action: 'navigation'
  },
  {
    id: 'weitere',
    label: 'Weitere',
    icon: MoreHorizontal,
    action: 'dropdown'
  }
]

export function MobileBottomNav({ currentPath }: MobileBottomNavProps) {
  const pathname = usePathname()
  const { isMobile, orientation, isChanging } = useOrientationAwareMobile()
  const { 
    isAddMenuOpen, 
    isMoreMenuOpen, 
    openAddMenu, 
    openMoreMenu 
  } = useMobileNavigation()

  // Don't render on desktop
  if (!isMobile) {
    return null
  }

  // Add orientation-specific classes
  const orientationClasses = orientation === 'landscape' 
    ? 'px-8 py-1' // More horizontal padding in landscape
    : 'px-1 py-2' // Standard padding in portrait

  const isActive = (href?: string) => {
    if (!href) return false
    // More precise active state detection
    if (href === '/home') {
      return pathname === '/home' || pathname === '/'
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  const handleItemClick = (item: NavItem) => {
    // Handle different action types
    switch (item.action) {
      case 'add-menu':
        openAddMenu()
        break
      case 'dropdown':
        openMoreMenu()
        break
      case 'navigation':
      default:
        // Navigation handled by Link component
        break
    }
  }

  return (
    <>
      <nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 md:hidden safe-area-inset-bottom transition-all duration-300",
          isChanging && "opacity-90", // Slight opacity change during orientation transition
          orientation === 'landscape' && "border-t-2" // Slightly thicker border in landscape for better visibility
        )}
        data-mobile-nav
        data-orientation={orientation}
      >
        <div className={cn("flex items-center justify-around transition-all duration-300", orientationClasses)}>
          {navigationItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            // Central plus button gets special styling
            const isPlusButton = item.id === 'add'
            
            if (item.href && item.action === 'navigation') {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-all duration-200 touch-manipulation',
                    'active:scale-95 active:bg-opacity-80',
                    // Orientation-aware padding and sizing
                    orientation === 'landscape' ? 'px-4 py-1' : 'px-3 py-2',
                    active 
                      ? 'text-blue-600 bg-blue-50 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                  aria-label={`Navigate to ${item.label}`}
                  role="button"
                  data-mobile-nav
                >
                  <Icon className={cn(
                    'transition-transform duration-200',
                    orientation === 'landscape' ? 'mb-0.5' : 'mb-1',
                    active ? 'w-6 h-6 scale-110' : 'w-5 h-5'
                  )} />
                  <span className={cn(
                    'font-medium transition-all duration-200',
                    orientation === 'landscape' ? 'text-[10px]' : 'text-xs',
                    active ? 'font-semibold' : 'font-normal'
                  )}>
                    {item.label}
                  </span>
                </Link>
              )
            }

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  'flex flex-col items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-all duration-200 touch-manipulation',
                  'active:scale-95 active:bg-opacity-80',
                  // Orientation-aware padding and sizing
                  orientation === 'landscape' ? 'px-4 py-1' : 'px-3 py-2',
                  isPlusButton
                    ? 'text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
                aria-label={isPlusButton ? 'Open add menu' : `Open ${item.label} menu`}
                role="button"
                data-mobile-nav
              >
                <Icon className={cn(
                  'transition-transform duration-200',
                  orientation === 'landscape' ? 'mb-0.5' : 'mb-1',
                  isPlusButton ? 'w-6 h-6' : 'w-5 h-5'
                )} />
                <span className={cn(
                  'font-medium transition-all duration-200',
                  orientation === 'landscape' ? 'text-[10px]' : 'text-xs',
                  isPlusButton ? 'font-semibold' : 'font-normal'
                )}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Mobile Add Menu */}
      <MobileAddMenu 
        isOpen={isAddMenuOpen}
      />

      {/* Mobile More Menu */}
      <MobileMoreMenu 
        isOpen={isMoreMenuOpen}
        currentPath={currentPath || pathname}
      />
    </>
  )
}