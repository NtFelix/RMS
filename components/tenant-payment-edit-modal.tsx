"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"
import { useModalStore } from "@/hooks/use-modal-store"

export default function TenantPaymentEditModal() {
  const {
    isTenantPaymentEditModalOpen,
    tenantPaymentEditInitialData,
    closeTenantPaymentEditModal,
    setTenantPaymentEditModalDirty,
  } = useModalStore()

  const [rent, setRent] = useState("")
  const [nebenkosten, setNebenkosten] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMarkingAllPaid, setIsMarkingAllPaid] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Reset form fields when modal opens with new data
  useEffect(() => {
    if (tenantPaymentEditInitialData) {
      setRent(tenantPaymentEditInitialData.mieteRaw?.toString() || "")
      setNebenkosten(tenantPaymentEditInitialData.nebenkostenRaw?.toString() || "")
      setTenantPaymentEditModalDirty(false)
    }
  }, [tenantPaymentEditInitialData, setTenantPaymentEditModalDirty])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!tenantPaymentEditInitialData) return

    const rentValue = parseFloat(rent)
    const nebenkostenValue = parseFloat(nebenkosten)

    if (isNaN(rentValue) || rentValue < 0) {
      alert("Bitte geben Sie einen gültigen Mietbetrag ein.")
      return
    }

    if (isNaN(nebenkostenValue) || nebenkostenValue < 0) {
      alert("Bitte geben Sie einen gültigen Nebenkostenbetrag ein.")
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()

    try {
      const today = new Date().toISOString().split('T')[0]

      // Create rent entry in Finanzen table
      const { error: rentError } = await supabase
        .from("Finanzen")
        .insert({
          wohnung_id: tenantPaymentEditInitialData.apartmentId,
          name: `Mietzahlung ${tenantPaymentEditInitialData.apartment}`,
          betrag: rentValue,
          datum: today,
          ist_einnahmen: true,
          notiz: `Mietzahlung von ${tenantPaymentEditInitialData.tenant}`
        })

      if (rentError) {
        console.error("Rent entry error:", rentError)
        throw rentError
      }

      // Create nebenkosten entry in Finanzen table
      const { error: nebenkostenError } = await supabase
        .from("Finanzen")
        .insert({
          wohnung_id: tenantPaymentEditInitialData.apartmentId,
          name: `Nebenkosten ${tenantPaymentEditInitialData.apartment}`,
          betrag: nebenkostenValue,
          datum: today,
          ist_einnahmen: true,
          notiz: `Nebenkosten-Vorauszahlung von ${tenantPaymentEditInitialData.tenant}`
        })

      if (nebenkostenError) {
        console.error("Nebenkosten entry error:", nebenkostenError)
        throw nebenkostenError
      }

      // Close modal and refresh data
      closeTenantPaymentEditModal({ force: true })
      window.location.reload() // Simple refresh for now
      
    } catch (error) {
      console.error("Fehler beim Erstellen der Zahlungseinträge:", error)
      alert(`Fehler beim Erstellen der Zahlungseinträge: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkAllAsPaid = async () => {
    if (!tenantPaymentEditInitialData) return

    setIsMarkingAllPaid(true)
    const supabase = createClient()

    try {
      const today = new Date().toISOString().split('T')[0]
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      
      // Get tenant's move-in date to determine how many months to cover
      const moveInDate = tenantPaymentEditInitialData.einzug 
        ? new Date(tenantPaymentEditInitialData.einzug) 
        : new Date(currentYear, currentMonth - 1, 1) // Default to last month if no move-in date
      
      // Create payment entries for all months from move-in to current month
      const paymentEntries = []
      
      for (let year = moveInDate.getFullYear(); year <= currentYear; year++) {
        const startMonth = (year === moveInDate.getFullYear()) ? moveInDate.getMonth() : 0
        const endMonth = (year === currentYear) ? currentMonth : 11
        
        for (let month = startMonth; month <= endMonth; month++) {
          // Create date in local timezone to avoid UTC conversion issues
          const paymentDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
          
          // Add rent payment
          paymentEntries.push({
            wohnung_id: tenantPaymentEditInitialData.apartmentId,
            name: `Mietzahlung ${tenantPaymentEditInitialData.apartment}`,
            datum: paymentDate,
            betrag: tenantPaymentEditInitialData.mieteRaw,
            ist_einnahmen: true,
            notiz: `Mietzahlung von ${tenantPaymentEditInitialData.tenant} - Nachtrag`
          })

          // Add nebenkosten payment if applicable
          if (tenantPaymentEditInitialData.nebenkostenRaw && tenantPaymentEditInitialData.nebenkostenRaw > 0) {
            paymentEntries.push({
              wohnung_id: tenantPaymentEditInitialData.apartmentId,
              name: `Nebenkosten ${tenantPaymentEditInitialData.apartment}`,
              datum: paymentDate,
              betrag: tenantPaymentEditInitialData.nebenkostenRaw,
              ist_einnahmen: true,
              notiz: `Nebenkosten-Vorauszahlung von ${tenantPaymentEditInitialData.tenant} - Nachtrag`
            })
          }
        }
      }

      // Insert all payment entries
      if (paymentEntries.length > 0) {
        const { error } = await supabase
          .from("Finanzen")
          .insert(paymentEntries)

        if (error) throw error
      }

      // Close modal and refresh data
      closeTenantPaymentEditModal({ force: true })
      window.location.reload()
      
    } catch (error) {
      console.error("Fehler beim Markieren aller ausstehenden Zahlungen als bezahlt:", error)
      alert(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
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

          {/* Mark all as paid button */}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="rent">Tatsächliche Mietzahlung (€)</Label>
              <Input
                id="rent"
                type="number"
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
              <Input
                id="nebenkosten"
                type="number"
                step="0.01"
                min="0"
                value={nebenkosten}
                onChange={(e) => handleNebenkostenChange(e.target.value)}
                placeholder="Tatsächlich gezahlte Nebenkosten-Vorauszahlung eingeben"
                disabled={isSubmitting}
                required
              />
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
