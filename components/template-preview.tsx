"use client"

import { useEffect, useState, useMemo } from "react"
import { CheckCircle, AlertTriangle, Eye, EyeOff, RefreshCw, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { templateProcessor } from "@/lib/template-system/template-processor"
import { placeholderEngine } from "@/lib/template-system/placeholder-engine"
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
  enableRealTimeUpdates?: boolean;
  showDetailedValidation?: boolean;
}

export function TemplatePreview({
  template,
  context,
  isVisible = false,
  onToggleVisibility,
  onValidationChange,
  enableRealTimeUpdates = true,
  showDetailedValidation = true
}: TemplatePreviewProps) {
  const [processingResult, setProcessingResult] = useState<TemplateProcessingResult | null>(null)
  const [previewContent, setPreviewContent] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastProcessedAt, setLastProcessedAt] = useState<Date | null>(null)
  const [processingProgress, setProcessingProgress] = useState(0)

  // Memoize placeholder analysis for performance
  const placeholderAnalysis = useMemo(() => {
    if (!template?.inhalt) return { placeholders: [], validationErrors: [] }
    
    const placeholders = placeholderEngine.parsePlaceholders(template.inhalt)
    const validationErrors = placeholderEngine.validatePlaceholders(template.inhalt)
    
    return { placeholders, validationErrors }
  }, [template?.inhalt])

  // Process template when context changes (with debouncing for real-time updates)
  useEffect(() => {
    if (!template || !enableRealTimeUpdates) return

    const timeoutId = setTimeout(() => {
      processTemplate()
    }, 300) // 300ms debounce for real-time updates

    return () => clearTimeout(timeoutId)
  }, [template, context, enableRealTimeUpdates])

  // Process template immediately when not using real-time updates
  useEffect(() => {
    if (template && context && !enableRealTimeUpdates) {
      processTemplate()
    }
  }, [template, context, enableRealTimeUpdates])

  const processTemplate = async () => {
    if (!template?.inhalt) return

    setIsProcessing(true)
    setProcessingProgress(0)
    
    try {
      // Simulate processing steps for progress indication
      setProcessingProgress(25)
      
      // Validate context requirements first
      const contextValidation = templateProcessor.validateContext(template.inhalt, context)
      setProcessingProgress(50)
      
      // Process the template
      const result = templateProcessor.processTemplate(template.inhalt, context)
      setProcessingProgress(75)
      
      setProcessingResult(result)
      setPreviewContent(result.processedContent)
      setLastProcessedAt(new Date())
      setProcessingProgress(100)

      // Enhanced validation result with detailed analysis
      if (onValidationChange) {
        const usedPlaceholders = templateProcessor.getUsedPlaceholders(template.inhalt)
        const validationResult: TemplateValidationResult = {
          isValid: result.success && result.unresolvedPlaceholders.length === 0 && contextValidation.isValid,
          errors: [
            ...(result.errors || []),
            ...(!contextValidation.isValid ? [`Fehlende Kontexte: ${contextValidation.missingContext.join(', ')}`] : []),
            ...placeholderAnalysis.validationErrors.map(e => e.message)
          ],
          warnings: [
            ...result.unresolvedPlaceholders.map(p => `Unaufgelöster Platzhalter: ${p}`),
            ...(result.success && result.unresolvedPlaceholders.length > 0 ? ['Einige Platzhalter konnten nicht aufgelöst werden'] : [])
          ],
          placeholders: usedPlaceholders.map(p => p.key)
        }
        onValidationChange(validationResult)
      }
    } catch (error) {
      console.error('Error processing template:', error)
      const errorResult: TemplateProcessingResult = {
        processedContent: template.inhalt,
        unresolvedPlaceholders: [],
        success: false,
        errors: [error instanceof Error ? error.message : 'Unbekannter Fehler beim Verarbeiten des Templates']
      }
      setProcessingResult(errorResult)
      setPreviewContent(template.inhalt)
      setProcessingProgress(100)

      if (onValidationChange) {
        onValidationChange({
          isValid: false,
          errors: [error instanceof Error ? error.message : 'Unbekannter Fehler beim Verarbeiten des Templates'],
          warnings: [],
          placeholders: []
        })
      }
    } finally {
      setIsProcessing(false)
      // Reset progress after a short delay
      setTimeout(() => setProcessingProgress(0), 1000)
    }
  }

  const getProcessingStatusIcon = () => {
    if (isProcessing) {
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
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
      return enableRealTimeUpdates ? "Aktualisiere Vorschau..." : "Verarbeite Template..."
    }
    
    if (!processingResult) {
      return "Bereit zur Verarbeitung"
    }

    if (processingResult.success && processingResult.unresolvedPlaceholders.length === 0) {
      const timeAgo = lastProcessedAt ? ` (vor ${Math.round((Date.now() - lastProcessedAt.getTime()) / 1000)}s)` : ""
      return `Erfolgreich verarbeitet${timeAgo}`
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

  // Manual refresh function
  const handleManualRefresh = () => {
    processTemplate()
  }

  // Calculate resolution percentage for visual indicator
  const resolutionPercentage = useMemo(() => {
    if (!processingResult || placeholderAnalysis.placeholders.length === 0) return 100
    
    const resolvedCount = placeholderAnalysis.placeholders.length - processingResult.unresolvedPlaceholders.length
    return Math.round((resolvedCount / placeholderAnalysis.placeholders.length) * 100)
  }, [processingResult, placeholderAnalysis.placeholders])

  // Render content with visual indicators for resolved/unresolved placeholders
  const renderHighlightedContent = (content: string) => {
    if (!processingResult || !placeholderAnalysis.placeholders.length) {
      return content
    }

    let highlightedContent = content
    const resolvedPlaceholders = placeholderAnalysis.placeholders.filter(
      p => !processingResult.unresolvedPlaceholders.includes(p)
    )
    const unresolvedPlaceholders = processingResult.unresolvedPlaceholders

    // Highlight resolved placeholders (green background)
    resolvedPlaceholders.forEach(placeholder => {
      const definition = placeholderEngine.getPlaceholderDefinition(placeholder)
      if (definition) {
        // Find the resolved value in the processed content
        const originalRegex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
        // Since the placeholder is resolved, we need to find what it was replaced with
        // For now, we'll just mark the areas where placeholders were
        highlightedContent = highlightedContent.replace(originalRegex, `<mark class="bg-green-100 text-green-800 px-1 rounded">${placeholder}</mark>`)
      }
    })

    // Highlight unresolved placeholders (orange background)
    unresolvedPlaceholders.forEach(placeholder => {
      const regex = new RegExp(`\\[${placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g')
      highlightedContent = highlightedContent.replace(regex, `<mark class="bg-orange-100 text-orange-800 px-1 rounded">[${placeholder}]</mark>`)
    })

    return (
      <div 
        dangerouslySetInnerHTML={{ __html: highlightedContent }}
        className="font-mono"
      />
    )
  }

  return (
    <div className="space-y-4">
      <Separator />
      
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="font-medium flex items-center">
            Vorschau
            {enableRealTimeUpdates && (
              <Badge variant="outline" className="ml-2 text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </h3>
          <div className="flex items-center space-x-2">
            {getProcessingStatusIcon()}
            <span className={`text-sm ${getProcessingStatusColor()}`}>
              {getProcessingStatusText()}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!enableRealTimeUpdates && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isProcessing}
            >
              <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
            </Button>
          )}
          
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
                  Ausblenden
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Anzeigen
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Processing Progress */}
      {isProcessing && processingProgress > 0 && (
        <div className="space-y-2">
          <Progress value={processingProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Verarbeitung läuft... {processingProgress}%
          </p>
        </div>
      )}

      {/* Resolution Status Bar */}
      {processingResult && placeholderAnalysis.placeholders.length > 0 && (
        <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Platzhalter-Auflösung</span>
              <span className="font-medium">{resolutionPercentage}%</span>
            </div>
            <Progress value={resolutionPercentage} className="h-2" />
          </div>
          <div className="text-xs text-muted-foreground">
            {placeholderAnalysis.placeholders.length - (processingResult.unresolvedPlaceholders.length || 0)} / {placeholderAnalysis.placeholders.length}
          </div>
        </div>
      )}

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
              <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                <span>{previewContent.length} Zeichen</span>
                {lastProcessedAt && (
                  <span>Aktualisiert: {lastProcessedAt.toLocaleTimeString('de-DE')}</span>
                )}
              </div>
            </div>
            
            <div className="border rounded-lg bg-background">
              <div className="p-4 max-h-96 overflow-y-auto">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {renderHighlightedContent(previewContent || template?.inhalt || '')}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Validation Results */}
          {showDetailedValidation && placeholderAnalysis.validationErrors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Validierungsfehler</h4>
              <div className="space-y-2">
                {placeholderAnalysis.validationErrors.map((error, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {error.message}
                      {error.placeholder && (
                        <Badge variant="outline" className="ml-2">
                          {error.placeholder}
                        </Badge>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Placeholder Analysis */}
          {showDetailedValidation && placeholderAnalysis.placeholders.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Platzhalter-Analyse</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {placeholderAnalysis.placeholders.map((placeholder) => {
                  const isResolved = !processingResult?.unresolvedPlaceholders.includes(placeholder)
                  const definition = placeholderEngine.getPlaceholderDefinition(placeholder)
                  
                  return (
                    <div
                      key={placeholder}
                      className={`p-3 rounded-lg border ${
                        isResolved 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-orange-50 border-orange-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono">{placeholder}</code>
                        {isResolved ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                      {definition && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {definition.description}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Template Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="font-medium">Original</div>
              <div className="text-muted-foreground">{template?.inhalt?.length || 0} Zeichen</div>
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