"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ExternalLink,
  Copy,
  Check,
  Image as ImageIcon,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface LightboxImageData {
  src: string
  alt?: string
}

interface SupportImageLightboxProps {
  image: LightboxImageData | null
  onClose: () => void
}

export function SupportImageLightbox({ image, onClose }: SupportImageLightboxProps) {
  const [zoom, setZoom] = useState(1)
  const [copied, setCopied] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  useEffect(() => {
    if (image) {
      setZoom(1)
      setImageLoading(true)
      setCopied(false)
    }
  }, [image])

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5))
  const handleResetZoom = () => setZoom(1)

  const handleCopyLink = async () => {
    if (!image?.src) return
    try {
      await navigator.clipboard.writeText(image.src)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleDownload = async () => {
    if (!image?.src) return
    try {
      const response = await fetch(image.src)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = image.alt || "support-image.png"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      window.open(image.src, "_blank", "noopener,noreferrer")
    }
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") handleZoomIn()
      if (e.key === "-" || e.key === "_") handleZoomOut()
      if (e.key === "0") handleResetZoom()
    },
    [],
  )

  useEffect(() => {
    if (image) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [image, handleKeyDown])

  if (!image) return null

  const fileName = image.alt && image.alt !== "image" ? image.alt : "Bildvorschau"

  return (
    <Dialog open={Boolean(image)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton
        className="max-w-[95vw] sm:max-w-4xl md:max-w-5xl h-[88vh] max-h-[88vh] p-0 overflow-hidden border border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl shadow-2xl flex flex-col rounded-2xl"
      >
        <DialogTitle className="sr-only">{fileName}</DialogTitle>

        {/* Top Header Controls */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/60 z-20">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
            <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
              <ImageIcon className="size-4" />
            </div>
            <span className="text-xs font-semibold text-zinc-100 truncate">
              {fileName}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
              ({Math.round(zoom * 100)}%)
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Zoom Controls */}
            <div className="flex items-center bg-zinc-800/90 rounded-lg p-0.5 border border-zinc-700/60 mr-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="size-7 text-zinc-300 hover:text-white hover:bg-zinc-700/80 rounded-md cursor-pointer"
                title="Verkleinern (-)"
              >
                <ZoomOut className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetZoom}
                className="h-7 px-2 text-[11px] font-mono text-zinc-300 hover:text-white hover:bg-zinc-700/80 rounded-md cursor-pointer"
                title="Zoom zurücksetzen (0)"
              >
                {Math.round(zoom * 100)}%
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="size-7 text-zinc-300 hover:text-white hover:bg-zinc-700/80 rounded-md cursor-pointer"
                title="Vergrößern (+)"
              >
                <ZoomIn className="size-3.5" />
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCopyLink}
              className="size-7 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg cursor-pointer"
              title={copied ? "Kopiert!" : "Bild-Link kopieren"}
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="size-7 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg cursor-pointer"
              title="Herunterladen"
            >
              <Download className="size-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              asChild
              className="size-7 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg cursor-pointer"
              title="In neuem Tab öffnen"
            >
              <a href={image.src} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
              </a>
            </Button>

            <div className="h-4 w-px bg-zinc-800 mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-7 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg cursor-pointer"
              title="Schließen (ESC)"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Image Preview Canvas */}
        <div className="flex-1 relative overflow-auto flex items-center justify-center p-4 bg-radial from-zinc-900 to-zinc-950 select-none">
          {imageLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950/60 z-10">
              <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-zinc-400">Bild wird geladen...</span>
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt={image.alt || "Support Image"}
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              transition: "transform 0.15s ease-out",
            }}
            className={cn(
              "max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-300",
              imageLoading ? "opacity-0" : "opacity-100",
            )}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
