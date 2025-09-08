"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FileText, Loader2, Download, X, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
} from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useModalStore } from "@/hooks/use-modal-store"
import { TemplateContextSelector } from "@/components/template-context-selector"
import { TemplatePreview } from "@/components/template-preview"
import { templateProcessor } from "@/lib/template-system/template-processor"
import { templateValidator } from "@/lib/template-system/template-validation"
import { withTemplateErrorHandling } from "@/lib/template-system/template-error-handler"
import { templateErrorFeedback, templateErrorRecoveryManager } from "@/lib/template-system/template-error-recovery"
import type { 
  Template, 
  TemplateContext, 
  TemplateValidationResult 
} from "@/types/template-system"

// Form validation schema
const templateUsageSchema = z.object({
  mieter_id: z.string().optional(),
  wohnung_id: z.string().optional(),
  haus_id: z.string().optional(),
})

type TemplateUsageFormData = z.infer<typeof templateUsageSchema>

// Entity interfaces
interface MieterEntity {
  id: string;
  name: string;
  email?: string;
  telefonnummer?: string;
  einzug?: string;
  auszug?: string;
  wohnung_id?: string;
}

interface WohnungEntity {
  id: string;
  name: string;
  groesse?: number;
  miete?: number;
  haus_id?: string;
}

interface HausEntity {
  id: string;
  name: string;
  ort?: string;
  strasse?: string;
  groesse?: string;
}

interface AvailableEntities {
  mieter: MieterEntity[];
  wohnungen: WohnungEntity[];
  haeuser: HausEntity[];
}

