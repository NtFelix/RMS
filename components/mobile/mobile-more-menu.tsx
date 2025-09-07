'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, DollarSign, Calculator, CheckSquare, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMobileNavigation } from '@/hooks/use-mobile-nav-store'
import { useOrientation } from '@/hooks/use-orientation'

export interface MoreMenuItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export interface MobileMoreMenuProps {
  isOpen: boolean
  currentPath?: string
}

export function MobileMoreMenu({ isOpen, currentPath }: MobileMoreMenuProps) {
  const pathname = usePathname()
  const { closeMoreMenu } = useMobileNavigation()
  const { orientation } = useOrientation()

  // More menu items configuration
  const moreMenuItems: MoreMenuItem[] = [
    {
      id: 'mieter',
      label: 'Mieter',
      href: '/mieter',
      icon: Users
    },
    {
      id: 'finanzen',
      label: 'Finanzen',
      href: '/finanzen',
      icon: DollarSign
    },
    {
      id: 'betriebskosten',
      label: 'Betriebskosten',
      href: '/betriebskosten',
      icon: Calculator
    },
    {
      id: 'todos',
      label: 'Todos',
      href: '/todos',
      icon: CheckSquare
    }
  ]

  // Check if a menu item is active
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeMoreMenu()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Weitere Navigation"
    >
      {/* Dropdown Menu */}
      <div 
        className={cn(
          "fixed bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300",
          // Orientation-aware positioning
          orientation === 'landscape' 
            ? "bottom-16 left-8 right-8 max-h-[60vh]" // Higher position and more padding in landscape
            : "bottom-20 left-4 right-4 max-h-[70vh]" // Standard position in portrait
        )}
        data-mobile-dropdown
        data-orientation={orientation}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            Weitere
          </h3>
          <button
            onClick={closeMoreMenu}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors touch-manipulation"
            aria-label="Menü schließen"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Menu Items */}
        <div className={cn(
          "overflow-y-auto",
          orientation === 'landscape' ? "p-1" : "p-2" // Tighter padding in landscape
        )}>
          {moreMenuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={closeMoreMenu} // Close menu when navigating
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl transition-all duration-200 touch-manipulation',
                  'hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98]',
                  'text-left',
                  // Orientation-aware padding
                  orientation === 'landscape' ? 'p-3' : 'p-4',
                  active 
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' 
                    : 'text-gray-700 hover:text-gray-900'
                )}
                aria-label={`Navigate to ${item.label}`}
              >
                <div className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200',
                  active 
                    ? 'bg-blue-100' 
                    : 'bg-gray-50'
                )}>
                  <Icon className={cn(
                    'w-5 h-5 transition-colors duration-200',
                    active ? 'text-blue-600' : 'text-gray-600'
                  )} />
                </div>
                <span className={cn(
                  'font-medium transition-all duration-200',
                  active ? 'font-semibold' : 'font-normal'
                )}>
                  {item.label}
                </span>
                {active && (
                  <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}