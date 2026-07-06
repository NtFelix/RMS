"use client";

import React from "react";
import { HausWithWohnungen } from "@/lib/organisation-types";
import { Checkbox } from "@/components/ui/checkbox";

interface ObjectScopeEditorProps {
  haeuser: HausWithWohnungen[];
  selectedHausIds: string[] | null; // null = unrestricted
  onChange: (hausIds: string[] | null) => void;
  disabled?: boolean;
  policyGrantedHausIds?: string[] | null; // null = unrestricted by policies
}

export function ObjectScopeEditor({
  haeuser,
  selectedHausIds,
  onChange,
  disabled = false,
  policyGrantedHausIds,
}: ObjectScopeEditorProps) {
  const isUnrestricted = selectedHausIds === null;

  const activeHausIds = React.useMemo(() => new Set(selectedHausIds || []), [selectedHausIds]);

  const isHausGrantedByPolicy = React.useMemo(() => {
    if (policyGrantedHausIds === undefined) return () => false;
    if (policyGrantedHausIds === null) return () => true;
    const set = new Set(policyGrantedHausIds);
    return (id: string) => set.has(id);
  }, [policyGrantedHausIds]);

  const isPolicyUnrestricted = policyGrantedHausIds === null;

  const totalHousesCount = haeuser.length;
  const totalWohnungenCount = haeuser.reduce((sum, h) => sum + h.wohnungen.length, 0);

  const selectedHousesCount = isUnrestricted
    ? totalHousesCount
    : haeuser.filter(h => activeHausIds.has(h.id) || isHausGrantedByPolicy(h.id)).length;

  const isLastHouse = !isUnrestricted && selectedHousesCount === 1;

  const toggleHaus = (hausId: string) => {
    if (disabled) return;
    if (isHausGrantedByPolicy(hausId)) return; // Prevent changing policy-granted access

    if (isUnrestricted) {
      const nextHausIds = haeuser.reduce<string[]>((acc, h) => {
        if (h.id !== hausId) acc.push(h.id);
        return acc;
      }, []);
      onChange(nextHausIds.length > 0 ? nextHausIds : null);
      return;
    }

    let nextHausIds = [...(selectedHausIds || [])];

    if (activeHausIds.has(hausId)) {
      if (isLastHouse) return;
      nextHausIds = nextHausIds.filter(id => id !== hausId);
    } else {
      nextHausIds.push(hausId);
    }

    onChange(nextHausIds.length === totalHousesCount ? null : nextHausIds);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Zusammenfassung:
          </span>{" "}
          <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2.5 py-1 rounded-full font-medium ml-1">
            {isUnrestricted || isPolicyUnrestricted
              ? `Voller Zugriff (${totalHousesCount} Häuser)`
              : `${selectedHousesCount} von ${totalHousesCount} Häusern`}
          </span>
          <span className="text-xs text-muted-foreground ml-2">
            ({totalWohnungenCount} Wohnungen)
          </span>
        </div>

        {!isUnrestricted && !isPolicyUnrestricted && !disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
          >
            Alle auswählen
          </button>
        )}
      </div>

      {isPolicyUnrestricted && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 p-3 rounded-xl text-xs font-medium">
          Eine zugewiesene Richtlinie gewährt vollen Zugriff auf alle Häuser und Wohnungen. Overrides sind nicht erforderlich.
        </div>
      )}

      {isUnrestricted && !isPolicyUnrestricted && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl text-xs font-medium">
          Keine Einschränkung — Mitarbeiter hat vollen Zugriff auf alle Häuser und Wohnungen.
        </div>
      )}

      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
        {haeuser.map(haus => {
          const isGrantedByPolicy = isHausGrantedByPolicy(haus.id);
          const isSelected = isUnrestricted || activeHausIds.has(haus.id) || isGrantedByPolicy;
          const isLocked = (isLastHouse && activeHausIds.has(haus.id)) || isGrantedByPolicy;
          return (
            <div
              key={haus.id}
              className={`p-3 border rounded-2xl flex items-center gap-3 ${
                isSelected
                  ? "bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                  : "bg-zinc-100/10 dark:bg-zinc-950/10 border-zinc-100 dark:border-zinc-900 opacity-60"
              }`}
            >
              <Checkbox
                id={`haus-${haus.id}`}
                checked={isSelected}
                onCheckedChange={() => toggleHaus(haus.id)}
                disabled={disabled || isLocked}
              />
              <label
                htmlFor={`haus-${haus.id}`}
                className={`text-sm font-semibold select-none flex-1 flex items-center justify-between ${
                  isLocked && !isGrantedByPolicy
                    ? "text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                    : isGrantedByPolicy
                    ? "text-zinc-800 dark:text-zinc-200 cursor-default"
                    : "text-zinc-800 dark:text-zinc-200 cursor-pointer"
                }`}
              >
                <span className="flex items-center gap-2">
                  {haus.name}
                  {isLocked && !isGrantedByPolicy && (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">
                      (mindestens eines erforderlich)
                    </span>
                  )}
                  {isGrantedByPolicy && (
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full font-medium">
                      Richtlinie
                    </span>
                  )}
                </span>
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
