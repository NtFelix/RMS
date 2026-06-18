"use client";

import React from "react";
import { HausWithWohnungen } from "@/lib/organisation-types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface ObjectScopeEditorProps {
  haeuser: HausWithWohnungen[];
  selectedHausIds: string[] | null; // null = unrestricted
  selectedWohnungIds: string[] | null;
  onChange: (hausIds: string[] | null, wohnungIds: string[] | null) => void;
  disabled?: boolean;
}

export function ObjectScopeEditor({
  haeuser,
  selectedHausIds,
  selectedWohnungIds,
  onChange,
  disabled = false,
}: ObjectScopeEditorProps) {
  // Helpers to resolve current checked states
  const isUnrestricted = selectedHausIds === null;

  // Actual selected set for easier lookup
  const activeHausIds = React.useMemo(() => new Set(selectedHausIds || []), [selectedHausIds]);
  const activeWohnungIds = React.useMemo(() => new Set(selectedWohnungIds || []), [selectedWohnungIds]);

  const totalHousesCount = haeuser.length;
  const totalWohnungenCount = haeuser.reduce((sum, h) => sum + h.wohnungen.length, 0);

  // Current selections
  const selectedHousesCount = isUnrestricted ? totalHousesCount : haeuser.filter(h => activeHausIds.has(h.id)).length;
  const selectedWohnungenCount = isUnrestricted
    ? totalWohnungenCount
    : haeuser.reduce((sum, h) => {
        if (activeHausIds.has(h.id)) {
          // If house is checked, count how many of its apartments are checked (or all if we default to all)
          // Actually, our override jsonb only tracks selectedWohnungIds. Let's count them.
          const houseWohnungIds = h.wohnungen.map(w => w.id);
          const checkedInHouse = houseWohnungIds.filter(id => activeWohnungIds.has(id)).length;
          return sum + checkedInHouse;
        }
        return sum;
      }, 0);

  const handleSelectAll = () => {
    if (disabled) return;
    onChange(null, null); // null = unrestricted
  };

  const handleDeselectAll = () => {
    if (disabled) return;
    // Set to concrete empty arrays to restrict completely
    onChange([], []);
  };

  const toggleHaus = (hausId: string) => {
    if (disabled) return;

    let nextHausIds = isUnrestricted ? haeuser.map(h => h.id) : [...(selectedHausIds || [])];
    let nextWohnungIds = isUnrestricted ? haeuser.flatMap(h => h.wohnungen.map(w => w.id)) : [...(selectedWohnungIds || [])];

    const targetHaus = haeuser.find(h => h.id === hausId);
    if (!targetHaus) return;

    const targetWohnungIds = targetHaus.wohnungen.map(w => w.id);

    if (isUnrestricted || activeHausIds.has(hausId)) {
      // Remove house and all its apartments
      nextHausIds = nextHausIds.filter(id => id !== hausId);
      nextWohnungIds = nextWohnungIds.filter(id => !targetWohnungIds.includes(id));
    } else {
      // Add house and all its apartments
      nextHausIds.push(hausId);
      targetWohnungIds.forEach(id => {
        if (!nextWohnungIds.includes(id)) {
          nextWohnungIds.push(id);
        }
      });
    }

    // Check if everything is selected, if so set to null (unrestricted)
    if (
      nextHausIds.length === totalHousesCount &&
      nextWohnungIds.length === totalWohnungenCount
    ) {
      onChange(null, null);
    } else {
      onChange(nextHausIds, nextWohnungIds);
    }
  };

  const toggleWohnung = (hausId: string, wohnungId: string) => {
    if (disabled) return;

    let nextHausIds = isUnrestricted ? haeuser.map(h => h.id) : [...(selectedHausIds || [])];
    let nextWohnungIds = isUnrestricted ? haeuser.flatMap(h => h.wohnungen.map(w => w.id)) : [...(selectedWohnungIds || [])];

    if (isUnrestricted || activeWohnungIds.has(wohnungId)) {
      // Remove apartment
      nextWohnungIds = nextWohnungIds.filter(id => id !== wohnungId);
      
      // If no apartments of this house are checked anymore, remove house too
      const targetHaus = haeuser.find(h => h.id === hausId);
      if (targetHaus) {
        const remainingChecked = targetHaus.wohnungen.filter(w => w.id !== wohnungId && nextWohnungIds.includes(w.id)).length;
        if (remainingChecked === 0) {
          nextHausIds = nextHausIds.filter(id => id !== hausId);
        }
      }
    } else {
      // Add apartment
      nextWohnungIds.push(wohnungId);
      // Ensure parent house is selected
      if (!nextHausIds.includes(hausId)) {
        nextHausIds.push(hausId);
      }
    }

    // Check if everything is selected, if so set to null (unrestricted)
    if (
      nextHausIds.length === totalHousesCount &&
      nextWohnungIds.length === totalWohnungenCount
    ) {
      onChange(null, null);
    } else {
      onChange(nextHausIds, nextWohnungIds);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Overview stats bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Zusammenfassung:
          </span>{" "}
          <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2.5 py-1 rounded-full font-medium ml-1">
            {isUnrestricted ? "Voller Zugriff" : `${selectedHousesCount} von ${totalHousesCount} Häusern`}
          </span>
          {!isUnrestricted && (
            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2.5 py-1 rounded-full font-medium ml-2">
              {selectedWohnungenCount} von ${totalWohnungenCount} Wohnungen
            </span>
          )}
        </div>

        {!disabled && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleSelectAll}
              className="text-xs rounded-lg h-7"
            >
              Alle auswählen
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleDeselectAll}
              className="text-xs rounded-lg h-7 text-red-500 hover:text-red-600"
            >
              Alle abwählen
            </Button>
          </div>
        )}
      </div>

      {isUnrestricted && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl text-xs font-medium">
          Keine Einschränkung — Mitarbeiter hat vollen Zugriff auf alle Häuser und Wohnungen.
        </div>
      )}

      {/* Checkbox tree list */}
      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
        {haeuser.map(haus => {
          const isHausChecked = isUnrestricted || activeHausIds.has(haus.id);
          const hasApartments = haus.wohnungen.length > 0;

          // Determine if indeterminate (some apartments checked but not all, or house checked but not all apartments)
          const checkedApartmentsCount = haus.wohnungen.filter(w => activeWohnungIds.has(w.id)).length;
          const isIndeterminate = !isUnrestricted && checkedApartmentsCount > 0 && checkedApartmentsCount < haus.wohnungen.length;

          return (
            <div
              key={haus.id}
              className={`p-3 border rounded-2xl transition-colors duration-200 ${
                isHausChecked
                  ? "bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                  : "bg-zinc-100/10 dark:bg-zinc-950/10 border-zinc-100 dark:border-zinc-900 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`haus-${haus.id}`}
                  checked={isIndeterminate ? "indeterminate" : isHausChecked}
                  onCheckedChange={() => toggleHaus(haus.id)}
                  disabled={disabled}
                />
                <label
                  htmlFor={`haus-${haus.id}`}
                  className="text-sm font-semibold cursor-pointer select-none text-zinc-800 dark:text-zinc-200 flex-1"
                >
                  {haus.name}
                </label>
              </div>

              {hasApartments && (
                <div className="mt-3 pl-7 pt-2 border-t border-zinc-200/50 dark:border-zinc-850/50 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {haus.wohnungen.map(wohnung => {
                    const isWohnungChecked = isUnrestricted || activeWohnungIds.has(wohnung.id);
                    return (
                      <div key={wohnung.id} className="flex items-center gap-2.5 py-0.5">
                        <Checkbox
                          id={`w-${wohnung.id}`}
                          checked={isWohnungChecked}
                          onCheckedChange={() => toggleWohnung(haus.id, wohnung.id)}
                          disabled={disabled || (!isHausChecked && !isWohnungChecked)}
                        />
                        <label
                          htmlFor={`w-${wohnung.id}`}
                          className="text-xs cursor-pointer select-none text-zinc-600 dark:text-zinc-400 flex-1 truncate"
                        >
                          {wohnung.name}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {haeuser.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-6">
            Keine Häuser in dieser Organisation vorhanden.
          </div>
        )}
      </div>
    </div>
  );
}
