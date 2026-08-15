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
import { HouseScopeSection, HouseItem } from "./house-scope-section";

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

function getInitialHouseScope(keyItem: ApiKeyItem | null): { scope: "all" | "selected"; ids: string[] } {
  if (!keyItem) return { scope: "all", ids: [] };
  const rawHaeuser = keyItem.angefragte_berechtigungen?.haeuser;
  if (Array.isArray(rawHaeuser) && rawHaeuser.length > 0) {
    return { scope: "selected", ids: rawHaeuser.filter((h): h is string => typeof h === "string") };
  }
  return { scope: "all", ids: [] };
}

export function ApiKeyApproveDialog({ open, onOpenChange, keyItem, onSuccess }: ApiKeyApproveDialogProps) {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>(() => getNormalizedPermissions(keyItem));
  const [houseScope, setHouseScope] = useState<"all" | "selected">(() => getInitialHouseScope(keyItem).scope);
  const [selectedHouseIds, setSelectedHouseIds] = useState<string[]>(() => getInitialHouseScope(keyItem).ids);
  const [availableHouses, setAvailableHouses] = useState<HouseItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && keyItem) {
      setPermissions(getNormalizedPermissions(keyItem));
      const initHouses = getInitialHouseScope(keyItem);
      setHouseScope(initHouses.scope);
      setSelectedHouseIds(initHouses.ids);
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

  const handleApprove = async () => {
    if (!keyItem) return;

    if (houseScope === "selected" && selectedHouseIds.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie mindestens ein Haus aus oder wählen Sie 'Alle Häuser'.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/einstellungen/api-keys/${keyItem.id}/genehmigen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          berechtigungen: {
            module: permissions,
            haeuser: houseScope === "selected" ? selectedHouseIds : null,
          },
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
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>API-Schlüssel genehmigen</DialogTitle>
          <DialogDescription>
            Prüfen und passen Sie die Berechtigungen für <strong>{keyItem?.name}</strong> an.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2 items-start">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Hinweis: Die finalen Rechte werden serverseitig automatisch auf die maximalen Rechte des Antragstellers
              begrenzt.
            </p>
          </div>

          {/* Module Permissions */}
          <div className="space-y-3">
            <span className="text-xs font-semibold block">Modul-Berechtigungen</span>
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

          {/* House Object Scoping */}
          <HouseScopeSection
            idPrefix="appr"
            houseScope={houseScope}
            onScopeChange={setHouseScope}
            selectedHouseIds={selectedHouseIds}
            onSelectedHouseIdsChange={setSelectedHouseIds}
            availableHouses={availableHouses}
          />
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
