'use client'

import React from 'react'
import { BarChart3, Users, Search as SearchIcon, Wallet, Menu } from 'lucide-react'

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
      onClick: () => {
        // Search functionality will be implemented in task 5
        console.log('Search clicked')
      }
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
      onClick: () => {
        // More dropdown functionality will be implemented in task 4
        console.log('More clicked')
      }
    }
  ]

  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0 z-50
        bg-white border-t border-gray-200
        md:hidden
        ${className || ''}
      `}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-2 h-16">
        {primaryNavItems.map((item) => {
          const IconComponent = item.icon
          
          return (
            <button
              key={item.id}
              className="
                flex flex-col items-center justify-center
                min-h-[44px] min-w-[44px] px-2 py-1
                text-gray-600 hover:text-gray-900
                transition-colors duration-200
                rounded-md hover:bg-gray-100
              "
              onClick={item.onClick}
              aria-label={item.title}
            >
              <IconComponent className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.title}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// Export interfaces for use in other components
export type { NavigationItem, DropdownItem }