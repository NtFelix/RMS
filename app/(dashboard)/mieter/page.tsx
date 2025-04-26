"use client"
export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { TenantFilters } from "@/components/tenant-filters"
import { TenantTable } from "@/components/tenant-table"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
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

export default function MieterPage() {
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ wohnung_id: "", name: "", einzug: "", auszug: "", email: "", telefonnummer: "", notiz: "", nebenkosten: "", nebenkosten_datum: "" })
  const reloadRef = useRef<(() => void) | null>(null)
  const [wohnungen, setWohnungen] = useState<{ id:string; name:string }[]>([])
  
  // Mieter-Edit-Logik definieren
  const handleEdit = useCallback((m: Mieter) => {
    setEditingId(m.id)
    setFormData({
      wohnung_id: m.wohnung_id||"",
      name: m.name,
      einzug: m.einzug||"",
      auszug: m.auszug||"",
      email: m.email||"",
      telefonnummer: m.telefonnummer||"",
      notiz: m.notiz||"",
      nebenkosten: m.nebenkosten?.join(",")||"",
      nebenkosten_datum: m.nebenkosten_datum?.join(",")||""
    })
    setDialogOpen(true)
  }, [])

  useEffect(() => {
    createClient().from('Wohnungen').select('id,name').then(({ data }) => data && setWohnungen(data))
    
    // Event-Listener für edit-tenant Event vom Dashboard
    const handleEditTenant = async (event: Event) => {
      const customEvent = event as CustomEvent<{id: string}>
      const tenantId = customEvent.detail?.id
      if (!tenantId) return
      
      try {
        // Mieterdaten laden
        const { data: mieter } = await createClient()
          .from('Mieter')
          .select('*')
          .eq('id', tenantId)
          .single()
        
        if (!mieter) {
          console.error('Mieter nicht gefunden:', tenantId)
          return
        }
        
        // Edit-Modal mit den Daten öffnen
        handleEdit(mieter as Mieter)
      } catch (error) {
        console.error('Fehler beim Laden des Mieters:', error)
      }
    }
    
    // Event-Listener registrieren
    window.addEventListener('edit-tenant', handleEditTenant)
    
    // Cleanup
    return () => {
      window.removeEventListener('edit-tenant', handleEditTenant)
    }
  }, [handleEdit])

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingId(null)
      setFormData({ wohnung_id: "", name: "", einzug: "", auszug: "", email: "", telefonnummer: "", notiz: "", nebenkosten: "", nebenkosten_datum: "" })
    }
  }

  // Open add/edit modal via command palette
  useEffect(() => {
    const handler = () => handleOpenChange(true)
    window.addEventListener("open-add-mieter-modal", handler)
    return () => window.removeEventListener("open-add-mieter-modal", handler)
  }, [handleOpenChange])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value })



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { wohnung_id, name, einzug, auszug, email, telefonnummer, notiz, nebenkosten, nebenkosten_datum } = formData
    const payload: any = { name }
    // Include wohnung_id as string (UUID) if selected
    if (wohnung_id) payload.wohnung_id = wohnung_id
    if (einzug) payload.einzug = einzug
    if (auszug) payload.auszug = auszug
    if (email) payload.email = email
    if (telefonnummer) payload.telefonnummer = telefonnummer
    if (notiz) payload.notiz = notiz
    if (nebenkosten.trim()) {
      payload.nebenkosten = nebenkosten.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
    }
    if (nebenkosten_datum.trim()) {
      payload.nebenkosten_datum = nebenkosten_datum.split(',').map(s => s.trim()).filter(s => s)
    }
    const url = editingId?`/api/mieter?id=${editingId}`:'/api/mieter'
    const res = await fetch(url,{method:editingId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    if(res.ok){ toast({title:'Erfolgreich',description:'Mieter gespeichert.'}); handleOpenChange(false); reloadRef.current?.() }
    else {
      const err = await res.json();
      console.error('POST /api/mieter error response:', err);
      toast({
        title: 'Fehler beim Speichern',
        description: err.details || err.error || 'Unbekannter Fehler',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mieter</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Mieter und Mietverhältnisse</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Mieter hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingId?'Mieter bearbeiten':'Mieter hinzufügen'}</DialogTitle>
              <DialogDescription>Füllen Sie alle Pflichtfelder aus.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="wohnung_id">Wohnung</Label><Select value={formData.wohnung_id} onValueChange={v=>setFormData({...formData,wohnung_id:v})}><SelectTrigger id="wohnung_id"><SelectValue placeholder="--"/></SelectTrigger><SelectContent>{wohnungen.map(w=><SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label htmlFor="name">Name</Label><Input id="name" name="name" value={formData.name} onChange={handleChange} required/></div>
                <div><Label htmlFor="einzug">Einzug</Label><Input id="einzug" name="einzug" type="date" value={formData.einzug} onChange={handleChange}/></div>
                <div><Label htmlFor="auszug">Auszug</Label><Input id="auszug" name="auszug" type="date" value={formData.auszug} onChange={handleChange}/></div>
                <div><Label htmlFor="email">E-Mail</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleChange}/></div>
                <div><Label htmlFor="telefonnummer">Telefon</Label><Input id="telefonnummer" name="telefonnummer" value={formData.telefonnummer} onChange={handleChange}/></div>
                <div className="col-span-2"><Label htmlFor="notiz">Notiz</Label><Input id="notiz" name="notiz" value={formData.notiz} onChange={handleChange}/></div>
                <div><Label htmlFor="nebenkosten">Nebenkosten (€)</Label><Input id="nebenkosten" name="nebenkosten" value={formData.nebenkosten} onChange={handleChange} placeholder="z.B. 25,30"/></div>
                <div><Label htmlFor="nebenkosten_datum">Nebenkosten Datum</Label><Input id="nebenkosten_datum" name="nebenkosten_datum" value={formData.nebenkosten_datum} onChange={handleChange} placeholder="YYYY-MM-DD, ..."/></div>
              </div>
              <DialogFooter><Button type="submit">Speichern</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <CardTitle>Mieterverwaltung</CardTitle>
          <CardDescription>Hier können Sie Ihre Mieter verwalten und filtern</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <TenantFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
          <TenantTable filter={filter} searchQuery={searchQuery} reloadRef={reloadRef} onEdit={handleEdit} wohnungen={wohnungen} />
        </CardContent>
      </Card>
    </div>
  )
}
