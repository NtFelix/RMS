"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FileText, Loader2, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useModalStore } from "@/hooks/use-modal-store"
import { EnhancedFileEditor } from "@/components/enhanced-file-editor"
import { CONTEXT_MAPPINGS, type ContextType, type Template } from "@/types/template-system"
import { templateValidator } from "@/lib/template-system/template-validation"
import { templateErrorHandler, withTemplateErrorHandling } from "@/lib/template-system/template-error-handler"
import { templateErrorFeedback, templateErrorRecoveryManager } from "@/lib/template-system/template-error-recovery"

// Form validation schema
const templateCreateSchema = z.object({
  titel: z.string()
    .min(1, "Template-Name ist erforderlich")
    .max(100, "Template-Name darf maximal 100 Zeichen lang sein")
    .regex(/^[^<>:"/\\|?*]+$/, "Template-Name enthält ungültige Zeichen"),
  kategorie: z.string()
    .min(1, "Kategorie ist erforderlich"),
  kontext_anforderungen: z.array(z.string()).default([]),
  inhalt: z.string()
    .min(1, "Template-Inhalt ist erforderlich")
})

type TemplateCreateFormData = z.infer<typeof templateCreateSchema>

// Available template categories
const TEMPLATE_CATEGORIES = [
  { value: "mail", label: "E-Mail", description: "E-Mail-Vorlagen für Kommunikation" },
  { value: "vertrag", label: "Vertrag", description: "Mietverträge und rechtliche Dokumente" },
  { value: "kuendigung", label: "Kündigung", description: "Kündigungsschreiben und -mitteilungen" },
  { value: "rechnung", label: "Rechnung", description: "Rechnungen und Abrechnungen" },
  { value: "mahnung", label: "Mahnung", description: "Mahnungen und Zahlungserinnerungen" },
  { value: "allgemein", label: "Allgemein", description: "Allgemeine Dokumente und Briefe" }
] as const

// Available context types
const CONTEXT_TYPES = [
  { value: "mieter", label: "Mieter", description: "Mieter-Informationen erforderlich" },
  { value: "wohnung", label: "Wohnung", description: "Wohnungs-Informationen erforderlich" },
  { value: "haus", label: "Haus", description: "Haus-Informationen erforderlich" },
  { value: "mail", label: "E-Mail", description: "E-Mail-spezifische Informationen" },
  { value: "vertrag", label: "Vertrag", description: "Vertrags-spezifische Informationen" },
  { value: "kuendigung", label: "Kündigung", description: "Kündigungs-spezifische Informationen" }
] as const

export function TemplateCreateModal() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [editorContent, setEditorContent] = useState("")
  const { toast } = useToast()
  
  const {
    isTemplateCreateModalOpen,
    templateCreateModalData,
    isTemplateCreateModalDirty,
    closeTemplateCreateModal,
    setTemplateCreateModalDirty
  } = useModalStore()

  const form = useForm<TemplateCreateFormData>({
    resolver: zodResolver(templateCreateSchema),
    defaultValues: {
      titel: "",
      kategorie: "",
      kontext_anforderungen: [],
      inhalt: ""
    }
  })

  // Watch form changes to set dirty state
  useEffect(() => {
    const subscription = form.watch(() => {
      const values = form.getValues()
      const hasChanges = values.titel || values.kategorie || values.kontext_anforderungen.length > 0 || values.inhalt
      setTemplateCreateModalDirty(!!hasChanges)
    })
    return () => subscription.unsubscribe()
  }, [form, setTemplateCreateModalDirty])

  // Update suggested context requirements based on category
  useEffect(() => {
    const kategorie = form.watch("kategorie")
    if (kategorie && CONTEXT_MAPPINGS[kategorie as keyof typeof CONTEXT_MAPPINGS]) {
      const suggestedContexts = CONTEXT_MAPPINGS[kategorie as keyof typeof CONTEXT_MAPPINGS]
      form.setValue("kontext_anforderungen", [...suggestedContexts])
    }
  }, [form.watch("kategorie")])

  // Reset form when modal opens
  useEffect(() => {
    if (isTemplateCreateModalOpen) {
      form.reset({
        titel: "",
        kategorie: "",
        kontext_anforderungen: [],
        inhalt: ""
      })
      setEditorContent("")
      setShowEditor(false)
      setTemplateCreateModalDirty(false)
    }
  }, [isTemplateCreateModalOpen, form, setTemplateCreateModalDirty])

  const handleClose = () => {
    closeTemplateCreateModal()
  }

  const handleOpenEditor = () => {
    setEditorContent(form.getValues("inhalt"))
    setShowEditor(true)
  }

  const handleEditorSave = (content: string) => {
    form.setValue("inhalt", content)
    setEditorContent(content)
    setShowEditor(false)
    setTemplateCreateModalDirty(true)
  }

  const handleEditorClose = () => {
    setShowEditor(false)
  }

  const checkTemplateNameUniqueness = async (titel: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/vorlagen/check-name?titel=${encodeURIComponent(titel)}`)
      if (!response.ok) {
        throw new Error('Failed to check template name')
      }
      const result = await response.json()
      return result.isUnique
    } catch (error) {
      console.error('Error checking template name:', error)
      return true // Allow submission if check fails
    }
  }

  const onSubmit = async (data: TemplateCreateFormData) => {
    setIsSubmitting(true)
    
    // Comprehensive validation before submission
    const validationResult = await templateValidator.validateForCreation(data)
    
    if (!validationResult.isValid) {
      templateErrorFeedback.showValidationFeedback(validationResult, {
        showWarnings: true,
        onFix: (error) => {
          // Try to auto-fix common validation errors
          console.log('Attempting to fix error:', error)
        }
      })
      setIsSubmitting(false)
      return
    }
    
    // Show warnings if any
    if (validationResult.warnings.length > 0) {
      templateErrorFeedback.showValidationFeedback(validationResult, {
        showWarnings: true
      })
    }
    
    const result = await withTemplateErrorHandling(
      async () => {
        // Check template name uniqueness
        const isUnique = await checkTemplateNameUniqueness(data.titel)
        if (!isUnique) {
          throw new Error('TEMPLATE_NAME_EXISTS')
        }

        // Create template
        const response = await fetch('/api/vorlagen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            titel: data.titel,
            inhalt: data.inhalt,
            kategorie: data.kategorie,
            kontext_anforderungen: data.kontext_anforderungen
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create template')
        }

        return await response.json()
      },
      {
        operation: 'Template-Erstellung',
        templateId: undefined,
        userId: 'current-user', // This would come from auth context
        timestamp: new Date(),
        additionalData: { templateName: data.titel, category: data.kategorie }
      },
      {
        retryCount: 2,
        retryDelay: 1000,
        showToUser: true
      }
    )
    
    if (result.success && result.data) {
      const template: Template = result.data

      toast({
        title: "Template erstellt",
        description: `Das Template "${data.titel}" wurde erfolgreich erstellt.`
      })

      // Call success callback if provided
      if (templateCreateModalData?.onSuccess) {
        templateCreateModalData.onSuccess(template)
      }

      // Close modal
      handleClose()
    } else if (result.error) {
      // Handle specific error cases
      if (result.error.message.includes('TEMPLATE_NAME_EXISTS')) {
        form.setError("titel", {
          type: "manual",
          message: "Ein Template mit diesem Namen existiert bereits"
        })
      } else {
        // Try error recovery
        const recoveryResult = await templateErrorRecoveryManager.attemptRecovery(
          result.error,
          {
            retryOperation: () => onSubmit(data)
          }
        )
        
        if (!recoveryResult.recovered) {
          templateErrorFeedback.showErrorFeedback(result.error, {
            showRecoveryActions: true,
            allowRetry: result.error.retryable,
            onRetry: () => onSubmit(data)
          })
        }
      }
    }
    
    setIsSubmitting(false)
  }

  const selectedCategory = form.watch("kategorie")
  const selectedContexts = form.watch("kontext_anforderungen")
  const contentLength = form.watch("inhalt")?.length || 0

  return (
    <>
      <Dialog open={isTemplateCreateModalOpen && !showEditor} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Neues Template erstellen
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Template Name */}
              <FormField
                control={form.control}
                name="titel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template-Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. Mietvertrag Standard, Kündigung Vorlage..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Ein eindeutiger Name für Ihr Template
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Selection */}
              <FormField
                control={form.control}
                name="kategorie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategorie *</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-3">
                        {TEMPLATE_CATEGORIES.map((category) => (
                          <div
                            key={category.value}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              field.value === category.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => field.onChange(category.value)}
                          >
                            <div className="font-medium">{category.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {category.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Context Requirements */}
              <FormField
                control={form.control}
                name="kontext_anforderungen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kontext-Anforderungen</FormLabel>
                    <FormDescription>
                      Welche Informationen werden für dieses Template benötigt?
                      {selectedCategory && CONTEXT_MAPPINGS[selectedCategory as keyof typeof CONTEXT_MAPPINGS] && (
                        <span className="block mt-1 text-blue-600">
                          Automatisch vorgeschlagen basierend auf der Kategorie "{selectedCategory}"
                        </span>
                      )}
                    </FormDescription>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-3">
                        {CONTEXT_TYPES.map((context) => (
                          <div key={context.value} className="flex items-start space-x-2">
                            <Checkbox
                              id={context.value}
                              checked={field.value.includes(context.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, context.value])
                                } else {
                                  field.onChange(field.value.filter((v) => v !== context.value))
                                }
                              }}
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={context.value}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {context.label}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {context.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    {selectedContexts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedContexts.map((context) => (
                          <Badge key={context} variant="secondary">
                            {CONTEXT_TYPES.find(c => c.value === context)?.label || context}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Content Editor */}
              <FormField
                control={form.control}
                name="inhalt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template-Inhalt *</FormLabel>
                    <FormDescription>
                      Der Inhalt Ihres Templates. Verwenden Sie @ für Platzhalter.
                    </FormDescription>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="border rounded-lg p-4 bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              Template-Inhalt
                              {contentLength > 0 && (
                                <span className="ml-2 text-muted-foreground">
                                  ({contentLength} Zeichen)
                                </span>
                              )}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleOpenEditor}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Editor öffnen
                            </Button>
                          </div>
                          {field.value ? (
                            <div className="text-sm text-muted-foreground bg-background p-3 rounded border max-h-32 overflow-y-auto">
                              <pre className="whitespace-pre-wrap font-mono text-xs">
                                {field.value.substring(0, 200)}
                                {field.value.length > 200 && "..."}
                              </pre>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground italic">
                              Klicken Sie auf "Editor öffnen", um den Template-Inhalt zu bearbeiten
                            </div>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !form.formState.isValid}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSubmitting ? "Erstelle..." : "Template erstellen"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Enhanced File Editor for content editing */}
      <EnhancedFileEditor
        isOpen={showEditor}
        onClose={handleEditorClose}
        initialContent={editorContent}
        isNewFile={true}
        onSave={handleEditorSave}
        enableAutocomplete={true}
        fileName="template-content.vorlage"
      />
    </>
  )
}