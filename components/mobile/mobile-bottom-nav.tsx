'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Building2, Plus, Building, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

// TypeScript interfaces for navigation props
export interface NavItem {
  id: string
  label: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  action?: 'navigation' | 'dropdown' | 'add-menu'
}

export interface MobileBottomNavProps {
  currentPath: string
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

  // Don't render on desktop
  if (!isMobile) {
    return null
  }

  const isActive = (href?: string) => {
    if (!href) return false
    return pathname === href || pathname.startsWith(href)
  }

  const handleItemClick = (item: NavItem) => {
    // Handle different action types
    switch (item.action) {
      case 'add-menu':
        // TODO: Open add menu dropdown
        console.log('Open add menu')
        break
      case 'dropdown':
        // TODO: Open more menu dropdown
        console.log('Open more menu')
        break
      case 'navigation':
      default:
        // Navigation handled by Link component
        break
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
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
                  'flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 py-1 rounded-lg transition-colors',
                  active 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          }

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                'flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 py-1 rounded-lg transition-colors',
                isPlusButton
                  ? 'text-white bg-blue-600 hover:bg-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <Icon className={cn('w-5 h-5 mb-1', isPlusButton && 'w-6 h-6')} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}