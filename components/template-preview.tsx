"use client"

import { useEffect, useState } from "react"
import { CheckCircle, AlertTriangle, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { templateProcessor } from "@/lib/template-system/template-processor"
import type { 
  Template, 
  TemplateContext, 
  TemplateProcessingResult,
  TemplateValidationResult 
} from "@/types/template-system"

interface TemplatePreviewProps {
  template: Template;
  context: TemplateContext;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  onValidationChange?: (result: TemplateValidationResult) => void;
}

export function TemplatePreview({
  template,
  context,
  isVisible = false,
  onToggleVisibility,
  onValidationChange
}: TemplatePreviewProps) {
  const [processingResult, setProcessingResult] = useState<TemplateProcessingResult | null>(null)
  const [previewContent, setPreviewContent] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Process template when context changes
  useEffect(() => {
    if (template && context) {
      processTemplate()
    }
  }, [template, context])

  const processTemplate = async () => {
    setIsProcessing(true)
    try {
      const result = templateProcessor.processTemplate(template.inhalt, context)
      setProcessingResult(result)
      setPreviewContent(result.processedContent)

      // Notify parent of validation result
      if (onValidationChange) {
        const validationResult: TemplateValidationResult = {
          isValid: result.success && result.unresolvedPlaceholders.length === 0,
          errors: result.errors || [],
          warnings: result.unresolvedPlaceholders.map(p => `Unaufgelöster Platzhalter: ${p}`),
          placeholders: templateProcessor.getUsedPlaceholders(template.inhalt).map(p => p.key)
        }
        onValidationChange(validationResult)
      }
    } catch (error) {
      console.error('Error processing template:', error)
      const errorResult: TemplateProcessingResult = {
        processedContent: template.inhalt,
        unresolvedPlaceholders: [],
        success: false,
        errors: ['Fehler beim Verarbeiten des Templates']
      }
      setProcessingResult(errorResult)
      setPreviewContent(template.inhalt)

      if (onValidationChange) {
        onValidationChange({
          isValid: false,
          errors: ['Fehler beim Verarbeiten des Templates'],
          warnings: [],
          placeholders: []
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const getProcessingStatusIcon = () => {
    if (isProcessing) {
      return <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    }
    
    if (!processingResult) {
      return <AlertTriangle className="h-4 w-4 text-muted-foreground" />
    }

    if (processingResult.success && processingResult.unresolvedPlaceholders.length === 0) {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    }

    if (processingResult.success && processingResult.unresolvedPlaceholders.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-orange-600" />
    }

    return <AlertTriangle className="h-4 w-4 text-red-600" />
  }

  const getProcessingStatusText = () => {
    if (isProcessing) {
      return "Verarbeite Template..."
    }
    
    if (!processingResult) {
      return "Noch nicht verarbeitet"
    }

    if (processingResult.success && processingResult.unresolvedPlaceholders.length === 0) {
      return "Erfolgreich verarbeitet"
    }

    if (processingResult.success && processingResult.unresolvedPlaceholders.length > 0) {
      return `${processingResult.unresolvedPlaceholders.length} unaufgelöste Platzhalter`
    }

    return "Verarbeitungsfehler"
  }

  const getProcessingStatusColor = () => {
    if (isProcessing || !processingResult) {
      return "text-muted-foreground"
    }

    if (processingResult.success && processingResult.unresolvedPlaceholders.length === 0) {
      return "text-green-600"
    }

    if (processingResult.success && processingResult.unresolvedPlaceholders.length > 0) {
      return "text-orange-600"
    }

    return "text-red-600"
  }

  return (
    <div className="space-y-4">
      <Separator />
      
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="font-medium">Vorschau</h3>
          <div className="flex items-center space-x-2">
            {getProcessingStatusIcon()}
            <span className={`text-sm ${getProcessingStatusColor()}`}>
              {getProcessingStatusText()}
            </span>
          </div>
        </div>
        
        {onToggleVisibility && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleVisibility}
          >
            {isVisible ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Vorschau ausblenden
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Vorschau anzeigen
              </>
            )}
          </Button>
        )}
      </div>

      {/* Preview Content */}
      {isVisible && (
        <div className="space-y-4">
          {/* Processing Errors */}
          {processingResult && !processingResult.success && processingResult.errors && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Verarbeitungsfehler:</p>
                  {processingResult.errors.map((error, index) => (
                    <div key={index} className="text-sm">{error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Unresolved Placeholders Warning */}
          {processingResult && processingResult.success && processingResult.unresolvedPlaceholders.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Unaufgelöste Platzhalter:</p>
                  <p className="text-sm text-muted-foreground">
                    Diese Platzhalter konnten nicht mit Daten gefüllt werden und werden als Fallback-Text angezeigt.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {processingResult.unresolvedPlaceholders.map((placeholder) => (
                      <Badge key={placeholder} variant="outline" className="text-orange-600 border-orange-200">
                        {placeholder}
                      </Badge>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {processingResult && processingResult.success && processingResult.unresolvedPlaceholders.length === 0 && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Alle Platzhalter wurden erfolgreich aufgelöst. Das Template ist bereit zur Verwendung.
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Verarbeiteter Inhalt</h4>
              <div className="text-xs text-muted-foreground">
                {previewContent.length} Zeichen
              </div>
            </div>
            
            <div className="border rounded-lg bg-background">
              <div className="p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {previewContent || template.inhalt}
                </pre>
              </div>
            </div>
          </div>

          {/* Template Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="font-medium">Original</div>
              <div className="text-muted-foreground">{template.inhalt.length} Zeichen</div>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="font-medium">Verarbeitet</div>
              <div className="text-muted-foreground">{previewContent.length} Zeichen</div>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="font-medium">Platzhalter</div>
              <div className="text-muted-foreground">
                {processingResult ? 
                  templateProcessor.getUsedPlaceholders(template.inhalt).length : 
                  0
                } gefunden
              </div>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="font-medium">Unaufgelöst</div>
              <div className="text-muted-foreground">
                {processingResult?.unresolvedPlaceholders.length || 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}