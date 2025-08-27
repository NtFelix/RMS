"use client"

import { useEffect, useState } from "react"
import { Download, ExternalLink, ZoomIn, ZoomOut, RotateCw, RotateCcw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useModalStore } from "@/hooks/use-modal-store"
import { createClient } from "@/utils/supabase/client"
import { PDFViewer } from "@/components/pdf-viewer"
import { cn } from "@/lib/utils"

interface FilePreviewModalProps {
  className?: string
}

export function FilePreviewModal({ className }: FilePreviewModalProps) {
  const {
    isFilePreviewModalOpen,
    filePreviewData,
    closeFilePreviewModal
  } = useModalStore()

  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

  // Determine file type
  const isImage = filePreviewData ? ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(
    filePreviewData.name.split('.').pop()?.toLowerCase() || ''
  ) : false
  const isPdf = filePreviewData ? filePreviewData.name.split('.').pop()?.toLowerCase() === 'pdf' : false

  const loadFileUrl = async () => {
    if (!filePreviewData) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Get signed URL for the file
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePreviewData.path, 3600) // 1 hour expiry

      if (error) {
        throw new Error('Datei konnte nicht geladen werden')
      }

      setFileUrl(data.signedUrl)
    } catch (err) {
      console.error('Error loading file URL:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Datei')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!filePreviewData || !fileUrl) return

    try {
      const response = await fetch(fileUrl)
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filePreviewData.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading file:', err)
    }
  }

  const handleOpenExternal = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank')
    }
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25))
  }

  const handleRotateClockwise = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleRotateCounterClockwise = () => {
    setRotation(prev => (prev - 90 + 360) % 360)
  }

  const handleFitToScreen = () => {
    setZoom(100)
    setRotation(0)
  }

  // Get file URL when modal opens
  useEffect(() => {
    if (isFilePreviewModalOpen && filePreviewData) {
      loadFileUrl()
    } else {
      // Clean up when modal closes
      setFileUrl(null)
      setError(null)
      setZoom(100)
      setRotation(0)
    }
  }, [isFilePreviewModalOpen, filePreviewData])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isFilePreviewModalOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'Escape':
          closeFilePreviewModal()
          break
        case '+':
        case '=':
          if (isImage) {
            e.preventDefault()
            handleZoomIn()
          }
          break
        case '-':
          if (isImage) {
            e.preventDefault()
            handleZoomOut()
          }
          break
        case '0':
          if (isImage) {
            e.preventDefault()
            handleFitToScreen()
          }
          break
        case 'r':
        case 'R':
          if (isImage) {
            e.preventDefault()
            handleRotateClockwise()
          }
          break

        case 'd':
        case 'D':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            handleDownload()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFilePreviewModalOpen, isImage])

  if (!filePreviewData) return null

  return (
    <Dialog open={isFilePreviewModalOpen} onOpenChange={() => closeFilePreviewModal()}>
      <DialogContent 
        className={cn(
          "max-w-[98vw] h-[98vh] p-0 gap-0 overflow-hidden rounded-lg",
          className
        )}
      >
        {/* Hidden title for accessibility when showing PDF */}
        {isPdf && (
          <VisuallyHidden>
            <DialogTitle>{filePreviewData.name}</DialogTitle>
          </VisuallyHidden>
        )}
        
        {/* Header - Only show for non-PDF files since PDF viewer has its own controls */}
        {!isPdf && (
          <DialogHeader className="px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <DialogTitle className="text-lg font-semibold truncate">
                  {filePreviewData.name}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {filePreviewData.size && `${(filePreviewData.size / 1024 / 1024).toFixed(2)} MB`}
                  {filePreviewData.type && ` • ${filePreviewData.type.toUpperCase()}`}
                </p>
              </div>
              
              {/* Controls */}
              <div className="flex items-center gap-1">
                {/* Image-specific controls */}
                {isImage && fileUrl && !isLoading && !error && (
                  <>
                    <div className="flex items-center gap-1 px-3 py-1 bg-muted rounded-md">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleZoomOut}
                        disabled={zoom <= 25}
                        className="h-8 w-8 p-0"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium min-w-[3rem] text-center px-2">
                        {zoom}%
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleZoomIn}
                        disabled={zoom >= 300}
                        className="h-8 w-8 p-0"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Separator orientation="vertical" className="h-6" />
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRotateCounterClockwise}
                      className="h-8 w-8 p-0"
                      title="Gegen Uhrzeigersinn drehen"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRotateClockwise}
                      className="h-8 w-8 p-0"
                      title="Im Uhrzeigersinn drehen"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFitToScreen}
                      title="An Bildschirm anpassen"
                    >
                      Anpassen
                    </Button>
                    
                    <Separator orientation="vertical" className="h-6" />
                  </>
                )}
                
                {/* Universal controls */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenExternal}
                  disabled={!fileUrl}
                  title="In neuem Tab öffnen"
                  className="mr-2"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Extern öffnen
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={!fileUrl}
                  title="Herunterladen"
                  className="mr-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </DialogHeader>
        )}

        {/* Content */}
        <div className={cn(
          "flex-1 overflow-hidden rounded-b-lg",
          isPdf ? "bg-transparent" : "bg-muted/10"
        )}>
          {isPdf ? (
            // PDF viewer handles its own loading and error states
            fileUrl && !isLoading && !error ? (
              <PDFViewer
                fileUrl={fileUrl}
                fileName={filePreviewData.name}
                onDownload={handleDownload}
                onError={(error) => setError(error)}
                className="h-full"
              />
            ) : isLoading ? (
              <div className="flex items-center justify-center h-full bg-muted/10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground text-lg">Lade PDF...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full bg-muted/10">
                <div className="text-center max-w-md">
                  <div className="bg-destructive/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <ExternalLink className="h-8 w-8 text-destructive" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Fehler beim Laden</h3>
                  <p className="text-destructive mb-6">{error}</p>
                  <Button onClick={loadFileUrl} variant="outline">
                    Erneut versuchen
                  </Button>
                </div>
              </div>
            ) : null
          ) : (
            // Non-PDF content
            <>
              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground text-lg">Lade Datei...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <div className="bg-destructive/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <ExternalLink className="h-8 w-8 text-destructive" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Fehler beim Laden</h3>
                    <p className="text-destructive mb-6">{error}</p>
                    <Button onClick={loadFileUrl} variant="outline">
                      Erneut versuchen
                    </Button>
                  </div>
                </div>
              )}

              {fileUrl && !isLoading && !error && (
                <>
                  {isImage && (
                    <div 
                      className="h-full flex items-center justify-center p-6 overflow-hidden bg-gradient-to-br from-muted/20 to-muted/5 rounded-b-lg"
                      onWheel={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                          e.preventDefault()
                          if (e.deltaY < 0) {
                            handleZoomIn()
                          } else {
                            handleZoomOut()
                          }
                        }
                      }}
                    >
                      <div className="relative overflow-hidden rounded-lg">
                        <img
                          src={fileUrl}
                          alt={filePreviewData.name}
                          className="max-w-none transition-all duration-300 ease-in-out shadow-2xl rounded-lg border border-border/20"
                          style={{
                            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                            transformOrigin: 'center',
                            maxHeight: zoom <= 100 ? 'calc(98vh - 180px)' : 'none',
                            maxWidth: zoom <= 100 ? 'calc(98vw - 80px)' : 'none'
                          }}
                          onError={() => setError('Bild konnte nicht geladen werden')}
                          onLoad={() => {
                            // Auto-fit large images to screen on initial load
                            const img = document.querySelector('img[alt="' + filePreviewData.name + '"]') as HTMLImageElement
                            if (img && zoom === 100) {
                              const containerWidth = img.parentElement?.parentElement?.clientWidth || 0
                              const containerHeight = img.parentElement?.parentElement?.clientHeight || 0
                              const imgWidth = img.naturalWidth
                              const imgHeight = img.naturalHeight
                              
                              if (imgWidth > containerWidth - 80 || imgHeight > containerHeight - 80) {
                                const scaleX = (containerWidth - 80) / imgWidth
                                const scaleY = (containerHeight - 80) / imgHeight
                                const scale = Math.min(scaleX, scaleY, 1) * 100
                                if (scale < 100) {
                                  setZoom(Math.round(scale))
                                }
                              }
                            }
                          }}
                          draggable={false}
                        />
                      </div>
                    </div>
                  )}

                  {!isImage && (
                    <div className="flex items-center justify-center h-full rounded-b-lg">
                      <div className="text-center max-w-md">
                        <div className="bg-muted rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                          <ExternalLink className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Vorschau nicht verfügbar</h3>
                        <p className="text-muted-foreground mb-6">
                          Für diesen Dateityp ist keine Vorschau verfügbar. Sie können die Datei herunterladen oder extern öffnen.
                        </p>
                        <div className="flex gap-3 justify-center">
                          <Button onClick={handleDownload} variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Herunterladen
                          </Button>
                          <Button onClick={handleOpenExternal} variant="outline">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Extern öffnen
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}