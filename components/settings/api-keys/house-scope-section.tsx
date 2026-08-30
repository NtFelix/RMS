"use client";

import { useMemo } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export interface HouseItem {
  id: string;
  name: string;
  strasse?: string;
  ort?: string;
}

interface HouseScopeSectionProps {
  idPrefix: string;
  houseScope: "all" | "selected";
  onScopeChange: (scope: "all" | "selected") => void;
  selectedHouseIds: string[];
  onSelectedHouseIdsChange: (ids: string[]) => void;
  availableHouses: HouseItem[];
}

export function HouseScopeSection({
  idPrefix,
  houseScope,
  onScopeChange,
  selectedHouseIds,
  onSelectedHouseIdsChange,
  availableHouses,
}: HouseScopeSectionProps) {
  const selectedSet = useMemo(() => new Set(selectedHouseIds), [selectedHouseIds]);

  const toggleHouse = (houseId: string) => {
    if (selectedSet.has(houseId)) {
      onSelectedHouseIdsChange(selectedHouseIds.filter((id) => id !== houseId));
    } else {
      onSelectedHouseIdsChange([...selectedHouseIds, houseId]);
    }
  };

  const handleSelectAllToggle = () => {
    if (selectedHouseIds.length === availableHouses.length) {
      onSelectedHouseIdsChange([]);
    } else {
      onSelectedHouseIdsChange(availableHouses.map((h) => h.id));
    }
  };

  return (
    <div className="space-y-2 pt-2">
      <span className="text-xs font-semibold block">Objekt-Zugriff (Häuser)</span>
      <div className="border border-border/60 rounded-lg p-3 space-y-3 bg-muted/20">
        <div className="flex flex-col gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`${idPrefix}-house-scope`}
              value="all"
              checked={houseScope === "all"}
              onChange={() => onScopeChange("all")}
              className="accent-primary"
            />
            <span>Alle Häuser (Zugriff auf alle freigegebenen Objekte)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`${idPrefix}-house-scope`}
              value="selected"
              checked={houseScope === "selected"}
              onChange={() => onScopeChange("selected")}
              className="accent-primary"
            />
            <span>Auf bestimmte Häuser einschränken</span>
          </label>
        </div>

        {houseScope === "selected" && (
          <div className="pt-2 border-t border-border/40 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Verfügbare Häuser:</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={handleSelectAllToggle}
              >
                {selectedHouseIds.length === availableHouses.length
                  ? "Keine auswählen"
                  : "Alle auswählen"}
              </Button>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {availableHouses.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1">
                  Keine Häuser gefunden.
                </p>
              ) : (
                availableHouses.map((h) => {
                  const isChecked = selectedSet.has(h.id);
                  const houseCheckboxId = `${idPrefix}-house-${h.id}`;
                  return (
                    <div
                      key={h.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 text-xs"
                    >
                      <Checkbox
                        id={houseCheckboxId}
                        checked={isChecked}
                        onCheckedChange={() => toggleHouse(h.id)}
                      />
                      <label
                        htmlFor={houseCheckboxId}
                        className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0"
                      >
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{h.name}</span>
                        {h.ort && (
                          <span className="text-muted-foreground truncate">
                            ({h.ort})
                          </span>
                        )}
                      </label>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
