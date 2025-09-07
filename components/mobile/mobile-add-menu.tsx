'use client'

import React from 'react'
import { Building2, Building, Users, DollarSign, CheckSquare, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModalStore } from '@/hooks/use-modal-store'

export interface AddMenuItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
}

export interface MobileAddMenuProps {
  isOpen: boolean
  onClose: () => void
}

export type AddItemType = 'house' | 'apartment' | 'tenant' | 'finance' | 'task'

export function MobileAddMenu({ isOpen, onClose }: MobileAddMenuProps) {
  const {
    openHouseModal,
    openWohnungModal,
    openTenantModal,
    openFinanceModal,
    openAufgabeModal
  } = useModalStore()

  // Add menu items configuration
  const addMenuItems: AddMenuItem[] = [
    {
      id: 'house',
      label: 'Haus hinzufügen',
      icon: Building2,
      action: () => {
        openHouseModal()
        onClose()
      }
    },
    {
      id: 'apartment',
      label: 'Wohnung hinzufügen',
      icon: Building,
      action: () => {
        openWohnungModal()
        onClose()
      }
    },
    {
      id: 'tenant',
      label: 'Mieter hinzufügen',
      icon: Users,
      action: () => {
        openTenantModal()
        onClose()
      }
    },
    {
      id: 'finance',
      label: 'Finanzen hinzufügen',
      icon: DollarSign,
      action: () => {
        openFinanceModal()
        onClose()
      }
    },
    {
      id: 'task',
      label: 'Aufgabe hinzufügen',
      icon: CheckSquare,
      action: () => {
        openAufgabeModal()
        onClose()
      }
    }
  ]

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

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
      <div className="fixed bottom-20 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            Hinzufügen
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors touch-manipulation"
            aria-label="Menü schließen"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-2">
          {addMenuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={item.action}
                className={cn(
                  'w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200 touch-manipulation',
                  'hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98]',
                  'text-left text-gray-700 hover:text-gray-900'
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