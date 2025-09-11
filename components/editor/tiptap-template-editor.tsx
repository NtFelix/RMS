"use client"

import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { SlashCommandExtension } from './slash-command-extension'
import { MentionExtension, MentionItem, PREDEFINED_VARIABLES } from './mention-extension'
import { BubbleMenu } from './bubble-menu'
import { EnhancedToolbar } from './enhanced-toolbar'
import { cn } from '@/lib/utils'
import { useDebouncedSave, SaveIndicator } from '@/hooks/use-debounced-save'
import { useDebounce } from '@/hooks/use-debounce'
import { extractVariablesFromContent } from '@/lib/template-variable-extraction'
import { 
  useOptimizedVariableExtraction, 
  useMemoizedEditorExtensions,
  usePerformanceMonitor 
} from '@/hooks/use-editor-performance'
import { 
  parseTemplateContent, 
  type TiptapContent, 
  type ParseResult 
} from '@/lib/template-content-parser'
import { useToast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { 
  EditorLoadingState, 
  InitializationProgress, 
  ContentLoadingSkeleton,
  PerformanceIndicator 
} from './editor-loading-states'
import { 
  VirtualScrollEditor, 
  contentToVirtualItems,
  useVirtualScroll,
  type VirtualScrollRef 
} from './virtual-scroll-editor'
import { useOptimizedEditorInitialization, useOptimizedEditorUpdates } from '@/hooks/use-optimized-editor-initialization'
import './mention-popup.css'

interface TiptapTemplateEditorProps {
  initialContent?: object
  onContentChange?: (content: object, variables: string[]) => void
  onSave?: () => void
  onCancel?: () => void
  placeholder?: string
  className?: string
  editable?: boolean
  variables?: MentionItem[]
  onVariableInsert?: (variable: MentionItem) => void
  onVariableRemove?: (variableId: string) => void
  // Debounced saving options
  enableAutoSave?: boolean
  autoSaveFunction?: (content: object) => Promise<void>
  showSaveIndicator?: boolean
  // Performance optimization options
  variableExtractionDelay?: number
  contentChangeDelay?: number
  // Bubble menu options
  showBubbleMenu?: boolean
  bubbleMenuClassName?: string
  // Toolbar options
  showToolbar?: boolean
  toolbarClassName?: string
  compactToolbar?: boolean
  showToolbarLabels?: boolean
  showKeyboardShortcuts?: boolean
  enableToolbarCustomization?: boolean
  // Performance and optimization options
  enablePerformanceMonitoring?: boolean
  enableVirtualScrolling?: boolean
  virtualScrollHeight?: number
  optimizeForLargeDocuments?: boolean
  deferInitialization?: boolean
}

export function TiptapTemplateEditor({
  initialContent,
  onContentChange,
  onSave,
  onCancel,
  placeholder = "Beginnen Sie mit der Eingabe oder verwenden Sie '/' für Befehle und '@' für Variablen...",
  className,
  editable = true,
  variables = PREDEFINED_VARIABLES,
  onVariableInsert,
  onVariableRemove,
  enableAutoSave = false,
  autoSaveFunction,
  showSaveIndicator = false,
  variableExtractionDelay = 300,
  contentChangeDelay = 150,
  showBubbleMenu = true,
  bubbleMenuClassName,
  showToolbar = true,
  toolbarClassName,
  compactToolbar = false,
  showToolbarLabels = false,
  showKeyboardShortcuts = true,
  enableToolbarCustomization = false,
  enablePerformanceMonitoring = false,
  enableVirtualScrolling = false,
  virtualScrollHeight = 400,
  optimizeForLargeDocuments = false,
  deferInitialization = false
}: TiptapTemplateEditorProps) {
  const { toast } = useToast()
  
  // State for parsed content and error handling
  const [parsedContent, setParsedContent] = useState<TiptapContent | null>(null)
  const [contentError, setContentError] = useState<string | null>(null)
  const [isContentLoading, setIsContentLoading] = useState(true)
  const [currentContent, setCurrentContent] = useState<TiptapContent>({
    type: 'doc',
    content: [{ type: 'paragraph', content: [] }]
  })
  
  // Refs to prevent infinite loops and track content updates
  const isUpdatingContentRef = useRef(false)
  const lastInitialContentRef = useRef<string | null>(null)
  const editorInitializedRef = useRef(false)

  // Performance monitoring (only in development)
  const performanceMonitor = usePerformanceMonitor(
    'TiptapTemplateEditor', 
    enablePerformanceMonitoring || process.env.NODE_ENV === 'development'
  )

  // Retry function for failed parsing
  const retryParsing = useCallback(() => {
    lastInitialContentRef.current = null
    setContentError(null)
    setIsContentLoading(true)
    
    setTimeout(() => {
      try {
        const parseResult: ParseResult = parseTemplateContent(initialContent)
        
        if (parseResult.success) {
          setParsedContent(parseResult.content)
          setCurrentContent(parseResult.content)
          
          if (parseResult.warnings.length > 0) {
            console.warn('Content parsing warnings:', parseResult.warnings)
            toast({
              title: "Inhalt teilweise wiederhergestellt",
              description: `${parseResult.warnings.length} Warnung(en) beim Laden des Inhalts.`,
              variant: "default"
            })
          }
          
          if (parseResult.wasRecovered) {
            toast({
              title: "Inhalt wiederhergestellt",
              description: "Der Inhalt wurde automatisch repariert und kann möglicherweise von der ursprünglichen Version abweichen.",
              variant: "default"
            })
            setContentError("recovered")
          }
        } else {
          const errorMessage = parseResult.errors.join(', ')
          setContentError(errorMessage)
          setParsedContent(parseResult.content)
          setCurrentContent(parseResult.content)
          
          console.error('Content parsing failed:', parseResult.errors)
          toast({
            title: "Fehler beim Laden des Inhalts",
            description: "Der Inhalt konnte nicht vollständig geladen werden. Ein leeres Dokument wurde erstellt.",
            variant: "destructive",
            action: (
              <ToastAction altText="Erneut versuchen" onClick={retryParsing}>
                Erneut versuchen
              </ToastAction>
            )
          })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
        setContentError(errorMessage)
        console.error('Unexpected error during content parsing:', error)
        
        const fallbackContent: TiptapContent = {
          type: 'doc',
          content: [{ type: 'paragraph', content: [] }]
        }
        setParsedContent(fallbackContent)
        setCurrentContent(fallbackContent)
        
        toast({
          title: "Unerwarteter Fehler",
          description: "Ein unerwarteter Fehler ist beim Laden des Inhalts aufgetreten.",
          variant: "destructive"
        })
      } finally {
        setIsContentLoading(false)
      }
    }, 0)
  }, [initialContent, toast])

  // Parse initial content when it changes
  useEffect(() => {
    const parseInitialContent = () => {
      setIsContentLoading(true)
      setContentError(null)
      
      // Use setTimeout to make parsing async for better UX and testing
      setTimeout(() => {
        try {
          // Convert initialContent to string for comparison
          const initialContentString = JSON.stringify(initialContent)
          
          // Skip parsing if content hasn't changed
          if (lastInitialContentRef.current === initialContentString) {
            setIsContentLoading(false)
            return
          }
          
          lastInitialContentRef.current = initialContentString
          
          // Parse the content using RobustContentParser
          const parseResult: ParseResult = parseTemplateContent(initialContent)
          
          if (parseResult.success) {
            setParsedContent(parseResult.content)
            setCurrentContent(parseResult.content)
            
            // Show warnings if any
            if (parseResult.warnings.length > 0) {
              console.warn('Content parsing warnings:', parseResult.warnings)
              toast({
                title: "Inhalt teilweise wiederhergestellt",
                description: `${parseResult.warnings.length} Warnung(en) beim Laden des Inhalts.`,
                variant: "default"
              })
            }
            
            // Show recovery message if content was recovered
            if (parseResult.wasRecovered) {
              toast({
                title: "Inhalt wiederhergestellt",
                description: "Der Inhalt wurde automatisch repariert und kann möglicherweise von der ursprünglichen Version abweichen.",
                variant: "default"
              })
              setContentError("recovered") // Set a flag for warning display
            }
          } else {
            // Handle parsing failure
            const errorMessage = parseResult.errors.join(', ')
            setContentError(errorMessage)
            setParsedContent(parseResult.content) // Use fallback content
            setCurrentContent(parseResult.content)
            
            console.error('Content parsing failed:', parseResult.errors)
            toast({
              title: "Fehler beim Laden des Inhalts",
              description: "Der Inhalt konnte nicht vollständig geladen werden. Ein leeres Dokument wurde erstellt.",
              variant: "destructive",
              action: (
                <ToastAction altText="Erneut versuchen" onClick={retryParsing}>
                  Erneut versuchen
                </ToastAction>
              )
            })
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
          setContentError(errorMessage)
          console.error('Unexpected error during content parsing:', error)
          
          // Use empty document as fallback
          const fallbackContent: TiptapContent = {
            type: 'doc',
            content: [{ type: 'paragraph', content: [] }]
          }
          setParsedContent(fallbackContent)
          setCurrentContent(fallbackContent)
          
          toast({
            title: "Unerwarteter Fehler",
            description: "Ein unerwarteter Fehler ist beim Laden des Inhalts aufgetreten.",
            variant: "destructive"
          })
        } finally {
          setIsContentLoading(false)
        }
      }, 0)
    }
    
    parseInitialContent()
  }, [initialContent, toast, retryParsing])

  // Debounce content changes to reduce excessive re-renders
  const debouncedContent = useDebounce(currentContent, contentChangeDelay)

  // Set up debounced saving if enabled
  const debouncedSave = useDebouncedSave(
    currentContent,
    autoSaveFunction || (async () => {}),
    {
      delay: 3000, // 3 seconds
      maxDelay: 15000, // 15 seconds max
      saveOnUnmount: true,
      showSaveIndicator: showSaveIndicator && enableAutoSave
    }
  )

  // Optimized variable extraction with caching and debouncing
  const extractedVariables = useOptimizedVariableExtraction(
    debouncedContent,
    extractVariablesFromContent,
    variableExtractionDelay
  )

  // Optimized editor extensions with proper memoization
  const editorExtensions = useMemo(() => [
    StarterKit.configure({
      // Configure the starter kit extensions
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      bulletList: {
        keepMarks: true,
        keepAttributes: false,
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false,
      },
      // Additional formatting options are enabled by default in StarterKit
    }),
    Underline,
    SlashCommandExtension,
    MentionExtension({
      variables,
      onVariableInsert,
      onVariableRemove,
    }),
  ], [variables, onVariableInsert, onVariableRemove])

  // Use optimized editor initialization if enabled
  const optimizedInitialization = useOptimizedEditorInitialization({
    extensions: editorExtensions,
    initialContent: parsedContent,
    editable,
    onUpdate: handleContentChange,
    editorProps: editorProps,
    enablePerformanceMonitoring,
    parseContentAsync: optimizeForLargeDocuments,
    deferRendering: deferInitialization,
    onStateChange: (state) => {
      // Update loading state based on initialization progress
      setIsContentLoading(state.stage !== 'ready')
    }
  })

  // Virtual scrolling setup for large documents
  const virtualScrollItems = useMemo(() => {
    if (enableVirtualScrolling && parsedContent) {
      return contentToVirtualItems(parsedContent, 50)
    }
    return []
  }, [enableVirtualScrolling, parsedContent])

  const virtualScroll = useVirtualScroll(
    virtualScrollItems,
    virtualScrollHeight,
    50
  )

  // Memoized editor props to prevent recreation
  const editorProps = useMemo(() => ({
    attributes: {
      class: cn(
        'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
        'dark:prose-invert prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-gray-100',
        'prose-p:text-gray-700 dark:prose-p:text-gray-300',
        'prose-li:text-gray-700 dark:prose-li:text-gray-300',
        'prose-strong:text-gray-900 dark:prose-strong:text-gray-100',
        'prose-em:text-gray-700 dark:prose-em:text-gray-300',
        'prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400',
        'prose-blockquote:border-l-gray-300 dark:prose-blockquote:border-l-gray-600',
        'min-h-[200px] p-4'
      ),
      'data-placeholder': placeholder,
    },
  }), [placeholder])

  // Optimized content change handler with memoization
  const handleContentChange = useCallback((editor: any) => {
    // Check if editor is properly initialized and has getJSON method
    if (!editor || typeof editor.getJSON !== 'function') {
      console.warn('Editor not properly initialized or missing getJSON method')
      return
    }
    
    try {
      const content = editor.getJSON()
      
      // Update local state for debounced saving
      setCurrentContent(content)
      
      // Mark as dirty for auto-save if enabled
      if (enableAutoSave && autoSaveFunction) {
        debouncedSave.markDirty()
      }
    } catch (error) {
      console.error('Error getting editor content:', error)
    }
  }, [enableAutoSave, autoSaveFunction, debouncedSave])

  // Effect to call onContentChange with optimized variables
  React.useEffect(() => {
    if (onContentChange && !isUpdatingContentRef.current) {
      onContentChange(debouncedContent, extractedVariables)
    }
  }, [debouncedContent, extractedVariables, onContentChange])
  // Memoize the editor configuration to prevent recreation
  const editorConfig = useMemo(() => ({
    immediatelyRender: false, // Fix SSR hydration mismatch
    extensions: editorExtensions,
    content: parsedContent || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    },
    editable,
    onUpdate: handleContentChange,
    editorProps: editorProps,
  }), [editorExtensions, parsedContent, editable, handleContentChange, editorProps])

  // Use either optimized or standard editor initialization
  const standardEditor = useEditor(editorConfig)
  
  // Choose which editor to use based on optimization settings
  const editor = optimizeForLargeDocuments || deferInitialization 
    ? optimizedInitialization.editor 
    : standardEditor

  // Use optimized content updates
  useOptimizedEditorUpdates(editor, parsedContent, {
    debounceDelay: contentChangeDelay,
    compareContent: true,
    onContentChange: (content) => {
      setCurrentContent(content)
    }
  })

  // Update editor content when parsedContent changes (optimized with error handling)
  useEffect(() => {
    if (!editor || !parsedContent || isUpdatingContentRef.current) {
      return
    }
    
    // Wait for editor to be fully initialized
    if (!editorInitializedRef.current) {
      const checkInitialized = () => {
        if (editor && typeof editor.getJSON === 'function') {
          editorInitializedRef.current = true
        }
      }
      checkInitialized()
      if (!editorInitializedRef.current) {
        return
      }
    }
    
    try {
      const currentEditorContent = editor.getJSON()
      const currentContentString = JSON.stringify(currentEditorContent)
      const parsedContentString = JSON.stringify(parsedContent)
      
      // Only update if content is actually different
      if (currentContentString !== parsedContentString) {
        console.log('Updating editor content with parsed content')
        isUpdatingContentRef.current = true
        
        // Use setContent with error handling
        try {
          const success = editor.commands.setContent(parsedContent)
          
          if (!success) {
            console.error('Failed to set editor content')
            toast({
              title: "Fehler beim Aktualisieren",
              description: "Der Editor-Inhalt konnte nicht aktualisiert werden.",
              variant: "destructive"
            })
          }
        } catch (setContentError) {
          console.error('Error in setContent:', setContentError)
          toast({
            title: "Fehler beim Aktualisieren",
            description: "Der Editor-Inhalt konnte nicht aktualisiert werden.",
            variant: "destructive"
          })
        }
        
        // Reset the flag after a short delay
        setTimeout(() => {
          isUpdatingContentRef.current = false
        }, 100)
      }
    } catch (error) {
      console.error('Error updating editor content:', error)
      isUpdatingContentRef.current = false
      
      toast({
        title: "Fehler beim Aktualisieren",
        description: "Ein Fehler ist beim Aktualisieren des Editor-Inhalts aufgetreten.",
        variant: "destructive"
      })
    }
  }, [editor, parsedContent, toast])
  
  // Track when editor is initialized
  useEffect(() => {
    if (editor) {
      editorInitializedRef.current = true
    }
    
    return () => {
      editorInitializedRef.current = false
    }
  }, [editor])

  // Memoized keyboard shortcut handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!editor) return

    // Save shortcut (Ctrl/Cmd + S)
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      onSave?.()
      return
    }

    // Cancel shortcut (Escape)
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel?.()
      return
    }
  }, [editor, onSave, onCancel])

  // Show enhanced loading state while content is being parsed or editor is initializing
  if (!editor || isContentLoading) {
    // Use optimized loading state if available
    if (optimizeForLargeDocuments || deferInitialization) {
      const initState = optimizedInitialization.state
      
      return (
        <div className={cn('min-h-[200px]', className)}>
          <EditorLoadingState
            stage={initState.stage}
            progress={initState.progress}
            message={initState.error}
            error={initState.error}
            showProgress={true}
          />
          
          {initState.steps.length > 0 && (
            <div className="mt-4 flex justify-center">
              <InitializationProgress
                steps={initState.steps}
                currentStep={initState.currentStep}
              />
            </div>
          )}
        </div>
      )
    }
    
    // Standard loading state
    return (
      <div className={cn('min-h-[200px]', className)}>
        <EditorLoadingState
          stage={isContentLoading ? 'parsing' : 'initializing'}
          progress={isContentLoading ? 50 : 25}
          message={isContentLoading ? 'Inhalt wird verarbeitet...' : 'Editor wird initialisiert...'}
        />
      </div>
    )
  }
  
  // Show error state if content parsing failed
  if (contentError && !parsedContent) {
    return (
      <div className={cn('min-h-[200px] flex flex-col items-center justify-center p-4', className)}>
        <div className="text-red-500 dark:text-red-400 text-center mb-4">
          <div className="font-semibold mb-2">Fehler beim Laden des Inhalts</div>
          <div className="text-sm">{contentError}</div>
        </div>
        <button
          onClick={retryParsing}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  return (
    <div 
      className={cn('relative', className)}
      onKeyDown={handleKeyDown}
    >
      {/* Performance indicator for development */}
      {enablePerformanceMonitoring && (
        <PerformanceIndicator 
          metrics={
            optimizeForLargeDocuments || deferInitialization
              ? optimizedInitialization.metrics
              : performanceMonitor.getMetrics()
          }
        />
      )}
      
      {/* Content error/warning indicator */}
      {contentError === "recovered" && (
        <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Warnung:</strong> Der Inhalt wurde automatisch repariert und kann von der ursprünglichen Version abweichen.
          </div>
        </div>
      )}
      
      {/* Save indicator */}
      {showSaveIndicator && enableAutoSave && (
        <div className="absolute top-2 right-2 z-10">
          <SaveIndicator saveState={debouncedSave} />
        </div>
      )}
      
      <div className={cn(
        'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
        'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500',
        'bg-white dark:bg-gray-900',
        contentError === "recovered" && 'border-yellow-300 dark:border-yellow-600'
      )}>
        {/* Enhanced Toolbar */}
        {showToolbar && (
          <EnhancedToolbar
            editor={editor}
            className={toolbarClassName}
            showLabels={showToolbarLabels}
            showShortcuts={showKeyboardShortcuts}
            enableCustomization={enableToolbarCustomization}
            compactMode={compactToolbar}
            onVariableInsert={() => {
              // Insert @ symbol to trigger variable mention
              editor.commands.insertContent('@')
            }}
          />
        )}
        
        {/* Virtual scrolling for large documents */}
        {enableVirtualScrolling && virtualScrollItems.length > 0 ? (
          <VirtualScrollEditor
            ref={virtualScroll.virtualScrollRef}
            items={virtualScrollItems}
            containerHeight={virtualScrollHeight}
            itemHeight={50}
            overscan={5}
            onScroll={virtualScroll.handleScroll}
            onVisibleRangeChange={virtualScroll.handleVisibleRangeChange}
            className="w-full"
          />
        ) : (
          <EditorContent 
            editor={editor}
            className="w-full min-h-[200px]"
          />
        )}
      </div>
      
      {/* Floating Bubble Menu */}
      {showBubbleMenu && (
        <BubbleMenu 
          editor={editor}
          className={bubbleMenuClassName}
          onVariableInsert={() => {
            // Trigger variable mention system
            onVariableInsert?.(PREDEFINED_VARIABLES[0])
          }}
        />
      )}
      
      {/* Placeholder styling */}
      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        
        .ProseMirror:focus {
          outline: none;
        }
        
        /* Slash command popup styling */
        .slash-command-popup {
          z-index: 1000;
        }
        
        /* Mention popup styling */
        .mention-popup {
          z-index: 1000;
        }
        
        /* Variable mention styling */
        .variable-mention {
          display: inline-flex;
          align-items: center;
          padding: 0.125rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
          background-color: #dbeafe;
          color: #1e40af;
          border-radius: 9999px;
          border: 1px solid #bfdbfe;
          margin: 0 0.125rem;
          cursor: default;
          user-select: none;
        }
        
        .dark .variable-mention {
          background-color: #1e3a8a;
          color: #bfdbfe;
          border-color: #3b82f6;
        }
        
        .variable-mention:hover {
          background-color: #bfdbfe;
          border-color: #93c5fd;
        }
        
        .dark .variable-mention:hover {
          background-color: #1d4ed8;
          border-color: #60a5fa;
        }
        
        /* Custom heading styles */
        .ProseMirror h1 {
          font-size: 2rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }
        
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          line-height: 1.3;
        }
        
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        
        .ProseMirror h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        
        .ProseMirror h5 {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
        
        .ProseMirror h6 {
          font-size: 0.875rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
        
        /* List styles */
        .ProseMirror ul, .ProseMirror ol {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
        }
        
        .ProseMirror li {
          margin: 0.25rem 0;
        }
        
        /* Blockquote styles */
        .ProseMirror blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #6b7280;
        }
        
        .dark .ProseMirror blockquote {
          border-left-color: #4b5563;
          color: #9ca3af;
        }
        
        /* Paragraph styles */
        .ProseMirror p {
          margin: 0.75rem 0;
          line-height: 1.6;
        }
        
        /* Strong and emphasis styles */
        .ProseMirror strong {
          font-weight: 600;
        }
        
        .ProseMirror em {
          font-style: italic;
        }
        
        /* Additional text formatting */
        .ProseMirror u {
          text-decoration: underline;
        }
        
        .ProseMirror s {
          text-decoration: line-through;
        }
        
        .ProseMirror code {
          background-color: #f3f4f6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875em;
        }
        
        .dark .ProseMirror code {
          background-color: #374151;
          color: #f9fafb;
        }
        
        /* Horizontal rule styles */
        .ProseMirror hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 2rem 0;
        }
        
        .dark .ProseMirror hr {
          border-top-color: #4b5563;
        }
        
        /* Bubble menu responsive styles */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Mobile bubble menu adjustments */
        @media (max-width: 640px) {
          .bubble-menu-mobile {
            gap: 0.25rem;
            padding: 0.5rem;
          }
          
          .bubble-menu-mobile button {
            min-width: 2rem;
            min-height: 2rem;
          }
        }
      `}</style>
    </div>
  )
}