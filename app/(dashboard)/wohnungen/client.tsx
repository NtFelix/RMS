"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ApartmentFilters } from "@/components/apartment-filters";
import { ApartmentTable } from "@/components/apartment-table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase/client";
import { Wohnung } from "./page";

// Client-side component for interactive UI elements
export function WohnungenClient({ 
  initialWohnungen, 
  houses 
}: { 
  initialWohnungen: Wohnung[], 
  houses: { id: string; name: string }[] 
}) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", groesse: "", miete: "", haus_id: "" });
  const reloadRef = useRef<(() => void) | null>(null);
  const [wohnungen, setWohnungen] = useState(initialWohnungen);

  // Apartment-Edit-Logik definieren
  const handleEdit = useCallback((row: Wohnung) => {
    setEditingId(row.id);
    setFormData({
      name: row.name,
      groesse: row.groesse?.toString() || "",
      miete: row.miete?.toString() || "",
      haus_id: row.haus_id || ""
    });
    setDialogOpen(true);
  }, []);

  // Event listener für edit-apartment Event
  const handleEditFromEvent = useCallback(async (apartmentId: string) => {
    try {
      // Wohnungsdaten laden
      const { data: apartment } = await createClient()
        .from('Wohnungen')
        .select('*')
        .eq('id', apartmentId)
        .single();
      
      if (!apartment) {
        console.error('Wohnung nicht gefunden:', apartmentId);
        return;
      }
      
      // Edit-Modal mit den Daten öffnen
      handleEdit(apartment as Wohnung);
    } catch (error) {
      console.error('Fehler beim Laden der Wohnung:', error);
    }
  }, [handleEdit]);

  // Client-side event listeners
  useEffect(() => {
    const handleEditApartment = (event: Event) => {
      const customEvent = event as CustomEvent<{id: string}>;
      const apartmentId = customEvent.detail?.id;
      if (!apartmentId) return;
      
      handleEditFromEvent(apartmentId);
    };
    
    // Event-Listener registrieren
    window.addEventListener('edit-apartment', handleEditApartment);
    
    // Cleanup
    return () => {
      window.removeEventListener('edit-apartment', handleEditApartment);
    };
  });

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingId(null);
      setFormData({ name: "", groesse: "", miete: "", haus_id: "" });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => 
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handle form submission using Server Actions pattern
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/wohnungen?id=${editingId}` : "/api/wohnungen";
    const method = editingId ? "PUT" : "POST";
    try {
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(formData) 
      });
      
      if (res.ok) {
        toast({ 
          title: editingId ? "Aktualisiert" : "Gespeichert", 
          description: editingId ? "Wohnung aktualisiert." : "Wohnung hinzugefügt." 
        });
        handleOpenChange(false);
        reloadRef.current?.();
      } else {
        const err = await res.json();
        toast({ title: "Fehler", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Fehler", description: "Netzwerkfehler.", variant: "destructive" });
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Wohnung hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Wohnung bearbeiten" : "Wohnung hinzufügen"}</DialogTitle>
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
                <Select value={formData.haus_id} onValueChange={v => setFormData({ ...formData, haus_id: v })}>
                  <SelectTrigger id="haus_id">
                    <SelectValue placeholder="Wählen Sie ein Haus" />
                  </SelectTrigger>
                  <SelectContent>
                    {houses.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit">{editingId ? "Aktualisieren" : "Speichern"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <ApartmentFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
      <ApartmentTable 
        filter={filter}
        searchQuery={searchQuery}
        reloadRef={reloadRef}
        onEdit={handleEdit}
        initialApartments={initialWohnungen}
      />
    </>
  );
}
