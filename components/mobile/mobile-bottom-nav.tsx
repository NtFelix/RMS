'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Building2, Plus, Building, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
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
  const isMobile = useIsMobile()
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
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 md:hidden safe-area-inset-bottom"
        data-mobile-nav
      >
        <div className="flex items-center justify-around px-1 py-2">
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
                    'flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl transition-all duration-200 touch-manipulation',
                    'active:scale-95 active:bg-opacity-80',
                    active 
                      ? 'text-blue-600 bg-blue-50 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                  aria-label={`Navigate to ${item.label}`}
                  role="button"
                  data-mobile-nav
                >
                  <Icon className={cn(
                    'mb-1 transition-transform duration-200',
                    active ? 'w-6 h-6 scale-110' : 'w-5 h-5'
                  )} />
                  <span className={cn(
                    'text-xs font-medium transition-all duration-200',
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
                  'flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl transition-all duration-200 touch-manipulation',
                  'active:scale-95 active:bg-opacity-80',
                  isPlusButton
                    ? 'text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
                aria-label={isPlusButton ? 'Open add menu' : `Open ${item.label} menu`}
                role="button"
                data-mobile-nav
              >
                <Icon className={cn(
                  'mb-1 transition-transform duration-200',
                  isPlusButton ? 'w-6 h-6' : 'w-5 h-5'
                )} />
                <span className={cn(
                  'text-xs font-medium transition-all duration-200',
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