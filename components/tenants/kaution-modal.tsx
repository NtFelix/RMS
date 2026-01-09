"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"

import { KautionFormData, KautionStatus } from "@/types/Tenant"
import { useModalStore } from "@/hooks/use-modal-store"

interface KautionModalProps {
  serverAction: (formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>
}

export function KautionModal({ serverAction }: KautionModalProps) {
  const {
    isKautionModalOpen,
    closeKautionModal,
    kautionInitialData,
    isKautionModalDirty,
    setKautionModalDirty,
  } = useModalStore()

  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suggestedAmount, setSuggestedAmount] = useState<number | null>(null)
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false)

  const [formData, setFormData] = useState<KautionFormData>({
    amount: "",
    paymentDate: "",
    status: "Ausstehend",
  })

  const [validationErrors, setValidationErrors] = useState<{
    amount?: string
    paymentDate?: string
    status?: string
  }>({})

  // Reset form state when modal closes
  const resetFormState = () => {
    setFormData({
      amount: "",
      paymentDate: "",
      status: "Ausstehend",
    })
    setValidationErrors({})
    setSuggestedAmount(null)
    setIsLoadingSuggestion(false)
    setIsSubmitting(false)
  }

  // Load initial data when modal opens or initial data changes
  useEffect(() => {
    if (isKautionModalOpen && kautionInitialData) {
      const { tenant, existingKaution } = kautionInitialData;
      
      if (existingKaution) {
        const amount = existingKaution.amount?.toString() || '';
        const paymentDate = existingKaution.paymentDate || '';
        const status = existingKaution.status || 'Ausstehend';
        
        setFormData({
          amount,
          paymentDate,
          status,
        });
        
        // Don't calculate suggested amount for existing kaution
        setSuggestedAmount(null);
      } else {
        // Reset form for new kaution
        setFormData({
          amount: "",
          paymentDate: "",
          status: "Ausstehend",
        });
        
        // Calculate suggested amount if tenant has apartment
        if (tenant.wohnung_id) {
          calculateSuggestedAmount(tenant.wohnung_id);
        } else {
          setSuggestedAmount(null);
        }
      }

      setValidationErrors({});
      setKautionModalDirty(false);
    } else if (!isKautionModalOpen) {
      // Reset form state when modal closes
      resetFormState()
    }
  }, [isKautionModalOpen, kautionInitialData, setKautionModalDirty])

  const calculateSuggestedAmount = async (wohnungId: string) => {
    setIsLoadingSuggestion(true)
    try {
      const response = await fetch(`/api/wohnungen/${wohnungId}/rent`)
      if (response.ok) {
        const data = await response.json()
        const rent = data.miete
        if (rent && rent > 0) {
          const suggested = rent * 3
          setSuggestedAmount(suggested)
          // Only auto-populate if amount field is empty
          if (!formData.amount) {
            setFormData(prev => ({
              ...prev,
              amount: suggested.toString()
            }))
            setKautionModalDirty(true)
          }
        } else {
          setSuggestedAmount(null)
        }
      } else {
        console.warn("Failed to fetch rent data:", response.statusText)
        setSuggestedAmount(null)
      }
    } catch (error) {
      console.error("Error calculating suggested amount:", error)
      setSuggestedAmount(null)
    } finally {
      setIsLoadingSuggestion(false)
    }
  }

  const handleInputChange = (field: keyof KautionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setKautionModalDirty(true)
    
    // Clear validation errors when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleDateChange = (date: Date | undefined) => {
    const formattedDate = date ? format(date, "yyyy-MM-dd") : ""
    handleInputChange("paymentDate", formattedDate)
  }

  const validateForm = (): boolean => {
    const errors: { amount?: string; paymentDate?: string; status?: string } = {}
    
    // Amount validation
    if (!formData.amount.trim()) {
      errors.amount = "Betrag ist erforderlich"
    } else {
      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        errors.amount = "Betrag muss eine positive Zahl sein"
      } else if (amount > 999999) {
        errors.amount = "Betrag ist zu hoch"
      }
    }

    // Payment date validation (optional but must be valid if provided)
    if (formData.paymentDate.trim()) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(formData.paymentDate) || isNaN(Date.parse(formData.paymentDate))) {
        errors.paymentDate = "Ungültiges Datum"
      }
    }

    // Status validation
    const validStatuses: KautionStatus[] = ['Erhalten', 'Ausstehend', 'Zurückgezahlt'];
    if (!formData.status || !validStatuses.includes(formData.status)) {
      errors.status = "Status ist erforderlich"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast({
        title: "Validierungsfehler",
        description: "Bitte überprüfen Sie Ihre Eingaben.",
        variant: "destructive",
      })
      return
    }
    
    if (!kautionInitialData?.tenant?.id) {
      toast({
        title: "Fehler",
        description: "Mieter-ID nicht gefunden. Bitte schließen Sie das Modal und versuchen Sie es erneut.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      const submitFormData = new FormData()
      
      // Add tenant ID
      submitFormData.append("tenantId", kautionInitialData.tenant.id)
      
      // Add kaution data - ensure proper formatting
      const amount = parseFloat(formData.amount.trim())
      submitFormData.append("amount", amount.toString())
      submitFormData.append("paymentDate", formData.paymentDate.trim() || "")
      submitFormData.append("status", formData.status)
      
      console.log('Submitting kaution data:', {
        tenantId: kautionInitialData.tenant.id,
        amount: amount,
        paymentDate: formData.paymentDate,
        status: formData.status
      });

      const result = await serverAction(submitFormData)

      if (result.success) {
        toast({
          title: "Kaution gespeichert",
          description: `Die Kaution für ${kautionInitialData.tenant.name} wurde erfolgreich ${kautionInitialData?.existingKaution ? 'aktualisiert' : 'erstellt'}.`,
          variant: "success"
        })
        setKautionModalDirty(false)
        closeKautionModal()
        router.refresh()
      } else {
        console.error('Error from server action:', result.error);
        toast({
          title: "Fehler beim Speichern",
          description: result.error?.message || "Ein unbekannter Fehler ist aufgetreten.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error submitting kaution form:", error)
      toast({
        title: "Unerwarteter Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const attemptClose = () => {
    if (isKautionModalDirty) {
      // Let the modal store handle the dirty state confirmation
      closeKautionModal()
    } else {
      closeKautionModal({ force: true })
    }
  }

  const handleCancelClick = () => {
    // Always close immediately when cancel button is clicked, regardless of dirty state
    closeKautionModal({ force: true });
  }

  if (!isKautionModalOpen || !kautionInitialData) return null

  const { tenant, existingKaution } = kautionInitialData

  return (
    <Dialog open={isKautionModalOpen} onOpenChange={(open) => !open && attemptClose()}>
      <DialogContent
        className="sm:max-w-[500px]"
        isDirty={isKautionModalDirty}
        onAttemptClose={attemptClose}
      >
        <DialogHeader>
          <DialogTitle>
            {existingKaution ? "Kaution bearbeiten" : "Kaution hinzufügen"}
          </DialogTitle>
          <DialogDescription>
            Kaution für {tenant.name} verwalten
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 pt-4 pb-2" role="form">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Betrag (€)
                {suggestedAmount && !existingKaution && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (Vorschlag: {suggestedAmount.toLocaleString("de-DE", { 
                      style: "currency", 
                      currency: "EUR" 
                    })})
                  </span>
                )}
              </Label>
              <NumberInput
                id="amount"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                disabled={isSubmitting || isLoadingSuggestion}
                className={validationErrors.amount ? "border-red-500" : ""}
                required
              />
              {validationErrors.amount && (
                <p className="text-xs text-red-500">{validationErrors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Zahlungsdatum</Label>
              <DatePicker
                id="paymentDate"
                value={formData.paymentDate}
                onChange={handleDateChange}
                placeholder="TT.MM.JJJJ"
                disabled={isSubmitting}
              />
              {validationErrors.paymentDate && (
                <p className="text-xs text-red-500">{validationErrors.paymentDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: KautionStatus) => handleInputChange("status", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger className={validationErrors.status ? "border-red-500" : ""}>
                  <SelectValue placeholder="Status auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ausstehend">Ausstehend</SelectItem>
                  <SelectItem value="Erhalten">Erhalten</SelectItem>
                  <SelectItem value="Zurückgezahlt">Zurückgezahlt</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.status && (
                <p className="text-xs text-red-500">{validationErrors.status}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelClick}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingSuggestion}
            >
              {isSubmitting ? "Wird gespeichert..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}