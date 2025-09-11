"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'

interface OfflineState {
  isOffline: boolean
  isConnecting: boolean
  lastOnlineTime: Date | null
  pendingOperations: PendingOperation[]
}

interface PendingOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  templateData: any
  timestamp: Date
  retryCount: number
}

interface UseTemplateOfflineDetectionOptions {
  enableOfflineQueue?: boolean
  maxRetries?: number
  retryDelay?: number
  onConnectionRestored?: () => void
  onConnectionLost?: () => void
}

/**
 * Hook for detecting offline status and managing offline template operations
 */
export function useTemplateOfflineDetection(options: UseTemplateOfflineDetectionOptions = {}) {
  const {
    enableOfflineQueue = true,
    maxRetries = 3,
    retryDelay = 2000,
    onConnectionRestored,
    onConnectionLost
  } = options

  const [state, setState] = useState<OfflineState>({
    isOffline: false,
    isConnecting: false,
    lastOnlineTime: null,
    pendingOperations: []
  })

  const { toast } = useToast()
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Check if we're actually online by making a small network request
   */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Use a small request to check connectivity
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      return response.ok
    } catch {
      return false
    }
  }, [])

  /**
   * Handle going online
   */
  const handleOnline = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true }))

    // Verify we're actually online
    const isActuallyOnline = await checkConnection()
    
    if (isActuallyOnline) {
      setState(prev => ({
        ...prev,
        isOffline: false,
        isConnecting: false,
        lastOnlineTime: new Date()
      }))

      // Process pending operations if offline queue is enabled
      if (enableOfflineQueue && state.pendingOperations.length > 0) {
        processPendingOperations()
      }

      // Show connection restored notification
      toast({
        title: "Verbindung wiederhergestellt",
        description: "Ihre Änderungen werden jetzt synchronisiert.",
        duration: 3000,
      })

      onConnectionRestored?.()
    } else {
      // Still offline, keep checking
      setState(prev => ({ ...prev, isConnecting: false }))
      scheduleConnectionCheck()
    }
  }, [checkConnection, enableOfflineQueue, state.pendingOperations, toast, onConnectionRestored])

  /**
   * Handle going offline
   */
  const handleOffline = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOffline: true,
      isConnecting: false
    }))

    toast({
      title: "Verbindung unterbrochen",
      description: enableOfflineQueue 
        ? "Ihre Änderungen werden lokal gespeichert und später synchronisiert."
        : "Bitte überprüfen Sie Ihre Internetverbindung.",
      variant: "destructive",
      duration: 5000,
    })

    onConnectionLost?.()
  }, [enableOfflineQueue, toast, onConnectionLost])

  /**
   * Schedule a connection check
   */
  const scheduleConnectionCheck = useCallback(() => {
    if (connectionCheckRef.current) {
      clearTimeout(connectionCheckRef.current)
    }

    connectionCheckRef.current = setTimeout(async () => {
      if (state.isOffline) {
        const isOnline = await checkConnection()
        if (isOnline) {
          handleOnline()
        } else {
          scheduleConnectionCheck() // Keep checking
        }
      }
    }, retryDelay)
  }, [state.isOffline, checkConnection, handleOnline, retryDelay])

  /**
   * Add operation to offline queue
   */
  const queueOperation = useCallback((operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>) => {
    if (!enableOfflineQueue) return

    const newOperation: PendingOperation = {
      ...operation,
      id: `${operation.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      retryCount: 0
    }

    setState(prev => ({
      ...prev,
      pendingOperations: [...prev.pendingOperations, newOperation]
    }))

    toast({
      title: "Operation in Warteschlange",
      description: "Die Änderung wird synchronisiert, sobald die Verbindung wiederhergestellt ist.",
      duration: 3000,
    })
  }, [enableOfflineQueue, toast])

  /**
   * Process pending operations when connection is restored
   */
  const processPendingOperations = useCallback(async () => {
    if (state.pendingOperations.length === 0) return

    const operations = [...state.pendingOperations]
    let successCount = 0
    let failedOperations: PendingOperation[] = []

    for (const operation of operations) {
      try {
        // Attempt to execute the operation
        // This would typically call the appropriate API endpoint
        await executeOperation(operation)
        successCount++
      } catch (error) {
        console.error('Failed to execute pending operation:', error)
        
        if (operation.retryCount < maxRetries) {
          failedOperations.push({
            ...operation,
            retryCount: operation.retryCount + 1
          })
        } else {
          // Max retries reached, show error
          toast({
            title: "Synchronisation fehlgeschlagen",
            description: `Operation ${operation.type} konnte nicht ausgeführt werden.`,
            variant: "destructive",
            duration: 5000,
          })
        }
      }
    }

    // Update state with remaining failed operations
    setState(prev => ({
      ...prev,
      pendingOperations: failedOperations
    }))

    if (successCount > 0) {
      toast({
        title: "Synchronisation abgeschlossen",
        description: `${successCount} Änderung${successCount > 1 ? 'en' : ''} erfolgreich synchronisiert.`,
        duration: 3000,
      })
    }

    // Schedule retry for failed operations
    if (failedOperations.length > 0) {
      retryTimeoutRef.current = setTimeout(() => {
        processPendingOperations()
      }, retryDelay * 2) // Longer delay for retries
    }
  }, [state.pendingOperations, maxRetries, retryDelay, toast])

  /**
   * Execute a pending operation
   */
  const executeOperation = useCallback(async (operation: PendingOperation) => {
    const { type, templateData } = operation

    switch (type) {
      case 'create':
        const createResponse = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateData)
        })
        if (!createResponse.ok) throw new Error('Failed to create template')
        break

      case 'update':
        const updateResponse = await fetch(`/api/templates/${templateData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateData)
        })
        if (!updateResponse.ok) throw new Error('Failed to update template')
        break

      case 'delete':
        const deleteResponse = await fetch(`/api/templates/${templateData.id}`, {
          method: 'DELETE'
        })
        if (!deleteResponse.ok) throw new Error('Failed to delete template')
        break

      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  }, [])

  /**
   * Manually retry connection
   */
  const retryConnection = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true }))
    
    const isOnline = await checkConnection()
    
    if (isOnline) {
      handleOnline()
    } else {
      setState(prev => ({ ...prev, isConnecting: false }))
      toast({
        title: "Verbindung fehlgeschlagen",
        description: "Keine Internetverbindung verfügbar. Versuchen Sie es später erneut.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }, [checkConnection, handleOnline, toast])

  /**
   * Clear pending operations (for testing or manual cleanup)
   */
  const clearPendingOperations = useCallback(() => {
    setState(prev => ({ ...prev, pendingOperations: [] }))
  }, [])

  /**
   * Get offline statistics
   */
  const getOfflineStats = useCallback(() => {
    return {
      pendingOperationsCount: state.pendingOperations.length,
      lastOnlineTime: state.lastOnlineTime,
      isOffline: state.isOffline,
      isConnecting: state.isConnecting
    }
  }, [state])

  // Set up event listeners
  useEffect(() => {
    const handleOnlineEvent = () => handleOnline()
    const handleOfflineEvent = () => handleOffline()

    window.addEventListener('online', handleOnlineEvent)
    window.addEventListener('offline', handleOfflineEvent)

    // Check initial online status
    const initialOfflineState = !navigator.onLine
    setState(prev => ({ 
      ...prev, 
      isOffline: initialOfflineState,
      lastOnlineTime: initialOfflineState ? null : new Date()
    }))

    // If initially offline, start checking for connection
    if (initialOfflineState) {
      scheduleConnectionCheck()
    }

    return () => {
      window.removeEventListener('online', handleOnlineEvent)
      window.removeEventListener('offline', handleOfflineEvent)
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (connectionCheckRef.current) {
        clearTimeout(connectionCheckRef.current)
      }
    }
  }, [handleOnline, handleOffline, scheduleConnectionCheck])

  return {
    isOffline: state.isOffline,
    isConnecting: state.isConnecting,
    lastOnlineTime: state.lastOnlineTime,
    pendingOperationsCount: state.pendingOperations.length,
    queueOperation,
    retryConnection,
    clearPendingOperations,
    getOfflineStats
  }
}