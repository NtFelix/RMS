"use client"

import { useEffect, useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, X, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight } from "lucide-react"
import { useCloudStoragePreview, useCloudStorageOperations } from "@/hooks/use-cloud-storage-store"
import { useToast } from "@/hooks/use-toast"

export function FilePreviewModal() {
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [pdfPageNum, setPdfPageNum] = useState(1)
  const [pdfTotalPages, setPdfTotalPages] = useState(0)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfDocRef = useRef<any>(null)
  const { toast } = useToast()
  
  const { previewFile, isPreviewOpen, closePreview } = useCloudStoragePreview()
  const { downloadFile } = useCloudStorageOperations()

  // Load file URL when preview opens
  useEffect(() => {
    if (isPreviewOpen && previewFile) {
      setIsLoading(true)
      setFileUrl(null)
      setZoom(100)
      setRotation(0)
      setPdfPageNum(1)
      setPdfTotalPages(0)
      setPdfError(null)
      
      // Get file URL for preview
      const loadFileUrl = async () => {
        try {
          const { getFileUrl } = await import('@/lib/storage-service')
          const currentPath = window.location.pathname.includes('dateien') ? 'user_demo-user' : 'user_demo-user' // TODO: Get actual current path
          const filePath = `${currentPath}/${previewFile.name}`
          const url = await getFileUrl(filePath)
          setFileUrl(url)
        } catch (error) {
          toast({
            title: "Vorschau laden fehlgeschlagen",
            description: error instanceof Error ? error.message : "Unbekannter Fehler",
            variant: "destructive",
          })
          closePreview()
        } finally {
          setIsLoading(false)
        }
      }
      
      loadFileUrl()
    }
  }, [isPreviewOpen, previewFile, toast, closePreview])

  // Clean up URL and PDF document when modal closes
  useEffect(() => {
    return () => {
      if (fileUrl) {
        // Don't revoke signed URLs as they're managed by Supabase
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy()
        pdfDocRef.current = null
      }
    }
  }, [fileUrl])

  // Load PDF document when URL is available
  useEffect(() => {
    if (fileUrl && getFileType(previewFile?.name || '') === 'pdf') {
      loadPdfDocument()
    }
  }, [fileUrl, previewFile])

  const loadPdfDocument = async () => {
    if (!fileUrl || !canvasRef.current) return

    try {
      setPdfError(null)
      
      // Dynamically import PDF.js to avoid SSR issues
      const pdfjsLib = await import('pdfjs-dist')
      
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument(fileUrl)
      const pdf = await loadingTask.promise
      
      pdfDocRef.current = pdf
      setPdfTotalPages(pdf.numPages)
      
      // Render first page
      await renderPdfPage(1)
    } catch (error) {
      console.error('Error loading PDF:', error)
      setPdfError(error instanceof Error ? error.message : 'Failed to load PDF')
    }
  }

  const renderPdfPage = async (pageNumber: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return

    try {
      const page = await pdfDocRef.current.getPage(pageNumber)
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      if (!context) return

      // Calculate scale based on zoom
      const viewport = page.getViewport({ scale: zoom / 100 })
      
      // Set canvas dimensions
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      // Render page
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }
      
      await page.render(renderContext).promise
      setPdfPageNum(pageNumber)
    } catch (error) {
      console.error('Error rendering PDF page:', error)
      setPdfError('Failed to render PDF page')
    }
  }

  const handleDownload = async () => {
    if (previewFile) {
      try {
        await downloadFile(previewFile)
        toast({
          title: "Download gestartet",
          description: `${previewFile.name} wird heruntergeladen.`,
        })
      } catch (error) {
        toast({
          title: "Download fehlgeschlagen",
          description: error instanceof Error ? error.message : "Unbekannter Fehler",
          variant: "destructive",
        })
      }
    }
  }

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 25, 300)
    setZoom(newZoom)
    
    // Re-render PDF page if it's a PDF
    if (getFileType(previewFile?.name || '') === 'pdf' && pdfDocRef.current) {
      renderPdfPage(pdfPageNum)
    }
  }
  
  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 25, 25)
    setZoom(newZoom)
    
    // Re-render PDF page if it's a PDF
    if (getFileType(previewFile?.name || '') === 'pdf' && pdfDocRef.current) {
      renderPdfPage(pdfPageNum)
    }
  }
  
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)

  const handlePrevPage = () => {
    if (pdfPageNum > 1) {
      renderPdfPage(pdfPageNum - 1)
    }
  }

  const handleNextPage = () => {
    if (pdfPageNum < pdfTotalPages) {
      renderPdfPage(pdfPageNum + 1)
    }
  }

  const getFileType = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension || '')) {
      return 'image'
    }
    
    if (extension === 'pdf') {
      return 'pdf'
    }
    
    if (['txt', 'md', 'csv'].includes(extension || '')) {
      return 'text'
    }
    
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension || '')) {
      return 'office'
    }
    
    return 'unsupported'
  }

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return '🖼️'
      case 'pdf':
        return '📄'
      case 'text':
        return '📝'
      case 'office':
        return '📊'
      default:
        return '📁'
    }
  }

  const renderPreviewContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Lade Vorschau...</span>
        </div>
      )
    }

    if (!fileUrl || !previewFile) {
      return (
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Vorschau konnte nicht geladen werden</p>
        </div>
      )
    }

    const fileType = getFileType(previewFile.name)

    if (fileType === 'image') {
      return (
        <div className="flex items-center justify-center min-h-96 max-h-[70vh] overflow-auto border rounded-lg bg-gray-50">
          <div className="relative">
            <img
              src={fileUrl}
              alt={previewFile.name}
              className="max-w-full max-h-full object-contain transition-transform duration-200 cursor-grab active:cursor-grabbing"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              }}
              draggable={false}
              onLoad={(e) => {
                // Reset zoom to fit if image is very large
                const img = e.target as HTMLImageElement
                const container = img.parentElement?.parentElement
                if (container && img.naturalWidth > container.clientWidth) {
                  const fitZoom = Math.min(100, (container.clientWidth / img.naturalWidth) * 100)
                  if (fitZoom < 100) {
                    setZoom(Math.max(25, fitZoom))
                  }
                }
              }}
            />
          </div>
        </div>
      )
    }

    if (fileType === 'pdf') {
      if (pdfError) {
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-destructive mb-4">
                PDF Fehler: {pdfError}
              </p>
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Datei herunterladen
              </Button>
            </div>
          </div>
        )
      }

      return (
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center min-h-96 max-h-[60vh] overflow-auto border rounded-lg bg-gray-50">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            />
          </div>
          
          {pdfTotalPages > 1 && (
            <div className="flex items-center space-x-4 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={pdfPageNum <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm text-muted-foreground">
                Seite {pdfPageNum} von {pdfTotalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={pdfPageNum >= pdfTotalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">
            {getFileTypeIcon(fileType)}
          </div>
          <h3 className="text-lg font-medium mb-2">
            {previewFile.name}
          </h3>
          <p className="text-muted-foreground mb-4">
            Vorschau für diesen Dateityp nicht verfügbar
          </p>
          <div className="text-sm text-muted-foreground mb-4">
            Dateigröße: {(previewFile.size / 1024 / 1024).toFixed(2)} MB
          </div>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Datei herunterladen
          </Button>
        </div>
      </div>
    )
  }

  const fileType = previewFile ? getFileType(previewFile.name) : 'unsupported'
  const showImageControls = fileType === 'image' && !isLoading
  const showPdfControls = fileType === 'pdf' && !isLoading && !pdfError

  return (
    <Dialog open={isPreviewOpen} onOpenChange={closePreview}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate mr-4">
              {previewFile?.name || 'Dateivorschau'}
            </span>
            <div className="flex items-center space-x-2">
              {(showImageControls || showPdfControls) && (
                <>
                  <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                    {zoom}%
                  </span>
                  <Button variant="outline" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  {showImageControls && (
                    <Button variant="outline" size="sm" onClick={handleRotate}>
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-auto">
          {renderPreviewContent()}
        </div>
      </DialogContent>
    </Dialog>
  )
}