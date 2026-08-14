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

interface ApiKeyRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ApiKeyRequestDialog({ open, onOpenChange, onSuccess }: ApiKeyRequestDialogProps) {
  const { toast } = useToast();
  const [keyName, setKeyName] = useState("");
  const [environment, setEnvironment] = useState<"live" | "test">("live");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedModules, setSelectedModules] = useState<Record<string, Record<string, boolean>>>({
    haeuser: { ansehen: true },
    wohnungen: { ansehen: true },
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!keyName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen für den API-Key ein.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: keyName.trim(),
        environment,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        angefragte_berechtigungen: {
          module: selectedModules,
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
      setKeyName("");
      setExpiresAt("");
      setSelectedModules({
        haeuser: { ansehen: true },
        wohnungen: { ansehen: true },
      });
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>API-Schlüssel beantragen</DialogTitle>
          <DialogDescription>
            Wählen Sie den gewünschten Namen und die benötigten Berechtigungen.
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
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
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
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as "live" | "test")}
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
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold block">Angefragte Berechtigungen</span>
            <div className="border border-border/60 rounded-lg p-3 space-y-3 bg-muted/20">
              {AVAILABLE_MODULES.map((mod) => (
                <div key={mod.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="font-medium w-32">{mod.label}</span>
                  <div className="flex items-center gap-4 flex-wrap">
                    {AVAILABLE_ACTIONS.map((act) => {
                      const isChecked = !!selectedModules[mod.id]?.[act.id];
                      const checkboxId = `req-mod-${mod.id}-act-${act.id}`;
                      return (
                        <div key={act.id} className="flex items-center gap-1.5">
                          <Checkbox
                            id={checkboxId}
                            checked={isChecked}
                            onCheckedChange={(val) => {
                              setSelectedModules((prev) => ({
                                ...prev,
                                [mod.id]: {
                                  ...(prev[mod.id] || {}),
                                  [act.id]: !!val,
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
