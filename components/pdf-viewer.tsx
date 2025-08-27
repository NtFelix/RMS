"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// Dynamic import for PDF.js to avoid SSR issues
let pdfjsLib: any = null

interface PDFViewerProps {
  fileUrl: string
  fileName: string
  className?: string
  onDownload?: () => void
  onError?: (error: string) => void
}

export function PDFViewer({ fileUrl, fileName, className, onDownload, onError }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdfDoc, setPdfDoc] = useState<any | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.0)
  const [rotation, setRotation] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRendering, setIsRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pageInput, setPageInput] = useState("1")
  const [isClient, setIsClient] = useState(false)

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load PDF document
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Dynamic import of PDF.js to avoid SSR issues
        if (!pdfjsLib) {
          pdfjsLib = await import('pdfjs-dist')
          // Use local worker file to avoid CDN issues
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js'
        }
        
        const loadingTask = pdfjsLib.getDocument(fileUrl)
        const pdf = await loadingTask.promise
        
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
        setCurrentPage(1)
        setPageInput("1")
      } catch (err) {
        console.error('Error loading PDF with PDF.js:', err)
        // Fallback: show iframe with browser's built-in PDF viewer
        setError('fallback-to-iframe')
      } finally {
        setIsLoading(false)
      }
    }

    if (fileUrl && typeof window !== 'undefined') {
      loadPDF()
    }

    return () => {
      if (pdfDoc) {
        pdfDoc.destroy()
      }
    }
  }, [fileUrl, onError])

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || isRendering) return

    try {
      setIsRendering(true)
      
      const page = await pdfDoc.getPage(currentPage)
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      if (!context) return

      // Calculate viewport with scale and rotation
      let viewport = page.getViewport({ scale, rotation })
      
      // Auto-fit to container width if scale is 1.0 (initial load)
      if (scale === 1.0 && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 40 // Account for padding
        const scaleToFit = containerWidth / viewport.width
        if (scaleToFit < 1) {
          viewport = page.getViewport({ scale: scaleToFit, rotation })
          setScale(scaleToFit)
        }
      }

      // Set canvas dimensions
      canvas.height = viewport.height
      canvas.width = viewport.width
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      // Render page
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      }

      await page.render(renderContext).promise
    } catch (err) {
      console.error('Error rendering page:', err)
      setError('Seite konnte nicht gerendert werden')
    } finally {
      setIsRendering(false)
    }
  }, [pdfDoc, currentPage, scale, rotation])

  // Render page when dependencies change
  useEffect(() => {
    renderPage()
  }, [renderPage])

  // Navigation functions
  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum)
      setPageInput(pageNum.toString())
    }
  }

  const nextPage = () => goToPage(currentPage + 1)
  const prevPage = () => goToPage(currentPage - 1)

  // Zoom functions
  const zoomIn = () => setScale(prev => Math.min(prev * 1.25, 3.0))
  const zoomOut = () => setScale(prev => Math.max(prev / 1.25, 0.25))
  const resetZoom = () => setScale(1.0)

  // Rotation function
  const rotate = () => setRotation(prev => (prev + 90) % 360)

  // Fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev)
  }

  // Handle page input change
  const handlePageInputChange = (value: string) => {
    setPageInput(value)
    const pageNum = parseInt(value)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum)
    }
  }

  // Handle page input blur/enter
  const handlePageInputSubmit = () => {
    const pageNum = parseInt(pageInput)
    if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
      setPageInput(currentPage.toString())
    } else {
      setCurrentPage(pageNum)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          prevPage()
          break
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault()
          nextPage()
          break
        case 'Home':
          e.preventDefault()
          goToPage(1)
          break
        case 'End':
          e.preventDefault()
          goToPage(totalPages)
          break
        case '+':
        case '=':
          e.preventDefault()
          zoomIn()
          break
        case '-':
          e.preventDefault()
          zoomOut()
          break
        case '0':
          e.preventDefault()
          resetZoom()
          break
        case 'r':
        case 'R':
          e.preventDefault()
          rotate()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'd':
        case 'D':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            onDownload?.()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, totalPages, onDownload])

  // Show loading state if not on client or still loading
  if (!isClient || isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-muted/10", className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-lg">Lade PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    // If error is fallback-to-iframe, show browser's built-in PDF viewer
    if (error === 'fallback-to-iframe') {
      return (
        <div className={cn("flex flex-col h-full bg-muted/10", className)}>
          {/* Simple header for fallback */}
          <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
            <div className="flex-1 min-w-0 mr-4">
              <h3 className="text-lg font-semibold truncate">{fileName}</h3>
              <p className="text-sm text-muted-foreground">Browser PDF Viewer (Fallback)</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              title="Herunterladen"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
          
          {/* Fallback iframe */}
          <div className="flex-1 p-4">
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
              className="w-full h-full border-0 rounded-lg shadow-lg"
              title={fileName}
              style={{ backgroundColor: 'white' }}
            />
          </div>
        </div>
      )
    }
    
    // Regular error state
    return (
      <div className={cn("flex items-center justify-center h-full bg-muted/10", className)}>
        <div className="text-center max-w-md">
          <div className="bg-destructive/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <ChevronRight className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Fehler beim Laden</h3>
          <p className="text-destructive mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Erneut versuchen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-muted/10", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2">
          {/* Navigation */}
          <Button
            variant="outline"
            size="sm"
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={pageInput}
              onChange={(e) => handlePageInputChange(e.target.value)}
              onBlur={handlePageInputSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePageInputSubmit()
                }
              }}
              className="w-16 h-8 text-center text-sm"
            />
            <span className="text-sm text-muted-foreground">
              von {totalPages}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={currentPage >= totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 px-3 py-1 bg-muted rounded-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomOut}
              disabled={scale <= 0.25}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[3rem] text-center px-2">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomIn}
              disabled={scale >= 3.0}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Rotation */}
          <Button
            variant="outline"
            size="sm"
            onClick={rotate}
            className="h-8 w-8 p-0"
            title="Drehen"
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          {/* Fullscreen toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0"
            title={isFullscreen ? "Vollbild verlassen" : "Vollbild"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Download */}
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            title="Herunterladen"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div 
        ref={containerRef}
        className={cn(
          "flex-1 overflow-auto bg-gradient-to-br from-muted/20 to-muted/5 p-4",
          isFullscreen && "fixed inset-0 z-50 bg-background"
        )}
      >
        <div className="flex justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className={cn(
                "shadow-2xl rounded-lg border border-border/20 bg-white transition-opacity duration-200",
                isRendering && "opacity-50"
              )}
            />
            {isRendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 py-2 border-t bg-background/95 backdrop-blur text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>{fileName}</span>
          <span>
            Seite {currentPage} von {totalPages} • {Math.round(scale * 100)}% • {rotation}°
          </span>
        </div>
      </div>
    </div>
  )
}