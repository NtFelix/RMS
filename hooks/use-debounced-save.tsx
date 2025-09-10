/**
 * Debounced saving hook for template editor
 * Provides automatic saving with debouncing to prevent excessive API calls
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from './use-toast'

export interface DebouncedSaveOptions {
  delay: number
  maxDelay: number
  saveOnUnmount: boolean
  showSaveIndicator: boolean
}

export interface DebouncedSaveState {
  isDirty: boolean
  isSaving: boolean
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  saveError: string | null
}

export interface DebouncedSaveActions {
  markDirty: () => void
  saveNow: () => Promise<void>
  discardChanges: () => void
  resetSaveState: () => void
}

/**
 * Hook for debounced saving with automatic save indicators
 */
export function useDebouncedSave<T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  options: Partial<DebouncedSaveOptions> = {}
): DebouncedSaveState & DebouncedSaveActions {
  const opts: DebouncedSaveOptions = {
    delay: 2000, // 2 seconds default
    maxDelay: 10000, // 10 seconds max delay
    saveOnUnmount: true,
    showSaveIndicator: true,
    ...options
  }

  const { toast } = useToast()
  
  // State
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Refs for managing timers and data
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastDataRef = useRef<T>(data)
  const firstDirtyTimeRef = useRef<Date | null>(null)
  const saveInProgressRef = useRef(false)

  /**
   * Clear all timers
   */
  const clearTimers = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    if (maxDelayTimeoutRef.current) {
      clearTimeout(maxDelayTimeoutRef.current)
      maxDelayTimeoutRef.current = null
    }
  }, [])

  /**
   * Perform the actual save operation
   */
  const performSave = useCallback(async (dataToSave: T) => {
    if (saveInProgressRef.current) {
      return // Prevent concurrent saves
    }

    saveInProgressRef.current = true
    setIsSaving(true)
    setSaveError(null)

    try {
      await saveFunction(dataToSave)
      setLastSaved(new Date())
      setIsDirty(false)
      firstDirtyTimeRef.current = null
      
      if (opts.showSaveIndicator) {
        toast({
          title: "Automatisch gespeichert",
          description: "Ihre Änderungen wurden gespeichert.",
          duration: 2000,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
      setSaveError(errorMessage)
      
      if (opts.showSaveIndicator) {
        toast({
          title: "Speichern fehlgeschlagen",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        })
      }
      
      console.error('Debounced save failed:', error)
    } finally {
      setIsSaving(false)
      saveInProgressRef.current = false
    }
  }, [saveFunction, opts.showSaveIndicator, toast])

  /**
   * Schedule a save operation
   */
  const scheduleSave = useCallback((dataToSave: T) => {
    clearTimers()

    // Set up regular debounced save
    saveTimeoutRef.current = setTimeout(() => {
      performSave(dataToSave)
    }, opts.delay)

    // Set up max delay save if this is the first change
    if (!firstDirtyTimeRef.current) {
      firstDirtyTimeRef.current = new Date()
      maxDelayTimeoutRef.current = setTimeout(() => {
        performSave(dataToSave)
      }, opts.maxDelay)
    }
  }, [performSave, opts.delay, opts.maxDelay, clearTimers])

  /**
   * Mark data as dirty and schedule save
   */
  const markDirty = useCallback(() => {
    if (!isDirty) {
      setIsDirty(true)
      setSaveError(null)
    }
    scheduleSave(data)
  }, [isDirty, data, scheduleSave])

  /**
   * Save immediately
   */
  const saveNow = useCallback(async () => {
    clearTimers()
    await performSave(data)
  }, [data, performSave, clearTimers])

  /**
   * Discard changes and reset state
   */
  const discardChanges = useCallback(() => {
    clearTimers()
    setIsDirty(false)
    setSaveError(null)
    firstDirtyTimeRef.current = null
    lastDataRef.current = data
  }, [data, clearTimers])

  /**
   * Reset save state
   */
  const resetSaveState = useCallback(() => {
    clearTimers()
    setIsDirty(false)
    setIsSaving(false)
    setSaveError(null)
    setLastSaved(null)
    firstDirtyTimeRef.current = null
    lastDataRef.current = data
  }, [data, clearTimers])

  // Effect to detect data changes
  useEffect(() => {
    const currentData = JSON.stringify(data)
    const lastData = JSON.stringify(lastDataRef.current)
    
    if (currentData !== lastData && !saveInProgressRef.current) {
      lastDataRef.current = data
      markDirty()
    }
  }, [data, markDirty])

  // Effect to save on unmount if needed
  useEffect(() => {
    return () => {
      if (opts.saveOnUnmount && isDirty && !saveInProgressRef.current) {
        // Fire and forget save on unmount
        performSave(data).catch(error => {
          console.error('Failed to save on unmount:', error)
        })
      }
      clearTimers()
    }
  }, [opts.saveOnUnmount, isDirty, data, performSave, clearTimers])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  return {
    // State
    isDirty,
    isSaving,
    lastSaved,
    hasUnsavedChanges: isDirty || isSaving,
    saveError,
    
    // Actions
    markDirty,
    saveNow,
    discardChanges,
    resetSaveState
  }
}

/**
 * Hook for template editor with debounced saving
 */
export function useTemplateEditorSave(
  templateId: string | undefined,
  templateData: { titel: string; inhalt: object; kategorie: string },
  updateFunction: (id: string, data: any) => Promise<void>,
  options: Partial<DebouncedSaveOptions> = {}
) {
  const saveFunction = useCallback(async (data: typeof templateData) => {
    if (!templateId) {
      throw new Error('Cannot save template without ID')
    }
    
    await updateFunction(templateId, {
      titel: data.titel,
      inhalt: data.inhalt,
      kategorie: data.kategorie
    })
  }, [templateId, updateFunction])

  return useDebouncedSave(templateData, saveFunction, {
    delay: 3000, // 3 seconds for template editor
    maxDelay: 15000, // 15 seconds max delay
    saveOnUnmount: true,
    showSaveIndicator: true,
    ...options
  })
}

/**
 * Save indicator component
 */
export interface SaveIndicatorProps {
  saveState: DebouncedSaveState
  className?: string
}

export function SaveIndicator({ saveState, className = '' }: SaveIndicatorProps) {
  const { isDirty, isSaving, lastSaved, saveError } = saveState

  if (saveError) {
    return (
      <div className={`flex items-center text-red-600 text-sm ${className}`}>
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Speichern fehlgeschlagen
      </div>
    )
  }

  if (isSaving) {
    return (
      <div className={`flex items-center text-blue-600 text-sm ${className}`}>
        <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Speichert...
      </div>
    )
  }

  if (isDirty) {
    return (
      <div className={`flex items-center text-orange-600 text-sm ${className}`}>
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        Nicht gespeicherte Änderungen
      </div>
    )
  }

  if (lastSaved) {
    const timeAgo = Math.floor((Date.now() - lastSaved.getTime()) / 1000)
    const timeText = timeAgo < 60 
      ? 'gerade eben' 
      : timeAgo < 3600 
        ? `vor ${Math.floor(timeAgo / 60)} Min.`
        : `vor ${Math.floor(timeAgo / 3600)} Std.`

    return (
      <div className={`flex items-center text-green-600 text-sm ${className}`}>
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Gespeichert {timeText}
      </div>
    )
  }

  return null
}