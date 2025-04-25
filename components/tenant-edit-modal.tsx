"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/utils/supabase/client"

interface Mieter {
  id: string
  wohnung_id?: string
  name: string
  einzug?: string
  auszug?: string
  email?: string
  telefonnummer?: string
  notiz?: string
  nebenkosten?: number[]
  nebenkosten_datum?: string[]
}

interface TenantEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string | null
  onSuccess?: () => void
}

export function TenantEditModal({ open, onOpenChange, tenantId, onSuccess }: TenantEditModalProps) {
  const [formData, setFormData] = useState({ 
    wohnung_id: "", 
    name: "", 
    einzug: "", 
    auszug: "", 
    email: "", 
    telefonnummer: "", 
    notiz: "", 
    nebenkosten: "", 
    nebenkosten_datum: "" 
  })
  const [wohnungen, setWohnungen] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)

  // Lade Wohnungen für das Dropdown
  useEffect(() => {
    createClient().from('Wohnungen').select('id,name').then(({ data }) => data && setWohnungen(data))
  }, [])

  // Lade Mieterdaten, wenn tenantId vorhanden
  useEffect(() => {
    const loadTenant = async () => {
      if (!tenantId || !open) return
      
      try {
        const { data } = await createClient()
          .from('Mieter')
          .select('*')
          .eq('id', tenantId)
          .single()
        
        if (data) {
          setFormData({
            wohnung_id: data.wohnung_id || "",
            name: data.name,
            einzug: data.einzug || "",
            auszug: data.auszug || "",
            email: data.email || "",
            telefonnummer: data.telefonnummer || "",
            notiz: data.notiz || "",
            nebenkosten: data.nebenkosten?.join(",") || "",
            nebenkosten_datum: data.nebenkosten_datum?.join(",") || ""
          })
        }
      } catch (error) {
        console.error('Fehler beim Laden des Mieters:', error)
        toast({
          title: "Fehler",
          description: "Der Mieter konnte nicht geladen werden.",
          variant: "destructive"
        })
      }
    }
    
    loadTenant()
    
    // Formular zurücksetzen beim Schließen
    if (!open) {
      setFormData({ 
        wohnung_id: "", 
        name: "", 
        einzug: "", 
        auszug: "", 
        email: "", 
        telefonnummer: "", 
        notiz: "", 
        nebenkosten: "", 
        nebenkosten_datum: "" 
      })
    }
  }, [tenantId, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { wohnung_id, name, einzug, auszug, email, telefonnummer, notiz, nebenkosten, nebenkosten_datum } = formData
    const payload: any = { name }
    
    // Füge optionale Felder hinzu
    if (wohnung_id) payload.wohnung_id = wohnung_id
    if (einzug) payload.einzug = einzug
    if (auszug) payload.auszug = auszug
    if (email) payload.email = email
    if (telefonnummer) payload.telefonnummer = telefonnummer
    if (notiz) payload.notiz = notiz
    
    if (nebenkosten.trim()) {
      payload.nebenkosten = nebenkosten
        .split(',')
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n))
    }
    
    if (nebenkosten_datum.trim()) {
      payload.nebenkosten_datum = nebenkosten_datum
        .split(',')
        .map(s => s.trim())
        .filter(s => s)
    }
    
    const url = tenantId ? `/api/mieter?id=${tenantId}` : "/api/mieter"
    const method = tenantId ? "PUT" : "POST"
    
    try {
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      })
      
      if (res.ok) {
        toast({ 
          title: tenantId ? "Aktualisiert" : "Gespeichert", 
          description: tenantId ? "Mieter aktualisiert." : "Mieter hinzugefügt." 
        })
        onOpenChange(false)
        onSuccess?.()
      } else {
        const err = await res.json()
        toast({ 
          title: "Fehler", 
          description: err.details || err.error || 'Unbekannter Fehler', 
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{tenantId ? "Mieter bearbeiten" : "Mieter hinzufügen"}</DialogTitle>
          <DialogDescription>Füllen Sie alle Pflichtfelder aus.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="wohnung_id">Wohnung</Label>
              <Select value={formData.wohnung_id} onValueChange={v => setFormData({...formData, wohnung_id:v})}>
                <SelectTrigger id="wohnung_id">
                  <SelectValue placeholder="--"/>
                </SelectTrigger>
                <SelectContent>
                  {wohnungen.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required/>
            </div>
            <div>
              <Label htmlFor="einzug">Einzug</Label>
              <Input id="einzug" name="einzug" type="date" value={formData.einzug} onChange={handleChange}/>
            </div>
            <div>
              <Label htmlFor="auszug">Auszug</Label>
              <Input id="auszug" name="auszug" type="date" value={formData.auszug} onChange={handleChange}/>
            </div>
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange}/>
            </div>
            <div>
              <Label htmlFor="telefonnummer">Telefon</Label>
              <Input id="telefonnummer" name="telefonnummer" value={formData.telefonnummer} onChange={handleChange}/>
            </div>
            <div className="col-span-2">
              <Label htmlFor="notiz">Notiz</Label>
              <Input id="notiz" name="notiz" value={formData.notiz} onChange={handleChange}/>
            </div>
            <div>
              <Label htmlFor="nebenkosten">Nebenkosten (€)</Label>
              <Input 
                id="nebenkosten" 
                name="nebenkosten" 
                value={formData.nebenkosten} 
                onChange={handleChange} 
                placeholder="z.B. 25,30"
              />
            </div>
            <div>
              <Label htmlFor="nebenkosten_datum">Nebenkosten Datum</Label>
              <Input 
                id="nebenkosten_datum" 
                name="nebenkosten_datum" 
                value={formData.nebenkosten_datum} 
                onChange={handleChange} 
                placeholder="YYYY-MM-DD, ..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Wird gespeichert..." : (tenantId ? "Aktualisieren" : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