export function TemplateUsageModal() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingEntities, setIsLoadingEntities] = useState(false)
  const [availableEntities, setAvailableEntities] = useState<AvailableEntities>({
    mieter: [],
    wohnungen: [],
    haeuser: []
  })
  const [templateContext, setTemplateContext] = useState<TemplateContext>({})
  const [validationResult, setValidationResult] = useState<TemplateValidationResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const { toast } = useToast()
  
  const {
    isTemplateUsageModalOpen,
    templateUsageModalData,
    closeTemplateUsageModal
  } = useModalStore()
  
  const template = templateUsageModalData?.template
  const onGenerate = templateUsageModalData?.onGenerate

  const form = useForm<TemplateUsageFormData>({
    resolver: zodResolver(templateUsageSchema),
    defaultValues: {
      mieter_id: "",
      wohnung_id: "",
      haus_id: ""
    }
  })

  // Load available entities when modal opens
  useEffect(() => {
    if (isTemplateUsageModalOpen && template) {
      loadAvailableEntities()
      form.reset()
      setTemplateContext({
        datum: new Date(),
        vermieter: {
          id: 'current-user',
          name: 'Vermieter Name',
          email: 'vermieter@example.com'
        }
      })
      setValidationResult(null)
      setShowPreview(false)
    }
  }, [isTemplateUsageModalOpen, template, form])

  // Update context when form values change
  useEffect(() => {
    if (isTemplateUsageModalOpen && template) {
      updateTemplateContext()
    }
  }, [form.watch(), isTemplateUsageModalOpen, template])

  const loadAvailableEntities = async () => {
    setIsLoadingEntities(true)
    try {
      // Load entities in parallel
      const [mieterResponse, wohnungenResponse, haeuserResponse] = await Promise.all([
        fetch('/api/mieter'),
        fetch('/api/wohnungen'),
        fetch('/api/haeuser')
      ])

      if (!mieterResponse.ok || !wohnungenResponse.ok || !haeuserResponse.ok) {
        throw new Error('Failed to load entities')
      }

      const [mieterData, wohnungenData, haeuserData] = await Promise.all([
        mieterResponse.json(),
        wohnungenResponse.json(),
        haeuserResponse.json()
      ])

      setAvailableEntities({
        mieter: mieterData || [],
        wohnungen: wohnungenData || [],
        haeuser: haeuserData || []
      })
    } catch (error) {
      console.error('Error loading entities:', error)
      toast({
        title: "Fehler beim Laden",
        description: "Die verfügbaren Entitäten konnten nicht geladen werden.",
        variant: "destructive"
      })
    } finally {
      setIsLoadingEntities(false)
    }
  }

  const updateTemplateContext = async () => {
    if (!template) return

    const formValues = form.getValues()
    const context = await buildTemplateContext(formValues)
    setTemplateContext(context)
  }

  const buildTemplateContext = async (formValues: TemplateUsageFormData): Promise<TemplateContext> => {
    const context: TemplateContext = {
      datum: new Date(),
      vermieter: {
        id: 'current-user', // This would come from auth context
        name: 'Vermieter Name', // This would come from user profile
        email: 'vermieter@example.com' // This would come from user profile
      }
    }

    // Add selected mieter
    if (formValues.mieter_id) {
      const mieter = availableEntities.mieter.find(m => m.id === formValues.mieter_id)
      if (mieter) {
        context.mieter = {
          id: mieter.id,
          name: mieter.name,
          email: mieter.email,
          telefonnummer: mieter.telefonnummer,
          einzug: mieter.einzug,
          auszug: mieter.auszug,
          wohnung_id: mieter.wohnung_id
        }
      }
    }

    // Add selected wohnung
    if (formValues.wohnung_id) {
      const wohnung = availableEntities.wohnungen.find(w => w.id === formValues.wohnung_id)
      if (wohnung) {
        context.wohnung = {
          id: wohnung.id,
          name: wohnung.name,
          groesse: wohnung.groesse,
          miete: wohnung.miete,
          haus_id: wohnung.haus_id
        }
      }
    }

    // Add selected haus
    if (formValues.haus_id) {
      const haus = availableEntities.haeuser.find(h => h.id === formValues.haus_id)
      if (haus) {
        context.haus = {
          id: haus.id,
          name: haus.name,
          ort: haus.ort,
          strasse: haus.strasse,
          groesse: haus.groesse ? parseFloat(haus.groesse) : undefined
        }
      }
    }

    return context
  }

  const validateContextRequirements = (): { isValid: boolean; missingContext: string[] } => {
    const formValues = form.getValues()
    const missingContext: string[] = []

    // Check each required context type
    for (const contextType of template.kontext_anforderungen) {
      switch (contextType) {
        case 'mieter':
          if (!formValues.mieter_id) {
            missingContext.push('Mieter')
          }
          break
        case 'wohnung':
          if (!formValues.wohnung_id) {
            missingContext.push('Wohnung')
          }
          break
        case 'haus':
          if (!formValues.haus_id) {
            missingContext.push('Haus')
          }
          break
      }
    }

    return {
      isValid: missingContext.length === 0,
      missingContext
    }
  }

  const handlePreview = () => {
    setShowPreview(!showPreview)
  }

  const handleValidationChange = (result: TemplateValidationResult) => {
    setValidationResult(result)
  }

  const handleGenerate = async () => {
    setIsLoading(true)
    
    // Comprehensive validation before generation
    const usageValidation = await templateValidator.validateForUsage(template, templateContext)
    
    if (!usageValidation.isValid) {
      templateErrorFeedback.showValidationFeedback(usageValidation, {
        showWarnings: true,
        onFix: (error) => {
          // Try to suggest context fixes
          templateErrorRecoveryManager.attemptRecovery(
            {
              type: 'context',
              message: error,
              errorId: 'context_validation',
              timestamp: new Date(),
              recoveryActions: [],
              retryable: false,
              severity: 'medium'
            } as any,
            {
              onContextSuggestion: (contexts: string[]) => {
                toast({
                  title: "Kontext-Vorschlag",
                  description: `Bitte wählen Sie folgende Kontexte aus: ${contexts.join(', ')}`
                })
              }
            }
          )
        }
      })
      setIsLoading(false)
      return
    }

    const result = await withTemplateErrorHandling(
      async () => {
        // Process template to get the final content
        const processingResult = templateProcessor.processTemplate(template.inhalt, templateContext)
        
        if (!processingResult.success) {
          throw new Error(`Template processing failed: ${processingResult.errors?.join(', ')}`)
        }
        
        return processingResult.processedContent
      },
      {
        operation: 'Template-Verarbeitung',
        templateId: template.id,
        userId: 'current-user', // This would come from auth context
        timestamp: new Date(),
        additionalData: { 
          templateName: template.titel,
          contextTypes: Object.keys(templateContext).filter(key => key !== 'datum' && key !== 'vermieter')
        }
      },
      {
        retryCount: 2,
        retryDelay: 1000,
        showToUser: true
      }
    )
    
    if (result.success && result.data) {
      if (onGenerate) {
        onGenerate(result.data)
      }
      
      toast({
        title: "Dokument erstellt",
        description: "Das Dokument wurde erfolgreich aus dem Template erstellt."
      })
      
      closeTemplateUsageModal()
    } else if (result.error) {
      // Try error recovery
      const recoveryResult = await templateErrorRecoveryManager.attemptRecovery(
        result.error,
        {
          content: template.inhalt,
          onContentChange: (content: string) => {
            // This would update the template content if auto-correction is possible
            console.log('Auto-corrected content:', content)
          },
          retryOperation: () => handleGenerate()
        }
      )
      
      if (!recoveryResult.recovered) {
        templateErrorFeedback.showErrorFeedback(result.error, {
          showRecoveryActions: true,
          allowRetry: result.error.retryable,
          onRetry: () => handleGenerate()
        })
      }
    }
    
    setIsLoading(false)
  }



  const contextValidation = validateContextRequirements()
  const canGenerate = contextValidation.isValid && validationResult?.isValid

  if (!template) {
    return null
  }

  return (
    <Dialog open={isTemplateUsageModalOpen} onOpenChange={closeTemplateUsageModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Template verwenden: {template.titel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Info */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Template-Informationen</h3>
              <Badge variant="outline">{template.kategorie}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Kategorie: {template.kategorie}
            </p>
            {template.kontext_anforderungen.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Erforderliche Kontexte:</p>
                <div className="flex flex-wrap gap-2">
                  {template.kontext_anforderungen.map((context: string) => (
                    <Badge key={context} variant="secondary">
                      {context}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Context Selection Form */}
          <Form {...form}>
            <TemplateContextSelector
              template={template}
              control={form.control}
              availableEntities={availableEntities}
              isLoading={isLoadingEntities}
            />

            {/* Validation Status */}
            {!contextValidation.isValid && contextValidation.missingContext.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Bitte wählen Sie folgende erforderliche Kontexte aus: {contextValidation.missingContext.join(', ')}
                </AlertDescription>
              </Alert>
            )}
          </Form>

          {/* Preview Section */}
          <TemplatePreview
            template={template}
            context={templateContext}
            isVisible={showPreview}
            onToggleVisibility={handlePreview}
            onValidationChange={handleValidationChange}
          />

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={closeTemplateUsageModal}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>

            <div className="flex space-x-3">
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate || isLoading || isLoadingEntities}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isLoading ? "Erstelle..." : "Dokument erstellen"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}