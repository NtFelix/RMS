"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AVAILABLE_MODULES, AVAILABLE_ACTIONS } from "./types";
import { HouseScopeSection, HouseItem } from "./house-scope-section";

interface FormState {
  keyName: string;
  environment: "live" | "test";
  expiresAt: string;
  selectedModules: Record<string, Record<string, boolean>>;
  houseScope: "all" | "selected";
  selectedHouseIds: string[];
}

const initialFormState: FormState = {
  keyName: "",
  environment: "live",
  expiresAt: "",
  selectedModules: {
    haeuser: { ansehen: true },
    wohnungen: { ansehen: true },
  },
  houseScope: "all",
  selectedHouseIds: [],
};

interface ApiKeyRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ApiKeyRequestDialog({ open, onOpenChange, onSuccess }: ApiKeyRequestDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [availableHouses, setAvailableHouses] = useState<HouseItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      fetch("/api/haeuser")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setAvailableHouses(data);
          }
        })
        .catch((err) => {
          console.error("Fehler beim Laden der Häuser:", err);
        });
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (!form.keyName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen für den API-Key ein.",
        variant: "destructive",
      });
      return;
    }

    if (form.houseScope === "selected" && form.selectedHouseIds.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie mindestens ein Haus aus oder wählen Sie 'Alle Häuser'.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: form.keyName.trim(),
        environment: form.environment,
        expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        angefragte_berechtigungen: {
          module: form.selectedModules,
          haeuser: form.houseScope === "selected" ? form.selectedHouseIds : null,
        },
      };

      const res = await fetch("/api/einstellungen/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Fehler beim Beantragen des API-Keys.");
      }

      toast({
        title: "Erfolg",
        description: "API-Key wurde erfolgreich beantragt und wartet auf Genehmigung.",
        variant: "success",
      });

      onOpenChange(false);
      setForm(initialFormState);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler beim Beantragen.";
      toast({
        title: "Fehler",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>API-Schlüssel beantragen</DialogTitle>
          <DialogDescription>
            Wählen Sie den Namen, Modulberechtigungen und den Objekt-Zugriff.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="api-key-name-input" className="text-xs font-semibold">
              Name des Schlüssels
            </label>
            <Input
              id="api-key-name-input"
              placeholder="z. B. Buchhaltungs-Integration"
              value={form.keyName}
              onChange={(e) => setForm((prev) => ({ ...prev, keyName: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="api-key-env-select" className="text-xs font-semibold">
                Umgebung
              </label>
              <select
                id="api-key-env-select"
                aria-label="Umgebung"
                value={form.environment}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, environment: e.target.value as "live" | "test" }))
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
              >
                <option value="live">Live</option>
                <option value="test">Test</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="api-key-expires-input" className="text-xs font-semibold">
                Ablaufdatum (optional)
              </label>
              <Input
                id="api-key-expires-input"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
              />
            </div>
          </div>

          {/* Module Permissions */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold block">Angefragte Modul-Berechtigungen</span>
            <div className="border border-border/60 rounded-lg p-3 space-y-3 bg-muted/20">
              {AVAILABLE_MODULES.map((mod) => (
                <div key={mod.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="font-medium w-32">{mod.label}</span>
                  <div className="flex items-center gap-4 flex-wrap">
                    {AVAILABLE_ACTIONS.map((act) => {
                      const isChecked = !!form.selectedModules[mod.id]?.[act.id];
                      const checkboxId = `req-mod-${mod.id}-act-${act.id}`;
                      return (
                        <div key={act.id} className="flex items-center gap-1.5">
                          <Checkbox
                            id={checkboxId}
                            checked={isChecked}
                            onCheckedChange={(val) => {
                              setForm((prev) => ({
                                ...prev,
                                selectedModules: {
                                  ...prev.selectedModules,
                                  [mod.id]: {
                                    ...(prev.selectedModules[mod.id] || {}),
                                    [act.id]: !!val,
                                  },
                                },
                              }));
                            }}
                          />
                          <label htmlFor={checkboxId} className="cursor-pointer">
                            {act.label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* House Object Scoping */}
          <HouseScopeSection
            idPrefix="req"
            houseScope={form.houseScope}
            onScopeChange={(scope) => setForm((prev) => ({ ...prev, houseScope: scope }))}
            selectedHouseIds={form.selectedHouseIds}
            onSelectedHouseIdsChange={(ids) => setForm((prev) => ({ ...prev, selectedHouseIds: ids }))}
            availableHouses={availableHouses}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Beantrage..." : "Antrag absenden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
