/**
 * Optimized Editor Initialization Hook
 * 
 * Provides optimized initialization for TipTap editor with loading states,
 * progress tracking, and performance monitoring.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, Editor } from '@tiptap/react'
import { usePerformanceMonitor } from './use-editor-performance'
import { parseTemplateContent, type TiptapContent, type ParseResult } from '@/lib/template-content-parser'

export interface InitializationStep {
  id: string
  label: string
  completed: boolean
  error?: boolean
  startTime?: number
  endTime?: number
}

export interface EditorInitializationState {
  stage: 'idle' | 'initializing' | 'parsing' | 'rendering' | 'ready' | 'error'
  progress: number
  steps: InitializationStep[]
  currentStep?: string
  error?: string
  metrics: {
    totalTime?: number
    initTime?: number
    parseTime?: number
    renderTime?: number
  }
}

export interface UseOptimizedEditorInitializationOptions {
  extensions: any[]
  initialContent?: any
  editable?: boolean
  onUpdate?: (props: { editor: Editor }) => void
  editorProps?: any
  enablePerformanceMonitoring?: boolean
  onStateChange?: (state: EditorInitializationState) => void
  parseContentAsync?: boolean
  deferRendering?: boolean
}

export function useOptimizedEditorInitialization({
  extensions,
  initialContent,
  editable = true,
  onUpdate,
  editorProps,
  enablePerformanceMonitoring = false,
  onStateChange,
  parseContentAsync = true,
  deferRendering = false
}: UseOptimizedEditorInitializationOptions) {
  const [state, setState] = useState<EditorInitializationState>({
    stage: 'idle',
    progress: 0,
    steps: [
      { id: 'extensions', label: 'Extensions laden', completed: false },
      { id: 'parsing', label: 'Inhalt verarbeiten', completed: false },
      { id: 'editor', label: 'Editor initialisieren', completed: false },
      { id: 'content', label: 'Inhalt setzen', completed: false },
      { id: 'rendering', label: 'Interface rendern', completed: false }
    ],
    metrics: {}
  })

  const [parsedContent, setParsedContent] = useState<TiptapContent | null>(null)
  const [contentError, setContentError] = useState<string | null>(null)
  
  const initStartTimeRef = useRef<number>(0)
  const stepTimesRef = useRef<Map<string, { start: number; end?: number }>>(new Map())
  const editorRef = useRef<Editor | null>(null)
  const isInitializingRef = useRef(false)
  
  const performanceMonitor = usePerformanceMonitor(
    'OptimizedEditorInitialization',
    enablePerformanceMonitoring
  )

  // Update state and notify parent
  const updateState = useCallback((updates: Partial<EditorInitializationState>) => {
    setState(prevState => {
      const newState = { ...prevState, ...updates }
      onStateChange?.(newState)
      return newState
    })
  }, [onStateChange])

  // Mark step as started
  const startStep = useCallback((stepId: string) => {
    const startTime = performance.now()
    stepTimesRef.current.set(stepId, { start: startTime })
    
    updateState({
      currentStep: stepId,
      steps: state.steps.map(step => 
        step.id === stepId 
          ? { ...step, startTime, completed: false, error: false }
          : step
      )
    })
  }, [state.steps, updateState])

  // Mark step as completed
  const completeStep = useCallback((stepId: string, error?: boolean) => {
    const endTime = performance.now()
    const stepTime = stepTimesRef.current.get(stepId)
    
    if (stepTime) {
      stepTime.end = endTime
      stepTimesRef.current.set(stepId, stepTime)
    }
    
    updateState({
      steps: state.steps.map(step => 
        step.id === stepId 
          ? { ...step, completed: !error, error, endTime }
          : step
      ),
      progress: Math.min(100, state.progress + 20)
    })
  }, [state.steps, state.progress, updateState])

  // Parse content asynchronously
  const parseContent = useCallback(async (): Promise<TiptapContent> => {
    return new Promise((resolve) => {
      if (parseContentAsync) {
        // Use setTimeout to make parsing async and allow UI updates
        setTimeout(() => {
          try {
            const parseResult: ParseResult = parseTemplateContent(initialContent)
            
            if (parseResult.success) {
              setParsedContent(parseResult.content)
              setContentError(null)
              resolve(parseResult.content)
            } else {
              const errorMessage = parseResult.errors.join(', ')
              setContentError(errorMessage)
              setParsedContent(parseResult.content) // Use fallback content
              resolve(parseResult.content)
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error'
            setContentError(errorMessage)
            
            const fallbackContent: TiptapContent = {
              type: 'doc',
              content: [{ type: 'paragraph', content: [] }]
            }
            setParsedContent(fallbackContent)
            resolve(fallbackContent)
          }
        }, 0)
      } else {
        // Synchronous parsing
        try {
          const parseResult: ParseResult = parseTemplateContent(initialContent)
          
          if (parseResult.success) {
            setParsedContent(parseResult.content)
            setContentError(null)
            resolve(parseResult.content)
          } else {
            const errorMessage = parseResult.errors.join(', ')
            setContentError(errorMessage)
            setParsedContent(parseResult.content)
            resolve(parseResult.content)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error'
          setContentError(errorMessage)
          
          const fallbackContent: TiptapContent = {
            type: 'doc',
            content: [{ type: 'paragraph', content: [] }]
          }
          setParsedContent(fallbackContent)
          resolve(fallbackContent)
        }
      }
    })
  }, [initialContent, parseContentAsync])

  // Initialize editor with optimized steps
  const initializeEditor = useCallback(async () => {
    if (isInitializingRef.current) return
    
    isInitializingRef.current = true
    initStartTimeRef.current = performance.now()
    
    try {
      updateState({ 
        stage: 'initializing', 
        progress: 0,
        error: undefined
      })

      // Step 1: Prepare extensions
      startStep('extensions')
      await new Promise(resolve => setTimeout(resolve, 10)) // Allow UI update
      completeStep('extensions')

      // Step 2: Parse content
      updateState({ stage: 'parsing' })
      startStep('parsing')
      
      const parseStartTime = performance.now()
      const content = await parseContent()
      const parseTime = performance.now() - parseStartTime
      performanceMonitor.recordParseTime(parseTime)
      
      completeStep('parsing', !!contentError)

      // Step 3: Initialize editor
      updateState({ stage: 'rendering' })
      startStep('editor')
      
      const editorConfig = {
        immediatelyRender: false,
        extensions,
        content,
        editable,
        onUpdate,
        editorProps
      }

      // Create editor instance
      const editor = new Editor(editorConfig)
      editorRef.current = editor
      
      completeStep('editor')

      // Step 4: Set content (if different from initial)
      startStep('content')
      
      if (deferRendering) {
        // Defer content setting to next tick
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      
      completeStep('content')

      // Step 5: Final rendering
      startStep('rendering')
      
      const renderStartTime = performance.now()
      await new Promise(resolve => setTimeout(resolve, 10)) // Allow final render
      const renderTime = performance.now() - renderStartTime
      performanceMonitor.recordRenderTime(renderTime)
      
      completeStep('rendering')

      // Calculate total time
      const totalTime = performance.now() - initStartTimeRef.current
      performanceMonitor.recordInitTime(totalTime)

      updateState({
        stage: 'ready',
        progress: 100,
        currentStep: undefined,
        metrics: {
          totalTime,
          parseTime,
          renderTime,
          initTime: totalTime
        }
      })

      return editor

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error'
      
      updateState({
        stage: 'error',
        error: errorMessage,
        currentStep: undefined
      })
      
      console.error('Editor initialization failed:', error)
      throw error
      
    } finally {
      isInitializingRef.current = false
    }
  }, [
    extensions,
    editable,
    onUpdate,
    editorProps,
    parseContent,
    contentError,
    deferRendering,
    performanceMonitor,
    updateState,
    startStep,
    completeStep
  ])

  // Create editor using useEditor hook with initialization
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [],
    content: null,
    onCreate: ({ editor }) => {
      // Editor created, but we'll initialize it manually
    }
  }, [])

  // Initialize when dependencies change
  useEffect(() => {
    if (extensions.length > 0) {
      initializeEditor().then(initializedEditor => {
        if (initializedEditor && editor) {
          // Transfer the initialized editor state
          editor.commands.setContent(initializedEditor.getJSON())
        }
      }).catch(error => {
        console.error('Failed to initialize editor:', error)
      })
    }
  }, [extensions, initialContent, initializeEditor, editor])

  // Cleanup
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy()
        editorRef.current = null
      }
    }
  }, [])

  return {
    editor: state.stage === 'ready' ? editor : null,
    state,
    parsedContent,
    contentError,
    isReady: state.stage === 'ready',
    isLoading: ['initializing', 'parsing', 'rendering'].includes(state.stage),
    hasError: state.stage === 'error' || !!contentError,
    metrics: {
      ...state.metrics,
      ...performanceMonitor.getMetrics()
    },
    reinitialize: initializeEditor
  }
}

// Hook for managing editor updates with optimization
export function useOptimizedEditorUpdates(
  editor: Editor | null,
  content: any,
  options: {
    debounceDelay?: number
    compareContent?: boolean
    onContentChange?: (content: any) => void
  } = {}
) {
  const {
    debounceDelay = 150,
    compareContent = true,
    onContentChange
  } = options

  const lastContentRef = useRef<string>('')
  const updateTimeoutRef = useRef<NodeJS.Timeout>()
  const isUpdatingRef = useRef(false)

  const updateContent = useCallback((newContent: any) => {
    if (!editor || isUpdatingRef.current) return

    const contentString = JSON.stringify(newContent)
    
    // Skip update if content hasn't changed
    if (compareContent && contentString === lastContentRef.current) {
      return
    }

    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    // Debounce the update
    updateTimeoutRef.current = setTimeout(() => {
      try {
        isUpdatingRef.current = true
        lastContentRef.current = contentString
        
        const success = editor.commands.setContent(newContent)
        
        if (success) {
          onContentChange?.(newContent)
        } else {
          console.warn('Failed to update editor content')
        }
      } catch (error) {
        console.error('Error updating editor content:', error)
      } finally {
        isUpdatingRef.current = false
      }
    }, debounceDelay)
  }, [editor, debounceDelay, compareContent, onContentChange])

  // Update content when it changes
  useEffect(() => {
    if (content) {
      updateContent(content)
    }
  }, [content, updateContent])

  // Cleanup
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  return {
    updateContent,
    isUpdating: isUpdatingRef.current
  }
}