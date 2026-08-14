"use client";

import { useState, useEffect } from "react";
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

export function ApiKeyApproveDialog({ open, onOpenChange, keyItem, onSuccess }: ApiKeyApproveDialogProps) {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (keyItem) {
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

      setPermissions(normalized);
    }
  }, [keyItem]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>API-Schlüssel genehmigen</DialogTitle>
          <DialogDescription>
            Prüfen und passen Sie den finalen Berechtigungsumfang für „{keyItem?.name}“ an.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs flex items-start gap-2.5 text-blue-700 dark:text-blue-300">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Hinweis zur Sicherheitsbegrenzung:</strong> Die gespeicherten Rechte werden serverseitig automatisch auf die effektiven Berechtigungen des Antragstellers begrenzt.
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold block">Finaler Berechtigungsumfang</span>
            <div className="border border-border/60 rounded-lg p-3 space-y-3 bg-muted/20">
              {AVAILABLE_MODULES.map((mod) => (
                <div key={mod.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="font-medium w-32">{mod.label}</span>
                  <div className="flex items-center gap-4 flex-wrap">
                    {AVAILABLE_ACTIONS.map((act) => {
                      const isChecked = !!permissions[mod.id]?.[act.id];
                      const checkboxId = `appr-mod-${mod.id}-act-${act.id}`;
                      return (
                        <div key={act.id} className="flex items-center gap-1.5">
                          <Checkbox
                            id={checkboxId}
                            checked={isChecked}
                            onCheckedChange={(val) => {
                              setPermissions((prev) => ({
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
          <Button onClick={handleApprove} disabled={submitting}>
            {submitting ? "Genehmige..." : "Genehmigen & Secret generieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
