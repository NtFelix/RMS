"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Nebenkosten, Haus } from "../lib/data-fetching";
import { createNebenkosten, updateNebenkosten } from "../app/betriebskosten-actions";
import { useToast } from "../hooks/use-toast";

interface BetriebskostenEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  nebenkostenToEdit?: Nebenkosten | null;
  haeuser: Haus[];
  userId: string;
}

export function BetriebskostenEditModal({
  isOpen,
  onClose,
  nebenkostenToEdit,
  haeuser,
  userId,
}: BetriebskostenEditModalProps) {
  const [jahr, setJahr] = useState("");
  const [wasserkosten, setWasserkosten] = useState("");
  const [haeuserId, setHaeuserId] = useState("");
  const [nebenkostenartStr, setNebenkostenartStr] = useState("");
  const [betragStr, setBetragStr] = useState("");
  const [berechnungsartStr, setBerechnungsartStr] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (nebenkostenToEdit) {
        setJahr(nebenkostenToEdit.jahr || "");
        setHaeuserId(nebenkostenToEdit.haeuser_id || "");
        setNebenkostenartStr(nebenkostenToEdit.nebenkostenart?.join("\n") || "");
        setBetragStr(nebenkostenToEdit.betrag?.map(String).join("\n") || "");
        setBerechnungsartStr(nebenkostenToEdit.berechnungsart?.join("\n") || "");
        setWasserkosten(nebenkostenToEdit.wasserkosten?.toString() || "");
      } else {
        setJahr(new Date().getFullYear().toString()); // Default to current year
        setHaeuserId(haeuser && haeuser.length > 0 ? haeuser[0].id : ""); // Default to first house if available
        setNebenkostenartStr("");
        setBetragStr("");
        setBerechnungsartStr("");
        setWasserkosten("");
      }
    }
  }, [isOpen, nebenkostenToEdit, haeuser]);

  const handleSubmit = async () => {
    setIsSaving(true);

    if (!jahr || !haeuserId) {
      toast({
        title: "Fehlende Eingaben",
        description: "Jahr und Haus sind Pflichtfelder.",
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    const parsedNebenkostenart = nebenkostenartStr.split("\n").filter((s) => s.trim() !== "");
    const parsedBetrag = betragStr.split("\n").filter((s) => s.trim() !== "").map(Number);
    const parsedBerechnungsart = berechnungsartStr.split("\n").filter((s) => s.trim() !== "");
    const parsedWasserkosten = wasserkosten ? parseFloat(wasserkosten) : null;

    if (parsedBetrag.some(isNaN)) {
      toast({
        title: "Ungültige Beträge",
        description: "Bitte überprüfen Sie die eingegebenen Beträge. Nur Zahlen sind erlaubt.",
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    const formData = {
      jahr,
      nebenkostenart: parsedNebenkostenart,
      betrag: parsedBetrag,
      berechnungsart: parsedBerechnungsart,
      wasserkosten: parsedWasserkosten,
      haeuser_id: haeuserId,
      user_id: userId,
    };

    let response;
    if (nebenkostenToEdit) {
      response = await updateNebenkosten(nebenkostenToEdit.id, formData);
    } else {
      response = await createNebenkosten(formData);
    }

    if (response.success) {
      toast({
        title: "Erfolgreich gespeichert",
        description: "Die Betriebskostendaten wurden erfolgreich gespeichert.",
      });
      onClose();
    } else {
      toast({
        title: "Fehler beim Speichern",
        description: response.message || "Ein unbekannter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    }

    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <DialogHeader>
            <DialogTitle>
              {nebenkostenToEdit ? "Betriebskosten bearbeiten" : "Neue Betriebskostenabrechnung"}
            </DialogTitle>
            <DialogDescription>
              Füllen Sie die Details für die Betriebskostenabrechnung aus.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="jahr" className="text-right">Jahr</Label>
              <Input id="jahr" value={jahr} onChange={(e) => setJahr(e.target.value)} className="col-span-3" placeholder="z.B. 2023" />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="haus" className="text-right">Haus</Label>
              <Select value={haeuserId} onValueChange={setHaeuserId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Wählen Sie ein Haus" />
                </SelectTrigger>
                <SelectContent>
                  {haeuser.map((haus) => (
                    <SelectItem key={haus.id} value={haus.id}>
                      {haus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nebenkostenart" className="text-right">Kostenarten</Label>
              <Textarea id="nebenkostenart" value={nebenkostenartStr} onChange={(e) => setNebenkostenartStr(e.target.value)} className="col-span-3" placeholder="Jede Kostenart in einer neuen Zeile (z.B. Heizung)"/>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="betrag" className="text-right">Beträge</Label>
              <Textarea id="betrag" value={betragStr} onChange={(e) => setBetragStr(e.target.value)} className="col-span-3" placeholder="Jeder Betrag in einer neuen Zeile (z.B. 120.50)"/>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="berechnungsart" className="text-right">Berechnungsarten</Label>
              <Textarea id="berechnungsart" value={berechnungsartStr} onChange={(e) => setBerechnungsartStr(e.target.value)} className="col-span-3" placeholder="Jede Berechnungsart in einer neuen Zeile (z.B. pro m²)"/>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wasserkosten" className="text-right">Wasserkosten</Label>
              <Input id="wasserkosten" type="number" value={wasserkosten} onChange={(e) => setWasserkosten(e.target.value)} className="col-span-3" placeholder="z.B. 300.75"/>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
