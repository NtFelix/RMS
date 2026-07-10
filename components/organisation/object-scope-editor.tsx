"use client";

import React, { useState, useMemo } from "react";
import { HausWithWohnungen } from "@/lib/organisation-types";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [expandedHouses, setExpandedHouses] = useState<Set<string>>(new Set());

  const isUnrestricted = selectedHausIds === null;
  const activeHausIds = useMemo(() => new Set(selectedHausIds || []), [selectedHausIds]);

  const isHausGrantedByPolicy = useMemo(() => {
    if (policyGrantedHausIds === undefined) return () => false;
    if (policyGrantedHausIds === null) return () => true;
    const set = new Set(policyGrantedHausIds);
    return (id: string) => set.has(id);
  }, [policyGrantedHausIds]);

  const isPolicyUnrestricted = policyGrantedHausIds === null;

  const totalHousesCount = haeuser.length;
  const totalWohnungenCount = useMemo(() => haeuser.reduce((sum, h) => sum + h.wohnungen.length, 0), [haeuser]);

  // If unrestricted, all houses are selected. Otherwise, selected houses are either in activeHausIds or granted by policy.
  const selectedHousesCount = isUnrestricted
    ? totalHousesCount
    : haeuser.filter(h => activeHausIds.has(h.id) || isHausGrantedByPolicy(h.id)).length;

  const selectedWohnungenCount = useMemo(() => {
    if (isUnrestricted || isPolicyUnrestricted) return totalWohnungenCount;
    return haeuser
      .filter(h => activeHausIds.has(h.id) || isHausGrantedByPolicy(h.id))
      .reduce((sum, h) => sum + h.wohnungen.length, 0);
  }, [isUnrestricted, isPolicyUnrestricted, haeuser, activeHausIds, isHausGrantedByPolicy, totalWohnungenCount]);

  const toggleExpand = (hausId: string) => {
    const next = new Set(expandedHouses);
    if (next.has(hausId)) {
      next.delete(hausId);
    } else {
      next.add(hausId);
    }
    setExpandedHouses(next);
  };

  const toggleHaus = (hausId: string) => {
    if (disabled) return;
    if (isHausGrantedByPolicy(hausId)) return; // Prevent changing policy-granted access

    let nextHausIds: string[];

    if (isUnrestricted) {
      // Transition from null to concrete list of all houses except the one deselected
      nextHausIds = haeuser
        .map(h => h.id)
        .filter(id => id !== hausId);
    } else {
      const isCurrentlyChecked = activeHausIds.has(hausId);
      if (isCurrentlyChecked) {
        nextHausIds = (selectedHausIds || []).filter(id => id !== hausId);
      } else {
        nextHausIds = [...(selectedHausIds || []), hausId];
      }
    }

    // Check if all houses are checked (either by choice or policy)
    const allChecked = haeuser.every(h => nextHausIds.includes(h.id) || isHausGrantedByPolicy(h.id));
    if (allChecked) {
      onChange(null);
    } else {
      onChange(nextHausIds);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(null);
  };

  const deselectAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {selectedHousesCount} von {totalHousesCount} Häusern ausgewählt · {selectedWohnungenCount} von {totalWohnungenCount} Wohnungen
        </div>
        {!disabled && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Alle auswählen
            </button>
            <span className="text-zinc-300 dark:text-zinc-700 text-xs">|</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Alle abwählen
            </button>
          </div>
        )}
      </div>

      {/* Info banner for unrestricted access */}
      {(isUnrestricted || isPolicyUnrestricted) && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-3.5 rounded-xl text-xs font-medium leading-normal animate-in fade-in duration-200">
          No restriction — this member has access to all houses
        </div>
      )}

      {/* Checkbox tree */}
      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
        {haeuser.map(haus => {
          const isGrantedByPolicy = isHausGrantedByPolicy(haus.id);
          const isChecked = isUnrestricted || activeHausIds.has(haus.id) || isGrantedByPolicy;
          const isExpanded = expandedHouses.has(haus.id);
          const hasWohnungen = haus.wohnungen && haus.wohnungen.length > 0;

          return (
            <div key={haus.id} className="flex flex-col gap-1.5">
              {/* House Row */}
              <div
                className={cn(
                  "p-3 border rounded-2xl flex items-center gap-3 transition-all",
                  isChecked
                    ? "bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                    : "bg-zinc-100/10 dark:bg-zinc-950/10 border-zinc-100 dark:border-zinc-900 opacity-60"
                )}
              >
                {/* Chevron expand toggle */}
                {hasWohnungen ? (
                  <button
                    type="button"
                    onClick={() => toggleExpand(haus.id)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? `${haus.name} einklappen` : `${haus.name} ausklappen`}
                    className="p-1 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 rounded-md transition-all text-zinc-500"
                  >
                    <ChevronRight
                      className={cn(
                        "size-4 transition-transform duration-200",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </button>
                ) : (
                  <div className="size-6" /> // spacer
                )}

                <Checkbox
                  id={`haus-${haus.id}`}
                  checked={isChecked}
                  onCheckedChange={() => toggleHaus(haus.id)}
                  disabled={disabled || isGrantedByPolicy}
                />
                
                <label
                  htmlFor={`haus-${haus.id}`}
                  className={cn(
                    "text-sm select-none flex-1 flex items-center justify-between cursor-pointer",
                    isChecked ? "font-normal text-zinc-800 dark:text-zinc-200" : "text-muted-foreground",
                    isGrantedByPolicy && "cursor-default"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {haus.name}
                    {isGrantedByPolicy && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full font-medium border border-indigo-200/30">
                        Richtlinie
                      </span>
                    )}
                  </span>
                </label>
                <span className="text-[10px] text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                  {haus.wohnungen.length} Wohn.
                </span>
              </div>

              {/* Indented Apartments (only if expanded) */}
              {hasWohnungen && isExpanded && (
                <div className="pl-10 pr-2 py-1 space-y-1.5 border-l-2 border-zinc-200 dark:border-zinc-800 ml-6 animate-in slide-in-from-left-2 duration-150">
                  {haus.wohnungen.map(wohnung => (
                    <div
                      key={wohnung.id}
                      className={cn(
                        "p-2.5 border border-zinc-100 dark:border-zinc-900 rounded-xl flex items-center gap-3 bg-white/50 dark:bg-zinc-900/30",
                        isChecked ? "font-normal text-zinc-800 dark:text-zinc-200" : "text-muted-foreground opacity-60"
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs select-none flex-1",
                          isChecked ? "font-normal text-zinc-700 dark:text-zinc-300" : "text-muted-foreground"
                        )}
                      >
                        {wohnung.name}
                      </span>
                    </div>
                  ))}
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
