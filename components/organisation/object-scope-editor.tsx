"use client";

import React from "react";
import { HausWithWohnungen } from "@/lib/organisation-types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface ObjectScopeEditorProps {
  haeuser: HausWithWohnungen[];
  selectedHausIds: string[] | null; // null = unrestricted
  onChange: (hausIds: string[] | null) => void;
  disabled?: boolean;
}

export function ObjectScopeEditor({
  haeuser,
  selectedHausIds,
  onChange,
  disabled = false,
}: ObjectScopeEditorProps) {
  const isUnrestricted = selectedHausIds === null;

  const activeHausIds = React.useMemo(() => new Set(selectedHausIds || []), [selectedHausIds]);

  const totalHousesCount = haeuser.length;
  const totalWohnungenCount = haeuser.reduce((sum, h) => sum + h.wohnungen.length, 0);

  const selectedHousesCount = isUnrestricted
    ? totalHousesCount
    : haeuser.filter(h => activeHausIds.has(h.id)).length;

  const handleSelectAll = () => {
    if (disabled) return;
    onChange(null); // null = unrestricted
  };

  const handleDeselectAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const toggleHaus = (hausId: string) => {
    if (disabled) return;

    let nextHausIds = isUnrestricted ? haeuser.map(h => h.id) : [...(selectedHausIds || [])];

    if (isUnrestricted || activeHausIds.has(hausId)) {
      nextHausIds = nextHausIds.filter(id => id !== hausId);
    } else {
      nextHausIds.push(hausId);
    }

    if (nextHausIds.length === totalHousesCount) {
      onChange(null);
    } else {
      onChange(nextHausIds);
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
            {isUnrestricted
              ? `Voller Zugriff (${totalHousesCount} Häuser)`
              : `${selectedHousesCount} von ${totalHousesCount} Häusern`}
          </span>
          <span className="text-xs text-muted-foreground ml-2">
            ({totalWohnungenCount} Wohnungen aus Haus-Scope abgeleitet)
          </span>
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

      {/* House checkbox list */}
      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
        {haeuser.map(haus => {
          const isHausChecked = isUnrestricted || activeHausIds.has(haus.id);
          return (
            <div
              key={haus.id}
              className={`p-3 border rounded-2xl transition-colors duration-200 flex items-center gap-3 ${
                isHausChecked
                  ? "bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                  : "bg-zinc-100/10 dark:bg-zinc-950/10 border-zinc-100 dark:border-zinc-900 opacity-60"
              }`}
            >
              <Checkbox
                id={`haus-${haus.id}`}
                checked={isHausChecked}
                onCheckedChange={() => toggleHaus(haus.id)}
                disabled={disabled}
              />
              <label
                htmlFor={`haus-${haus.id}`}
                className="text-sm font-semibold cursor-pointer select-none text-zinc-800 dark:text-zinc-200 flex-1"
              >
                {haus.name}
              </label>
              <span className="text-[10px] text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                {haus.wohnungen.length} Wohn.
              </span>
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
