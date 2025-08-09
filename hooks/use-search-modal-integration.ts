import { useEffect, useRef } from 'react'
import { useModalStore } from './use-modal-store'
import { toast } from './use-toast'

interface SearchModalIntegrationOptions {
  onEntityUpdated?: (entityType: string, entityName: string) => void
  onCacheInvalidate?: (entityType: string) => void
}

/**
 * Hook to integrate search functionality with modal operations
 * Provides callbacks for when entities are updated through modals
 */
export function useSearchModalIntegration(options: SearchModalIntegrationOptions = {}) {
  const modalStore = useModalStore()
  const previousModalStates = useRef({
    isTenantModalOpen: false,
    isHouseModalOpen: false,
    isWohnungModalOpen: false,
    isFinanceModalOpen: false,
    isAufgabeModalOpen: false,
  })

  // Track modal state changes to detect when modals are closed after successful operations
  useEffect(() => {
    const currentStates = {
      isTenantModalOpen: modalStore.isTenantModalOpen,
      isHouseModalOpen: modalStore.isHouseModalOpen,
      isWohnungModalOpen: modalStore.isWohnungModalOpen,
      isFinanceModalOpen: modalStore.isFinanceModalOpen,
      isAufgabeModalOpen: modalStore.isAufgabeModalOpen,
    }

    // Check if any modal was closed (was open, now closed)
    Object.entries(currentStates).forEach(([modalKey, isOpen]) => {
      const wasOpen = previousModalStates.current[modalKey as keyof typeof previousModalStates.current]
      
      if (wasOpen && !isOpen) {
        // Modal was closed, check if it was a successful operation
        // For tenant modal, we can't directly detect success, but we can assume
        // if the modal was dirty and is now closed without being forced, it was likely successful
        const wasDirty = getModalDirtyState(modalKey)
        
        if (!wasDirty) {
          // Modal was closed and wasn't dirty, likely a successful operation
          const entityInfo = getEntityInfoFromModalKey(modalKey)
          if (entityInfo) {
            options.onEntityUpdated?.(entityInfo.type, entityInfo.name)
            options.onCacheInvalidate?.(entityInfo.type)
          }
        }
      }
    })

    // Update previous states
    previousModalStates.current = currentStates
  }, [
    modalStore.isTenantModalOpen,
    modalStore.isHouseModalOpen,
    modalStore.isWohnungModalOpen,
    modalStore.isFinanceModalOpen,
    modalStore.isAufgabeModalOpen,
    options
  ])

  const getModalDirtyState = (modalKey: string): boolean => {
    switch (modalKey) {
      case 'isTenantModalOpen':
        return modalStore.isTenantModalDirty
      case 'isHouseModalOpen':
        return modalStore.isHouseModalDirty
      case 'isWohnungModalOpen':
        return modalStore.isWohnungModalDirty
      case 'isFinanceModalOpen':
        return modalStore.isFinanceModalDirty
      case 'isAufgabeModalOpen':
        return modalStore.isAufgabeModalDirty
      default:
        return false
    }
  }

  const getEntityInfoFromModalKey = (modalKey: string): { type: string; name: string } | null => {
    switch (modalKey) {
      case 'isTenantModalOpen':
        return { type: 'mieter', name: 'Mieter' }
      case 'isHouseModalOpen':
        return { type: 'haeuser', name: 'Haus' }
      case 'isWohnungModalOpen':
        return { type: 'wohnungen', name: 'Wohnung' }
      case 'isFinanceModalOpen':
        return { type: 'finanzen', name: 'Finanzeintrag' }
      case 'isAufgabeModalOpen':
        return { type: 'todos', name: 'Aufgabe' }
      default:
        return null
    }
  }

  return {
    // Helper function to manually trigger entity update (for use in modal success callbacks)
    triggerEntityUpdate: (entityType: string, entityName: string) => {
      options.onEntityUpdated?.(entityType, entityName)
      options.onCacheInvalidate?.(entityType)
    }
  }
}