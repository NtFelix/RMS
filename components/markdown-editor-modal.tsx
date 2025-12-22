"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { marked } from "marked"
import DOMPurify from "dompurify"
import { FileText, Save, Eye, Edit3, Loader2, Download, Copy, RefreshCw } from "lucide-react"
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

interface MarkdownEditorModalProps {
  isOpen: boolean
  onClose: () => void
  filePath?: string
  fileName?: string
  initialContent?: string
  isNewFile?: boolean
  onSave?: (content: string) => void
}

export function MarkdownEditorModal({
  isOpen,
  onClose,
  filePath,
  fileName,
  initialContent = "",
  isNewFile = false,
  onSave
}: MarkdownEditorModalProps) {
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const { toast } = useToast()

  // Load file content when modal opens for existing files
  useEffect(() => {
    if (isOpen && !isNewFile && filePath && fileName) {
      // Add a small delay to ensure any previous operations have completed
      setTimeout(() => {
        loadFileContent()
      }, 100)
    } else if (isOpen && isNewFile) {
      setContent(initialContent)
      setIsDirty(false)
    }
  }, [isOpen, filePath, fileName, isNewFile, initialContent])

  // Track content changes
  useEffect(() => {
    setIsDirty(content !== initialContent)
  }, [content, initialContent])

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
        cache: 'no-store', // Disable fetch cache
        body: JSON.stringify({
          filePath: filePath,
          fileName: fileName,
          timestamp: Date.now(), // Add timestamp to request body for extra cache busting
          random: Math.random() // Add random number for additional cache busting
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

    // Show initial save toast
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
        cache: 'no-store', // Disable fetch cache
        body: JSON.stringify({
          filePath: filePath,
          fileName: fileName,
          content: content,
          timestamp: Date.now(), // Add timestamp for cache busting
          random: Math.random() // Add random number for additional cache busting
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save file')
      }

      toast({
        title: "Gespeichert",
        description: `Die Datei "${fileName}" wurde erfolgreich gespeichert. Änderungen können einige Sekunden brauchen, um vollständig zu erscheinen.`
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
    onClose()
  }, [isDirty, onClose])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'w') {
        e.preventDefault()
        handleClose()
      }
    }
  }, [handleSave, handleClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

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

  // Secure markdown to HTML converter using marked and DOMPurify
  const markdownToHtml = useMemo(() => {
    return (markdown: string): string => {
      if (!markdown.trim()) return ''

      // Use marked to parse and DOMPurify to sanitize for XSS protection
      const rawHtml = marked.parse(markdown, { async: false }) as string
      const cleanHtml = DOMPurify.sanitize(rawHtml)

      return cleanHtml
    }
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              {fileName || "Neue Markdown-Datei"}
              {isDirty && <span className="ml-2 text-orange-500">•</span>}
            </DialogTitle>
            <div className="flex items-center gap-2 mr-8">
              {!isNewFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadFileContent}
                  disabled={isLoading}
                  title="Datei neu laden - Lädt die aktuelle Version vom Server"
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
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
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

              <TabsContent value="edit" className="flex-1 m-0 p-6 pt-4">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Beginnen Sie mit der Eingabe Ihres Markdown-Inhalts..."
                  className={cn(
                    "w-full h-full resize-none font-mono text-sm",
                    "border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                    "bg-background"
                  )}
                  style={{ minHeight: "calc(100vh - 200px)" }}
                />
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
            </span>
            <span>
              Strg+S zum Speichern • Strg+W zum Schließen
              {!isNewFile && <span className="ml-2">• "Neu laden" für aktuelle Version</span>}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}