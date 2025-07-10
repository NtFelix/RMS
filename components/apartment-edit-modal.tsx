"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CustomCombobox, ComboboxOption } from "@/components/ui/custom-combobox"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/utils/supabase/client"
import { useModalStore } from "@/hooks/use-modal-store" // Import the modal store

// This modal is for "Wohnung" entity, so we'll use Wohnung related state from useModalStore

// interface Wohnung { // This interface can be removed if `wohnungInitialData` from store is typed
//   id: string
//   name: string
//   groesse: number | string
//   miete: number | string
//   haus_id?: string
// }

interface ApartmentEditModalProps {
  // open: boolean; // Controlled by store: isWohnungModalOpen
  // onOpenChange: (open: boolean) => void; // Controlled by store: closeWohnungModal
  // apartmentId: string | null; // Part of wohnungInitialData from store
  // onSuccess?: () => void; // Controlled by store: wohnungModalOnSuccess
  // Props passed from layout that are not part of initialData in the store:
  currentApartmentLimitFromProps?: number | typeof Infinity;
  isActiveSubscriptionFromProps?: boolean;
  currentApartmentCountFromProps?: number;
  serverAction?: (id: string | null, data: any) => Promise<any>;
}

export function ApartmentEditModal({
  serverAction,
  currentApartmentLimitFromProps,
  isActiveSubscriptionFromProps,
  currentApartmentCountFromProps
}: ApartmentEditModalProps) {
  const {
    isWohnungModalOpen,
    closeWohnungModal,
    wohnungInitialData,
    wohnungModalOnSuccess,
    wohnungModalHaeuser, // Assuming 'haeuser' for dropdown comes from store
    isWohnungModalDirty,
    setWohnungModalDirty,
    openConfirmationModal,
  } = useModalStore();

  const [formData, setFormData] = useState({ name: "", groesse: "", miete: "", haus_id: "" })
  // const [houses, setHouses] = useState<{ id: string; name: string }[]>([]) // Now from store: wohnungModalHaeuser
  const [loading, setLoading] = useState(false)

  const houseOptions: ComboboxOption[] = (wohnungModalHaeuser || []).map(h => ({ value: h.id, label: h.name }))

  // Lade Häuser für das Dropdown - This might be handled when opening the modal via store now
  // useEffect(() => {
  //   if (isWohnungModalOpen && (!wohnungModalHaeuser || wohnungModalHaeuser.length === 0)) {
  //     // Logic to fetch houses if not provided by store or needs refresh
  //     // createClient().from('Haeuser').select('id,name').then(({ data }) => data && ???);
  //     // How to set them back to store? Or expect parent to provide them via openWohnungModal.
  //   }
  // }, [isWohnungModalOpen, wohnungModalHaeuser])

  useEffect(() => {
    if (isWohnungModalOpen && wohnungInitialData) {
      setFormData({
        name: wohnungInitialData.name || "",
        groesse: wohnungInitialData.groesse?.toString() || "",
        miete: wohnungInitialData.miete?.toString() || "",
        haus_id: wohnungInitialData.haus_id || ""
      })
      setWohnungModalDirty(false)
    } else if (isWohnungModalOpen) { // New entry
      setFormData({ name: "", groesse: "", miete: "", haus_id: "" })
      setWohnungModalDirty(false)
    }
  }, [wohnungInitialData, isWohnungModalOpen, setWohnungModalDirty])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setWohnungModalDirty(true)
  }

  const handleComboboxChange = (value: string | null) => {
    setFormData({ ...formData, haus_id: value || "" });
    setWohnungModalDirty(true);
  };

  const attemptClose = () => {
    closeWohnungModal(); // Store handles confirmation if dirty
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Determine if it's an update or create based on wohnungInitialData
    const currentApartmentId = wohnungInitialData?.id || null;
    const url = currentApartmentId ? `/api/wohnungen?id=${currentApartmentId}` : "/api/wohnungen"
    const method = currentApartmentId ? "PUT" : "POST"
    
    try {
      // Assuming a generic serverAction prop for now, or replace with direct fetch
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(formData) 
      });
      
      if (res.ok) {
        toast({ 
          title: currentApartmentId ? "Aktualisiert" : "Gespeichert",
          description: currentApartmentId ? "Wohnung aktualisiert." : "Wohnung hinzugefügt.",
          variant: "success",
        })
        setWohnungModalDirty(false); // Reset dirty state
        if (wohnungModalOnSuccess) {
          const resultData = await res.json(); // Or construct data if API doesn't return it
          wohnungModalOnSuccess(resultData.wohnung || { ...formData, id: currentApartmentId || resultData.id });
        }
        closeWohnungModal(); // Will close directly as dirty is false
      } else {
        const err = await res.json()
        toast({ 
          title: "Fehler", 
          description: err.error || "Ein Fehler ist aufgetreten.",
          variant: "destructive" 
        })
      }
    } catch (error) {
      toast({ 
        title: "Fehler", 
        description: "Netzwerkfehler oder unerwarteter Fehler.",
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isWohnungModalOpen) {
    return null;
  }

  return (
    <Dialog open={isWohnungModalOpen} onOpenChange={(open) => !open && attemptClose()}>
      <DialogContent
        className="sm:max-w-[425px]"
        isDirty={isWohnungModalDirty}
        onAttemptClose={attemptClose}
      >
        <DialogHeader>
          <DialogTitle>{wohnungInitialData?.id ? "Wohnung bearbeiten" : "Wohnung hinzufügen"}</DialogTitle>
          <DialogDescription>Geben Sie die Wohnungsdaten ein.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required disabled={loading} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="groesse">Größe (m²)</Label>
            <Input id="groesse" name="groesse" type="number" value={formData.groesse} onChange={handleChange} required disabled={loading} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="miete">Miete (€)</Label>
            <Input id="miete" name="miete" type="number" value={formData.miete} onChange={handleChange} required disabled={loading} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="haus_id">Haus</Label>
            <CustomCombobox
              width="w-full"
              options={houseOptions}
              value={formData.haus_id}
              onChange={handleComboboxChange}
              placeholder="Wählen Sie ein Haus"
              searchPlaceholder="Haus suchen..."
              emptyText="Kein Haus gefunden."
              disabled={loading}
            />
          </div>
          <DialogFooter>
             <Button type="button" variant="outline" onClick={attemptClose} disabled={loading}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Wird gespeichert..." : (wohnungInitialData?.id ? "Aktualisieren" : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
