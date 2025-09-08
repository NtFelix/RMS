"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { FileText, Save, Eye, Edit3, Loader2, Download, Copy, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  placeholderEngine, 
  type PlaceholderDefinition, 
  type AutocompleteSuggestion,
  type ValidationError 
} from "@/lib/template-system/placeholder-engine"

interface EnhancedFileEditorProps {
  isOpen: boolean
  onClose: () => void
  filePath?: string
  fileName?: string
  initialContent?: string
  isNewFile?: boolean
  onSave?: (content: string) => void
  enableAutocomplete?: boolean
  placeholderDefinitions?: PlaceholderDefinition[]
}

interface AutocompleteState {
  isVisible: boolean
  suggestions: AutocompleteSuggestion[]
  selectedIndex: number
  triggerPosition: number
  query: string
}

export function EnhancedFileEditor({
  isOpen,
  onClose,
  filePath,
  fileName,
  initialContent = "",
  isNewFile = false,
  onSave,
  enableAutocomplete = false,
  placeholderDefinitions
}: EnhancedFileEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  
  // Autocomplete state
  const [autocomplete, setAutocomplete] = useState<AutocompleteState>({
    isVisible: false,
    suggestions: [],
    selectedIndex: 0,
    triggerPosition: 0,
    query: ""
  })
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autocompleteRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Initialize placeholder engine with custom definitions if provided
  const engine = useMemo(() => {
    if (placeholderDefinitions) {
      return new (placeholderEngine.constructor as any)(placeholderDefinitions)
    }
    return placeholderEngine
  }, [placeholderDefinitions])

  // Load file content when modal opens for existing files
  useEffect(() => {
    if (isOpen && !isNewFile && filePath && fileName) {
      setTimeout(() => {
        loadFileContent()
      }, 100)
    } else if (isOpen && isNewFile) {
      setContent(initialContent)
      setIsDirty(false)
    }
  }, [isOpen, filePath, fileName, isNewFile, initialContent])

  // Track content changes and validate placeholders
  useEffect(() => {
    setIsDirty(content !== initialContent)
    
    // Validate placeholders if autocomplete is enabled
    if (enableAutocomplete) {
      const errors = engine.validatePlaceholders(content)
      setValidationErrors(errors)
    }
  }, [content, initialContent, enableAutocomplete, engine])

  // Handle autocomplete visibility and positioning
  useEffect(() => {
    if (autocomplete.isVisible && textareaRef.current && autocompleteRef.current) {
      const textarea = textareaRef.current
      const rect = textarea.getBoundingClientRect()
      const autocompleteEl = autocompleteRef.current
      
      // Calculate position based on cursor position
      const cursorPosition = textarea.selectionStart
      const textBeforeCursor = content.substring(0, cursorPosition)
      const lines = textBeforeCursor.split('\n')
      const currentLine = lines.length - 1
      const currentColumn = lines[lines.length - 1].length
      
      // Estimate position (this is approximate)
      const lineHeight = 20 // Approximate line height
      const charWidth = 8 // Approximate character width
      
      const top = rect.top + (currentLine * lineHeight) + lineHeight + 5
      const left = rect.left + (currentColumn * charWidth)
      
      autocompleteEl.style.position = 'fixed'
      autocompleteEl.style.top = `${Math.min(top, window.innerHeight - 200)}px`
      autocompleteEl.style.left = `${Math.min(left, window.innerWidth - 300)}px`
      autocompleteEl.style.zIndex = '1000'
    }
  }, [autocomplete.isVisible, content])

  const loadFileContent = async () => {
    if (!filePath || !fileName) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/dateien/read-file?t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
        body: JSON.stringify({
          filePath: filePath,
          fileName: fileName,
          timestamp: Date.now(),
          random: Math.random()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to load file content')
      }

      const result = await response.json()
      setContent(result.content || "")
      setIsDirty(false)
    } catch (error) {
      console.error('Error loading file:', error)
      toast({
        title: "Fehler beim Laden",
        description: "Die Datei konnte nicht geladen werden.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!filePath || !fileName) {
      if (onSave) {
        onSave(content)
        setIsDirty(false)
        return
      }
      return
    }

    setIsSaving(true)
    
    toast({
      title: "Speichern...",
      description: "Die Datei wird gespeichert. Dies kann einen Moment dauern."
    })
    
    try {
      const response = await fetch(`/api/dateien/update-file?t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
        body: JSON.stringify({
          filePath: filePath,
          fileName: fileName,
          content: content,
          timestamp: Date.now(),
          random: Math.random()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save file')
      }

      toast({
        title: "Gespeichert",
        description: `Die Datei "${fileName}" wurde erfolgreich gespeichert.`
      })

      setIsDirty(false)
      setLastSaved(new Date())
      if (onSave) {
        onSave(content)
      }
    } catch (error) {
      console.error('Error saving file:', error)
      toast({
        title: "Fehler beim Speichern",
        description: "Die Datei konnte nicht gespeichert werden.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = useCallback(() => {
    if (isDirty) {
      const confirmClose = window.confirm(
        "Sie haben ungespeicherte Änderungen. Möchten Sie wirklich schließen?"
      )
      if (!confirmClose) return
    }
    
    setContent("")
    setIsDirty(false)
    setActiveTab("edit")
    setLastSaved(null)
    setValidationErrors([])
    setAutocomplete({
      isVisible: false,
      suggestions: [],
      selectedIndex: 0,
      triggerPosition: 0,
      query: ""
    })
    onClose()
  }, [isDirty, onClose])

  // Handle textarea input for autocomplete
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    const cursorPosition = e.target.selectionStart
    
    setContent(newContent)
    
    if (enableAutocomplete) {
      handleAutocomplete(newContent, cursorPosition)
    }
  }

  // Handle autocomplete logic
  const handleAutocomplete = (text: string, cursorPosition: number) => {
    const textBeforeCursor = text.substring(0, cursorPosition)
    const atIndex = textBeforeCursor.lastIndexOf('@')
    
    if (atIndex === -1) {
      // No @ found, hide autocomplete
      setAutocomplete(prev => ({ ...prev, isVisible: false }))
      return
    }
    
    // Check if there's a space between @ and cursor (which would break the placeholder)
    const textAfterAt = textBeforeCursor.substring(atIndex)
    if (textAfterAt.includes(' ') && textAfterAt.length > 1) {
      setAutocomplete(prev => ({ ...prev, isVisible: false }))
      return
    }
    
    // Extract the query after @
    const query = textAfterAt
    
    if (query.length > 0) {
      const suggestions = engine.generateSuggestions(query, 10)
      
      setAutocomplete({
        isVisible: suggestions.length > 0,
        suggestions,
        selectedIndex: 0,
        triggerPosition: atIndex,
        query
      })
    } else {
      setAutocomplete(prev => ({ ...prev, isVisible: false }))
    }
  }

  // Handle autocomplete selection
  const insertSuggestion = (suggestion: AutocompleteSuggestion) => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const cursorPosition = textarea.selectionStart
    const textBeforeCursor = content.substring(0, autocomplete.triggerPosition)
    const textAfterCursor = content.substring(cursorPosition)
    
    const newContent = textBeforeCursor + suggestion.insertText + textAfterCursor
    const newCursorPosition = autocomplete.triggerPosition + suggestion.insertText.length
    
    setContent(newContent)
    setAutocomplete(prev => ({ ...prev, isVisible: false }))
    
    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPosition, newCursorPosition)
    }, 0)
  }

  // Handle keyboard navigation in autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (autocomplete.isVisible) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setAutocomplete(prev => ({
            ...prev,
            selectedIndex: Math.min(prev.selectedIndex + 1, prev.suggestions.length - 1)
          }))
          break
        case 'ArrowUp':
          e.preventDefault()
          setAutocomplete(prev => ({
            ...prev,
            selectedIndex: Math.max(prev.selectedIndex - 1, 0)
          }))
          break
        case 'Enter':
        case 'Tab':
          e.preventDefault()
          if (autocomplete.suggestions[autocomplete.selectedIndex]) {
            insertSuggestion(autocomplete.suggestions[autocomplete.selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setAutocomplete(prev => ({ ...prev, isVisible: false }))
          break
      }
    }
    
    // Global shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'w') {
        e.preventDefault()
        handleClose()
      }
    }
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'document.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content)
      toast({
        title: "Kopiert",
        description: "Der Inhalt wurde in die Zwischenablage kopiert."
      })
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Der Inhalt konnte nicht kopiert werden.",
        variant: "destructive"
      })
    }
  }

  // Render content with syntax highlighting for placeholders
  const renderHighlightedContent = (text: string) => {
    if (!enableAutocomplete) return text
    
    const placeholderRegex = /@[a-zA-Z][a-zA-Z0-9._]*\b/g
    const parts = []
    let lastIndex = 0
    let match
    
    while ((match = placeholderRegex.exec(text)) !== null) {
      // Add text before placeholder
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      
      // Add highlighted placeholder
      const placeholder = match[0]
      const isValid = engine.getPlaceholderDefinition(placeholder) !== undefined
      parts.push(
        <span 
          key={match.index}
          className={cn(
            "px-1 rounded",
            isValid 
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" 
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          )}
        >
          {placeholder}
        </span>
      )
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }
    
    return parts
  }

  // Improved markdown to HTML converter for preview
  const markdownToHtml = (markdown: string) => {
    if (!markdown.trim()) return ''
    
    const lines = markdown.split('\n')
    const result: string[] = []
    let inUnorderedList = false
    let inOrderedList = false
    let listItems: string[] = []
    
    const flushList = () => {
      if (listItems.length > 0) {
        if (inUnorderedList) {
          result.push(`<ul>${listItems.join('')}</ul>`)
        } else if (inOrderedList) {
          result.push(`<ol>${listItems.join('')}</ol>`)
        }
        listItems = []
        inUnorderedList = false
        inOrderedList = false
      }
    }
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]
      
      if (line.match(/^- (.+)/)) {
        if (!inUnorderedList) {
          flushList()
          inUnorderedList = true
        }
        const content = line.replace(/^- (.+)/, '$1')
        listItems.push(`<li>${processInlineMarkdown(content)}</li>`)
        continue
      }
      
      if (line.match(/^\d+\. (.+)/)) {
        if (!inOrderedList) {
          flushList()
          inOrderedList = true
        }
        const content = line.replace(/^\d+\. (.+)/, '$1')
        listItems.push(`<li>${processInlineMarkdown(content)}</li>`)
        continue
      }
      
      if (inUnorderedList || inOrderedList) {
        flushList()
      }
      
      if (line.match(/^#{1,6} /)) {
        const level = line.match(/^(#{1,6})/)?.[1].length || 1
        const content = line.replace(/^#{1,6} (.+)/, '$1')
        result.push(`<h${level}>${processInlineMarkdown(content)}</h${level}>`)
        continue
      }
      
      if (line.trim() === '') {
        result.push('<br>')
        continue
      }
      
      result.push(`<p>${processInlineMarkdown(line)}</p>`)
    }
    
    flushList()
    return result.join('')
  }
  
  const processInlineMarkdown = (text: string): string => {
    return text
      .replace(/!\[([^\]]*)\]\(([^\)]*)\)/g, '<img alt="$1" src="$2" style="max-width: 100%; height: auto;" />')
      .replace(/\[([^\]]*)\]\(([^\)]*)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background-color: #f1f5f9; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              {fileName || "Neue Datei"}
              {isDirty && <span className="ml-2 text-orange-500">•</span>}
              {enableAutocomplete && (
                <Badge variant="secondary" className="ml-2">
                  Template Editor
                </Badge>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2 mr-8">
              {!isNewFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadFileContent}
                  disabled={isLoading}
                  title="Datei neu laden"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Neu laden
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyContent}
                disabled={!content}
              >
                <Copy className="h-4 w-4 mr-2" />
                Kopieren
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!content}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                size="sm"
                title={isDirty ? "Änderungen speichern (Strg+S)" : "Keine Änderungen zum Speichern"}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isSaving ? "Speichert..." : "Speichern"}
              </Button>
            </div>
          </div>
          
          {/* Validation errors display */}
          {enableAutocomplete && validationErrors.length > 0 && (
            <div className="mt-2 space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{error.message}</span>
                </div>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Datei wird geladen...</span>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "edit" | "preview")} className="flex-1 flex flex-col">
              <TabsList className="mx-6 mt-4 w-fit">
                <TabsTrigger value="edit" className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  Bearbeiten
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Vorschau
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="flex-1 m-0 p-6 pt-4 relative">
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={enableAutocomplete 
                    ? "Beginnen Sie mit der Eingabe Ihres Template-Inhalts. Verwenden Sie @ für Platzhalter..." 
                    : "Beginnen Sie mit der Eingabe Ihres Inhalts..."
                  }
                  className={cn(
                    "w-full h-full resize-none font-mono text-sm",
                    "border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                    "bg-background"
                  )}
                  style={{ minHeight: "calc(100vh - 200px)" }}
                />
                
                {/* Autocomplete dropdown */}
                {autocomplete.isVisible && (
                  <div
                    ref={autocompleteRef}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-w-sm"
                  >
                    <ScrollArea className="max-h-60">
                      <div className="p-2">
                        <div className="text-xs text-muted-foreground mb-2 px-2">
                          Platzhalter-Vorschläge
                        </div>
                        {autocomplete.suggestions.map((suggestion, index) => (
                          <div
                            key={suggestion.placeholder.key}
                            className={cn(
                              "px-3 py-2 rounded cursor-pointer text-sm",
                              index === autocomplete.selectedIndex
                                ? "bg-blue-100 dark:bg-blue-900"
                                : "hover:bg-gray-100 dark:hover:bg-gray-700"
                            )}
                            onClick={() => insertSuggestion(suggestion)}
                          >
                            <div className="font-medium">{suggestion.placeholder.key}</div>
                            <div className="text-xs text-muted-foreground">
                              {suggestion.placeholder.description}
                            </div>
                            <Badge 
                              variant="outline" 
                              className="text-xs mt-1"
                            >
                              {suggestion.placeholder.category}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-muted-foreground">
                      ↑↓ Navigation • Enter/Tab Auswählen • Esc Schließen
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="preview" className="flex-1 m-0 p-6 pt-4">
                <div className="w-full h-full overflow-auto">
                  {content ? (
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ 
                        __html: markdownToHtml(content) 
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      Keine Inhalte zur Vorschau verfügbar
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <div className="px-6 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex justify-between items-center">
            <span>
              {content.length} Zeichen • {content.split('\n').length} Zeilen
              {isDirty && <span className="ml-2 text-orange-500">• Ungespeicherte Änderungen</span>}
              {lastSaved && !isDirty && (
                <span className="ml-2 text-green-600">
                  • Gespeichert um {lastSaved.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {enableAutocomplete && validationErrors.length === 0 && content.includes('@') && (
                <span className="ml-2 text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Platzhalter validiert
                </span>
              )}
            </span>
            <span>
              Strg+S zum Speichern • Strg+W zum Schließen
              {enableAutocomplete && <span className="ml-2">• @ für Platzhalter</span>}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}