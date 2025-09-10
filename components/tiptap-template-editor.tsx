"use client"

import { useState, useEffect, useCallback, useRef, forwardRef } from "react"
import { Editor, EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Mention } from "@tiptap/extension-mention"
import Placeholder from "@tiptap/extension-placeholder"
import Document from "@tiptap/extension-document"
import Paragraph from "@tiptap/extension-paragraph"
import Text from "@tiptap/extension-text"
import { suggestion } from "@/lib/template-system/tiptap-suggestion"
import { FileText, Save, Eye, Edit3, Loader2, Download, Copy, RefreshCw, AlertTriangle, CheckCircle, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  placeholderEngine, 
  type PlaceholderDefinition, 
  type ValidationError,
  type PerformanceMetrics
} from "@/lib/template-system/placeholder-engine"

interface TiptapTemplateEditorProps {
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

export function TiptapTemplateEditor({
  isOpen,
  onClose,
  filePath,
  fileName,
  initialContent = "",
  isNewFile = false,
  onSave,
  enableAutocomplete = false,
  placeholderDefinitions
}: TiptapTemplateEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    suggestionTime: 0,
    validationTime: 0,
    cacheHitRate: 0
  })

  const { toast } = useToast()

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      StarterKit.configure({
        document: false, // We're using custom Document
        paragraph: false, // We're using custom Paragraph  
        text: false, // We're using custom Text
      }),
      Placeholder.configure({
        placeholder: enableAutocomplete 
          ? "Beginnen Sie mit der Eingabe Ihres Template-Inhalts. Verwenden Sie @ für Platzhalter..." 
          : "Beginnen Sie mit der Eingabe Ihres Inhalts...",
        emptyEditorClass: 'is-editor-empty',
      }),
      ...(enableAutocomplete ? [
        Mention.configure({
          HTMLAttributes: {
            class: 'mention',
          },
          suggestion: suggestion(placeholderDefinitions),
        })
      ] : [])
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl mx-auto focus:outline-none',
          'min-h-[400px] max-w-none p-4'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      setIsDirty(content !== initialContent)
      
      // Validate placeholders if autocomplete is enabled
      if (enableAutocomplete) {
        const textContent = editor.getText()
        const errors = placeholderEngine.validatePlaceholders(textContent)
        setValidationErrors(errors)
      }
    },
    immediatelyRender: false,
  })

  // Load file content when modal opens for existing files
  useEffect(() => {
    if (isOpen && !isNewFile && filePath && fileName) {
      setTimeout(() => {
        loadFileContent()
      }, 100)
    } else if (isOpen && isNewFile) {
      editor?.commands.setContent(initialContent)
      setIsDirty(false)
    }
  }, [isOpen, filePath, fileName, isNewFile, initialContent, editor])

  // Update editor content when initialContent changes
  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent)
      setIsDirty(false)
    }
  }, [initialContent, editor])

  const loadFileContent = async () => {
    if (!filePath || !fileName) return

    setIsLoading(true)
    try {
      // Use different API endpoint for template files
      const isTemplateFile = fileName.endsWith('.vorlage')
      const apiEndpoint = isTemplateFile ? '/api/dateien/read-template' : '/api/dateien/read-file'
      
      const response = await fetch(`${apiEndpoint}?t=${Date.now()}`, {
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
      const content = result.content || ""
      
      // Convert plain text to HTML for Tiptap
      const htmlContent = content.replace(/\n/g, '<br>')
      editor?.commands.setContent(htmlContent)
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
    if (!editor) return

    if (!filePath || !fileName) {
      if (onSave) {
        // Convert HTML back to plain text for saving
        const content = editor.getText()
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
      // Use different API endpoint for template files
      const isTemplateFile = fileName.endsWith('.vorlage')
      const apiEndpoint = isTemplateFile ? '/api/dateien/update-template' : '/api/dateien/update-file'
      
      // Convert HTML back to plain text for saving
      const content = editor.getText()
      
      const response = await fetch(`${apiEndpoint}?t=${Date.now()}`, {
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
    
    setIsDirty(false)
    setActiveTab("edit")
    setLastSaved(null)
    setValidationErrors([])
    onClose()
  }, [isDirty, onClose])

  const handleDownload = () => {
    if (!editor) return
    
    const content = editor.getText()
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
    if (!editor) return
    
    try {
      const content = editor.getText()
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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleSave, handleClose])

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
                  Tiptap Template Editor
                </Badge>
              )}
              {enableAutocomplete && performanceMetrics.cacheHitRate > 0 && (
                <Badge variant="outline" className="ml-2 text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Cache: {Math.round(performanceMetrics.cacheHitRate * 100)}%
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
                disabled={!editor}
              >
                <Copy className="h-4 w-4 mr-2" />
                Kopieren
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!editor}
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
                <div className="w-full h-full border rounded-lg overflow-hidden">
                  <EditorContent 
                    editor={editor} 
                    className="h-full overflow-auto"
                    style={{ minHeight: "calc(100vh - 300px)" }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 m-0 p-6 pt-4">
                <div className="w-full h-full overflow-auto">
                  {editor?.getText() ? (
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ 
                        __html: markdownToHtml(editor.getText()) 
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
              {editor?.getText().length || 0} Zeichen • {editor?.getText().split(/\s+/).filter(word => word.length > 0).length || 0} Wörter
              {isDirty && <span className="ml-2 text-orange-500">• Ungespeicherte Änderungen</span>}
              {lastSaved && !isDirty && (
                <span className="ml-2 text-green-600">
                  • Gespeichert um {lastSaved.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {enableAutocomplete && validationErrors.length === 0 && editor?.getText().includes('@') && (
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