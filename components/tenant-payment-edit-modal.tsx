"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
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

  const handleClose = () => {
    if (isSubmitting) return
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
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Wird erfasst..." : "Abweichung erfassen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
