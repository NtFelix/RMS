"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ApiKeyItem, AVAILABLE_MODULES, AVAILABLE_ACTIONS } from "./types";

interface ApiKeyApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyItem: ApiKeyItem | null;
  onSuccess: (plaintextSecret: string) => void;
}

function getNormalizedPermissions(keyItem: ApiKeyItem | null): Record<string, Record<string, boolean>> {
  if (!keyItem) return {};
  const rawModule = (keyItem.angefragte_berechtigungen?.module as Record<string, unknown>) || {};
  const normalized: Record<string, Record<string, boolean>> = {};

  Object.entries(rawModule).forEach(([modul, actions]) => {
    normalized[modul] = {};
    if (Array.isArray(actions)) {
      actions.forEach((act: string) => {
        normalized[modul][act] = true;
      });
    } else if (actions && typeof actions === "object") {
      Object.entries(actions).forEach(([act, val]) => {
        if (val === true || val === "true") {
          normalized[modul][act] = true;
        }
      });
    }
  });

  return normalized;
}

export function ApiKeyApproveDialog({ open, onOpenChange, keyItem, onSuccess }: ApiKeyApproveDialogProps) {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>(() => getNormalizedPermissions(keyItem));
  const [submitting, setSubmitting] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && keyItem) {
      setPermissions(getNormalizedPermissions(keyItem));
    }
    onOpenChange(newOpen);
  };

  const handleApprove = async () => {
    if (!keyItem) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/einstellungen/api-keys/${keyItem.id}/genehmigen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          berechtigungen: { module: permissions },
          environment: keyItem.environment,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Fehler bei der Genehmigung.");
      }

      onOpenChange(false);
      onSuccess(json.plaintext);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler bei der Genehmigung.";
      toast({
        title: "Fehler",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = (modul: string, aktion: string, checked: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [modul]: {
        ...(prev[modul] || {}),
        [aktion]: checked,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>API-Schlüssel genehmigen</DialogTitle>
          <DialogDescription>
            Prüfen und passen Sie die Berechtigungen für <strong>{keyItem?.name}</strong> an.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2 items-start">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Hinweis: Die finalen Rechte werden serverseitig automatisch auf die maximalen Rechte des Antragstellers
              begrenzt.
            </p>
          </div>

          <div className="space-y-4">
            {AVAILABLE_MODULES.map((modul) => (
              <div key={modul.id} className="rounded-lg border p-3 bg-card">
                <div className="font-medium text-sm mb-2">{modul.label}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AVAILABLE_ACTIONS.map((aktion) => {
                    const isChecked = !!permissions[modul.id]?.[aktion.id];
                    return (
                      <label
                        key={aktion.id}
                        className="flex items-center space-x-2 text-xs cursor-pointer hover:text-foreground"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(c) => togglePermission(modul.id, aktion.id, !!c)}
                        />
                        <span>{aktion.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Abbrechen
          </Button>
          <Button onClick={handleApprove} disabled={submitting}>
            {submitting ? "Genehmige..." : "Genehmigen & Schlüssel anzeigen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
