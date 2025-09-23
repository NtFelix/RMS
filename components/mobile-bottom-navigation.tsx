'use client'

import React from 'react'
import Link from 'next/link'
import { BarChart3, Users, Search as SearchIcon, Wallet, Menu } from 'lucide-react'
import { useSidebarActiveState } from '@/hooks/use-active-state-manager'
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

  // Define dropdown items to check for "More" button active state
  const dropdownRoutes = ['/haeuser', '/wohnungen', '/betriebskosten', '/todos', '/dateien']
  
  // Check if any dropdown route is active to highlight "More" button
  const isMoreActive = dropdownRoutes.some(route => isRouteActive(route))

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background border-t border-border",
        "md:hidden",
        className
      )}
      role="navigation"
      aria-label="Mobile navigation"
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
          
          // If item has href, render as Link, otherwise as button
          const Component = item.href ? Link : 'button'
          const componentProps = item.href 
            ? { href: item.href }
            : { onClick: item.onClick }
          
          return (
            <Component
              key={item.id}
              {...componentProps}
              className={cn(
                "flex flex-col items-center justify-center",
                "min-h-[44px] min-w-[44px] px-2 py-1",
                "transition-colors duration-200",
                "rounded-md",
                // Active state styling using application color scheme
                isActive 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
              )}
              aria-label={item.title}
              aria-current={isActive ? "page" : undefined}
            >
              <IconComponent className={cn(
                "w-5 h-5 mb-1 transition-transform duration-200",
                isActive && "scale-110"
              )} />
              <span className={cn(
                "text-xs transition-all duration-200",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {item.title}
              </span>
            </Component>
          )
        })}
      </div>
    </nav>
  )
}

// Export interfaces for use in other components
export type { NavigationItem, DropdownItem }