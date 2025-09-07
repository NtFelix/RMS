'use client'

import React from 'react'
import { Building2, Building, Users, DollarSign, CheckSquare, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModalStore } from '@/hooks/use-modal-store'
import { useMobileNavigation } from '@/hooks/use-mobile-nav-store'
import { useOrientation } from '@/hooks/use-orientation'

export interface AddMenuItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
}

export interface MobileAddMenuProps {
  isOpen: boolean
}

export type AddItemType = 'house' | 'apartment' | 'tenant' | 'finance' | 'task'

export function MobileAddMenu({ isOpen }: MobileAddMenuProps) {
  const {
    openHouseModal,
    openWohnungModal,
    openTenantModal,
    openFinanceModal,
    openAufgabeModal
  } = useModalStore()
  
  const { closeAddMenu } = useMobileNavigation()
  const { orientation } = useOrientation()

  // Add menu items configuration
  const addMenuItems: AddMenuItem[] = [
    {
      id: 'house',
      label: 'Haus hinzufügen',
      icon: Building2,
      action: () => {
        openHouseModal()
        closeAddMenu()
      }
    },
    {
      id: 'apartment',
      label: 'Wohnung hinzufügen',
      icon: Building,
      action: () => {
        openWohnungModal()
        closeAddMenu()
      }
    },
    {
      id: 'tenant',
      label: 'Mieter hinzufügen',
      icon: Users,
      action: () => {
        openTenantModal()
        closeAddMenu()
      }
    },
    {
      id: 'finance',
      label: 'Finanzen hinzufügen',
      icon: DollarSign,
      action: () => {
        openFinanceModal()
        closeAddMenu()
      }
    },
    {
      id: 'task',
      label: 'Aufgabe hinzufügen',
      icon: CheckSquare,
      action: () => {
        openAufgabeModal()
        closeAddMenu()
      }
    }
  ]

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeAddMenu()
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
      aria-label="Hinzufügen Menü"
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
            Hinzufügen
          </h3>
          <button
            onClick={closeAddMenu}
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
          {addMenuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={item.action}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl transition-all duration-200 touch-manipulation',
                  'hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98]',
                  'text-left text-gray-700 hover:text-gray-900',
                  // Orientation-aware padding
                  orientation === 'landscape' ? 'p-3' : 'p-4'
                )}
                aria-label={item.label}
              >
                <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium">
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}