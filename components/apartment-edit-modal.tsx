"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CustomCombobox, ComboboxOption } from "@/components/ui/custom-combobox"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/utils/supabase/client"

interface Wohnung {
  id: string
  name: string
  groesse: number | string
  miete: number | string
  haus_id?: string
}

interface ApartmentEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apartmentId: string | null
  onSuccess?: () => void
}

export function ApartmentEditModal({ open, onOpenChange, apartmentId, onSuccess }: ApartmentEditModalProps) {
  const [formData, setFormData] = useState({ name: "", groesse: "", miete: "", haus_id: "" })
  const [houses, setHouses] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)

  const houseOptions: ComboboxOption[] = houses.map(h => ({ value: h.id, label: h.name }))

  // Lade Häuser für das Dropdown
  useEffect(() => {
    createClient().from('Haeuser').select('id,name').then(({ data }) => data && setHouses(data))
  }, [])

  // Lade Wohnungsdaten, wenn apartmentId vorhanden
  useEffect(() => {
    const loadApartment = async () => {
      if (!apartmentId || !open) return
      
      try {
        const { data } = await createClient()
          .from('Wohnungen')
          .select('*')
          .eq('id', apartmentId)
          .single()
        
        if (data) {
          setFormData({
            name: data.name,
            groesse: data.groesse?.toString() || "",
            miete: data.miete?.toString() || "",
            haus_id: data.haus_id || ""
          })
        }
      } catch (error) {
        console.error('Fehler beim Laden der Wohnung:', error)
        toast({
          title: "Fehler",
          description: "Die Wohnung konnte nicht geladen werden.",
          variant: "destructive"
        })
      }
    }
    
    loadApartment()
    
    // Formular zurücksetzen beim Schließen
    if (!open) {
      setFormData({ name: "", groesse: "", miete: "", haus_id: "" })
    }
  }, [apartmentId, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const url = apartmentId ? `/api/wohnungen?id=${apartmentId}` : "/api/wohnungen"
    const method = apartmentId ? "PUT" : "POST"
    
    try {
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(formData) 
      })
      
      if (res.ok) {
        toast({ 
          title: apartmentId ? "Aktualisiert" : "Gespeichert", 
          description: apartmentId ? "Wohnung aktualisiert." : "Wohnung hinzugefügt.",
          variant: "success",
        })
        onOpenChange(false)
        onSuccess?.()
      } else {
        const err = await res.json()
        toast({ 
          title: "Fehler", 
          description: err.error, 
          variant: "destructive" 
        })
      }
    } catch (error) {
      toast({ 
        title: "Fehler", 
        description: "Netzwerkfehler.", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{apartmentId ? "Wohnung bearbeiten" : "Wohnung hinzufügen"}</DialogTitle>
          <DialogDescription>Geben Sie die Wohnungsdaten ein.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="groesse">Größe</Label>
            <Input id="groesse" name="groesse" value={formData.groesse} onChange={handleChange} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="miete">Miete</Label>
            <Input id="miete" name="miete" value={formData.miete} onChange={handleChange} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="haus_id">Haus</Label>
            <CustomCombobox
              width="w-full"
              options={houseOptions}
              value={formData.haus_id}
              onChange={(value) => setFormData({ ...formData, haus_id: value || "" })}
              placeholder="Wählen Sie ein Haus"
              searchPlaceholder="Haus suchen..."
              emptyText="Kein Haus gefunden."
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Wird gespeichert..." : (apartmentId ? "Aktualisieren" : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
