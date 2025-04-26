"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

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
  wohnungen: { id: string; name: string }[]
  initialData?: {
    wohnung_id?: string
    name: string
    einzug?: string
    auszug?: string
    email?: string
    telefonnummer?: string
    notiz?: string
    nebenkosten?: string
    nebenkosten_datum?: string
  }
  serverAction: (formData: FormData) => Promise<void>
  loading?: boolean
}

export function TenantEditModal({ open, onOpenChange, wohnungen, initialData, serverAction, loading }: TenantEditModalProps) {
  const [formData, setFormData] = useState({
    wohnung_id: initialData?.wohnung_id || "",
    name: initialData?.name || "",
    einzug: initialData?.einzug || "",
    auszug: initialData?.auszug || "",
    email: initialData?.email || "",
    telefonnummer: initialData?.telefonnummer || "",
    notiz: initialData?.notiz || "",
    nebenkosten: initialData?.nebenkosten || "",
    nebenkosten_datum: initialData?.nebenkosten_datum || ""
  });

  useEffect(() => {
    setFormData({
      wohnung_id: initialData?.wohnung_id || "",
      name: initialData?.name || "",
      einzug: initialData?.einzug || "",
      auszug: initialData?.auszug || "",
      email: initialData?.email || "",
      telefonnummer: initialData?.telefonnummer || "",
      notiz: initialData?.notiz || "",
      nebenkosten: initialData?.nebenkosten || "",
      nebenkosten_datum: initialData?.nebenkosten_datum || ""
    });
  }, [initialData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Mieter bearbeiten" : "Mieter hinzufügen"}</DialogTitle>
          <DialogDescription>Füllen Sie alle Pflichtfelder aus.</DialogDescription>
        </DialogHeader>
        <form action={serverAction} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="wohnung_id">Wohnung</Label>
              <Select name="wohnung_id" value={formData.wohnung_id} onValueChange={v => setFormData({...formData, wohnung_id:v})}>
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
              {loading ? "Wird gespeichert..." : (initialData ? "Aktualisieren" : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
