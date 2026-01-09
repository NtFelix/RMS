"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle } from "lucide-react"
import { useModalStore } from "@/hooks/use-modal-store"
import { toast } from "@/hooks/use-toast"
import { PAYMENT_KEYWORDS } from "@/utils/constants"

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function TenantPaymentEditModal() {
  const {
    isTenantPaymentEditModalOpen,
    closeTenantPaymentEditModal,
    tenantPaymentEditInitialData,
    tenantPaymentEditModalOnSuccess,
    isTenantPaymentEditModalDirty,
    setTenantPaymentEditModalDirty
  } = useModalStore()

  const [rent, setRent] = useState("")
  const [nebenkosten, setNebenkosten] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMarkingAllPaid, setIsMarkingAllPaid] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [paymentReason, setPaymentReason] = useState("")
  const [customReason, setCustomReason] = useState("")
  const [hasMissingPayments, setHasMissingPayments] = useState(false)

  const [missingPaymentDetails, setMissingPaymentDetails] = useState<any[]>([])

  // Check for missing payments
  const checkMissingPayments = async () => {
    if (!tenantPaymentEditInitialData) return

    try {
      const response = await fetch(`/api/tenants/${tenantPaymentEditInitialData.id}/missed-payments`)
      const data = await response.json()

      if (!response.ok) {
        console.error("Error fetching missed payments:", data.error)
        setHasMissingPayments(false)
        setMissingPaymentDetails([])
        return
      }

      setHasMissingPayments(data.hasMissingPayments)
      setMissingPaymentDetails(data.missedPayments.details || [])

    } catch (error) {
      console.error("Error checking missing payments:", error)
      setHasMissingPayments(false)
      setMissingPaymentDetails([])
    }
  }

  // Reset form fields when modal opens with new data
  useEffect(() => {
    if (tenantPaymentEditInitialData) {
      setRent(tenantPaymentEditInitialData.mieteRaw?.toString() || "")
      setNebenkosten(tenantPaymentEditInitialData.nebenkostenRaw?.toString() || "")
      setPaymentReason("")
      setCustomReason("")
      setTenantPaymentEditModalDirty(false)
      checkMissingPayments()
    }
  }, [tenantPaymentEditInitialData, setTenantPaymentEditModalDirty])

  const getPaymentReasonText = () => {
    if (paymentReason === "other") {
      return customReason || "Sonstiges"
    }
    return paymentReason === "mietausfall" ? "Mietausfall" :
      paymentReason === "mietminderung" ? "Mietminderung" : ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tenantPaymentEditInitialData) return

    const rentValue = parseFloat(rent)
    const nebenkostenValue = parseFloat(nebenkosten)

    if (isNaN(rentValue) || rentValue < 0) {
      toast({
        title: "Ungültiger Mietbetrag",
        description: "Bitte geben Sie einen gültigen Mietbetrag ein.",
        variant: "destructive",
      })
      return
    }

    if (isNaN(nebenkostenValue) || nebenkostenValue < 0) {
      toast({
        title: "Ungültiger Nebenkostenbetrag",
        description: "Bitte geben Sie einen gültigen Nebenkostenbetrag ein.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const today = new Date().toISOString().split('T')[0]
      const reasonText = getPaymentReasonText()

      // Prepare entries for batch insertion
      const entries = []

      // Create rent entry only if amount > 0
      if (rentValue > 0) {
        const rentNote = reasonText
          ? `${capitalize(PAYMENT_KEYWORDS.RENT)} von ${tenantPaymentEditInitialData.tenant} (${reasonText})`
          : `${capitalize(PAYMENT_KEYWORDS.RENT)} von ${tenantPaymentEditInitialData.tenant}`

        entries.push({
          wohnung_id: tenantPaymentEditInitialData.apartmentId,
          name: `${capitalize(PAYMENT_KEYWORDS.RENT)} ${tenantPaymentEditInitialData.apartment}`,
          betrag: rentValue,
          datum: today,
          ist_einnahmen: true,
          notiz: rentNote
        })
      }

      // Create nebenkosten entry if applicable
      if (nebenkostenValue > 0) {
        const nebenkostenNote = reasonText
          ? `${capitalize(PAYMENT_KEYWORDS.NEBENKOSTEN)}-Vorauszahlung von ${tenantPaymentEditInitialData.tenant} (${reasonText})`
          : `${capitalize(PAYMENT_KEYWORDS.NEBENKOSTEN)}-Vorauszahlung von ${tenantPaymentEditInitialData.tenant}`

        entries.push({
          wohnung_id: tenantPaymentEditInitialData.apartmentId,
          name: `${capitalize(PAYMENT_KEYWORDS.NEBENKOSTEN)} ${tenantPaymentEditInitialData.apartment}`,
          betrag: nebenkostenValue,
          datum: today,
          ist_einnahmen: true,
          notiz: nebenkostenNote
        })
      }

      // Send entries to API only if there are entries to create
      if (entries.length > 0) {
        const response = await fetch('/api/finance-entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ entries })
        })

        const data = await response.json()

        if (!response.ok) {
          console.error("Error creating finance entries:", data.error)
          throw new Error(data.error || 'Failed to create entries')
        }
      }

      // Close modal and refresh data
      closeTenantPaymentEditModal({ force: true })

      // Call onSuccess callback to refresh the container
      if (tenantPaymentEditModalOnSuccess) {
        tenantPaymentEditModalOnSuccess()
      }

      // Show success toast
      toast({
        title: "Zahlung erfolgreich erfasst",
        description: `${entries.length > 0 ? `${entries.length} Zahlungseinträge wurden erfolgreich erstellt.` : "Keine Zahlungseinträge erstellt (Betrag war 0€)."}`,
        variant: "success",
      })

    } catch (error) {
      console.error("Fehler beim Erstellen der Zahlungseinträge:", error)
      toast({
        title: "Fehler beim Erstellen der Zahlungseinträge",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkAllAsPaid = async () => {
    if (!tenantPaymentEditInitialData) return

    setIsMarkingAllPaid(true)

    try {
      // Use the fetched missing payment details to create entries
      // This avoids creating duplicates for months that are already paid
      const paymentEntries = missingPaymentDetails.map(detail => {
        const isRent = detail.type === 'rent'

        return {
          wohnung_id: tenantPaymentEditInitialData.apartmentId,
          name: isRent
            ? `${capitalize(PAYMENT_KEYWORDS.RENT)} ${tenantPaymentEditInitialData.apartment}`
            : `${capitalize(PAYMENT_KEYWORDS.NEBENKOSTEN)} ${tenantPaymentEditInitialData.apartment}`,
          datum: detail.date,
          betrag: detail.amount,
          ist_einnahmen: true,
          notiz: isRent
            ? `${capitalize(PAYMENT_KEYWORDS.RENT)} von ${tenantPaymentEditInitialData.tenant} - Nachtrag`
            : `${capitalize(PAYMENT_KEYWORDS.NEBENKOSTEN)}-Vorauszahlung von ${tenantPaymentEditInitialData.tenant} - Nachtrag`
        }
      })

      // Send entries to API
      if (paymentEntries.length > 0) {
        const response = await fetch('/api/finance-entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ entries: paymentEntries })
        })

        const data = await response.json()

        if (!response.ok) {
          console.error("Error creating finance entries:", data.error)
          throw new Error(data.error || 'Failed to create entries')
        }
      }

      // Close modal and refresh data
      closeTenantPaymentEditModal({ force: true })

      // Call onSuccess callback to refresh the container
      if (tenantPaymentEditModalOnSuccess) {
        tenantPaymentEditModalOnSuccess()
      }

      // Show success toast
      toast({
        title: "Alle ausstehenden Zahlungen markiert",
        description: paymentEntries.length > 0
          ? `${paymentEntries.length} Zahlungseinträge wurden als bezahlt markiert.`
          : "Keine ausstehenden Zahlungen gefunden.",
        variant: "success",
      })

    } catch (error) {
      console.error("Fehler beim Markieren aller ausstehenden Zahlungen als bezahlt:", error)
      toast({
        title: "Fehler beim Markieren als bezahlt",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive",
      })
    } finally {
      setIsMarkingAllPaid(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting || isMarkingAllPaid) return
    closeTenantPaymentEditModal()
  }

  const handleRentChange = (value: string) => {
    setRent(value)
    setTenantPaymentEditModalDirty(true)
  }

  const handleNebenkostenChange = (value: string) => {
    setNebenkosten(value)
    setTenantPaymentEditModalDirty(true)
  }

  if (!isTenantPaymentEditModalOpen || !tenantPaymentEditInitialData) {
    return null
  }

  return (
    <>
      <Dialog open={isTenantPaymentEditModalOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zahlungsabweichung erfassen</DialogTitle>
            <DialogDescription>
              Erfassen Sie abweichende Zahlungen, Mietminderungen oder ausstehende Beträge für diesen Mieter.
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Mieter:</strong> {tenantPaymentEditInitialData.tenant}</p>
            <p><strong>Wohnung:</strong> {tenantPaymentEditInitialData.apartment}</p>
          </div>

          {/* Mark all as paid button - only show if there are missing payments */}
          {hasMissingPayments && (
            <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmModal(true)}
                disabled={isSubmitting || isMarkingAllPaid}
                className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-950/50 dark:hover:text-amber-300"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Alle ausstehenden Mieten als bezahlt markieren
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="rent">Tatsächliche Mietzahlung (€)</Label>
              <NumberInput
                id="rent"
                step="0.01"
                min="0"
                value={rent}
                onChange={(e) => handleRentChange(e.target.value)}
                placeholder="Tatsächlich gezahlten Mietbetrag eingeben"
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <Label htmlFor="nebenkosten">Tatsächliche Nebenkosten-Vorauszahlung (€)</Label>
              <NumberInput
                id="nebenkosten"
                step="0.01"
                min="0"
                value={nebenkosten}
                onChange={(e) => handleNebenkostenChange(e.target.value)}
                placeholder="Tatsächlich gezahlte Nebenkosten-Vorauszahlung eingeben"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Payment Reason Selection */}
            <div className="space-y-3">
              <Label htmlFor="payment-reason">Grund für die Abweichung</Label>
              <Select value={paymentReason} onValueChange={setPaymentReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Grund auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mietausfall">Mietausfall</SelectItem>
                  <SelectItem value="mietminderung">Mietminderung</SelectItem>
                  <SelectItem value="other">Sonstiges</SelectItem>
                </SelectContent>
              </Select>

              {paymentReason === "other" && (
                <div>
                  <Label htmlFor="custom-reason">Benutzerdefinierter Grund</Label>
                  <Input
                    id="custom-reason"
                    type="text"
                    value={customReason}
                    onChange={(e) => {
                      setCustomReason(e.target.value)
                      setTenantPaymentEditModalDirty(true)
                    }}
                    placeholder="Bitte Grund eingeben..."
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting || isMarkingAllPaid}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isMarkingAllPaid}
              >
                {isSubmitting ? "Wird erfasst..." : "Abweichung erfassen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {showConfirmModal && (
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Bestätigung erforderlich
              </DialogTitle>
              <DialogDescription>
                Sind Sie sicher, dass Sie alle ausstehenden Mietzahlungen für <strong>{tenantPaymentEditInitialData?.tenant}</strong> als bezahlt markieren möchten?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Hinweis:</strong> Diese Aktion erstellt Zahlungseinträge für alle Monate vom Einzugsdatum bis zum aktuellen Monat.
                </p>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>• Miete: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tenantPaymentEditInitialData?.mieteRaw || 0)} pro Monat</p>
                {tenantPaymentEditInitialData?.nebenkostenRaw && tenantPaymentEditInitialData.nebenkostenRaw > 0 && (
                  <p>• Nebenkosten: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tenantPaymentEditInitialData.nebenkostenRaw || 0)} pro Monat</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={isMarkingAllPaid}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false)
                  handleMarkAllAsPaid()
                }}
                disabled={isMarkingAllPaid}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isMarkingAllPaid ? "Wird verarbeitet..." : "Ja, alle als bezahlt markieren"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
