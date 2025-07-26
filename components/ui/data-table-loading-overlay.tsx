"use client"

import * as React from "react"
import { Loader2, Download, FileText, File } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface DataTableLoadingOverlayProps {
  isVisible: boolean
  type: 'export' | 'refresh' | 'bulk-action' | 'generic'
  format?: 'csv' | 'pdf'
  progress?: number
  message?: string
  className?: string
}

export function DataTableLoadingOverlay({
  isVisible,
  type,
  format,
  progress,
  message,
  className,
}: DataTableLoadingOverlayProps) {
  if (!isVisible) return null

  const getLoadingContent = () => {
    switch (type) {
      case 'export':
        return {
          icon: format === 'pdf' ? File : FileText,
          title: `${format?.toUpperCase()} Export`,
          description: message || `Daten werden als ${format?.toUpperCase()} exportiert...`,
        }
      case 'refresh':
        return {
          icon: Loader2,
          title: "Daten aktualisieren",
          description: message || "Tabellendaten werden aktualisiert...",
        }
      case 'bulk-action':
        return {
          icon: Loader2,
          title: "Aktion ausführen",
          description: message || "Aktion wird auf ausgewählte Elemente angewendet...",
        }
      default:
        return {
          icon: Loader2,
          title: "Laden",
          description: message || "Vorgang wird ausgeführt...",
        }
    }
  }

  const content = getLoadingContent()
  const Icon = content.icon

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-title"
      aria-describedby="loading-description"
    >
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Icon 
              className={cn(
                "h-8 w-8 text-primary",
                type !== 'export' && "animate-spin"
              )} 
            />
          </div>
          <CardTitle id="loading-title" className="text-lg">
            {content.title}
          </CardTitle>
          <CardDescription id="loading-description">
            {content.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {typeof progress === 'number' && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">
                {Math.round(progress)}% abgeschlossen
              </p>
            </div>
          )}
          {typeof progress !== 'number' && (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Bitte warten...
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {content.description}
        {typeof progress === 'number' && ` ${Math.round(progress)}% abgeschlossen`}
      </div>
    </div>
  )
}

// Specialized loading overlays for common scenarios
export function ExportLoadingOverlay({
  isVisible,
  format,
  progress,
  className,
}: {
  isVisible: boolean
  format: 'csv' | 'pdf'
  progress?: number
  className?: string
}) {
  return (
    <DataTableLoadingOverlay
      isVisible={isVisible}
      type="export"
      format={format}
      progress={progress}
      className={className}
    />
  )
}

export function RefreshLoadingOverlay({
  isVisible,
  message,
  className,
}: {
  isVisible: boolean
  message?: string
  className?: string
}) {
  return (
    <DataTableLoadingOverlay
      isVisible={isVisible}
      type="refresh"
      message={message}
      className={className}
    />
  )
}

export function BulkActionLoadingOverlay({
  isVisible,
  actionName,
  progress,
  className,
}: {
  isVisible: boolean
  actionName: string
  progress?: number
  className?: string
}) {
  return (
    <DataTableLoadingOverlay
      isVisible={isVisible}
      type="bulk-action"
      message={`${actionName} wird ausgeführt...`}
      progress={progress}
      className={className}
    />
  )
}