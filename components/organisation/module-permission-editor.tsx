"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Building2,
  KeyRound,
  Users2,
  Gauge,
  Coins,
  Calculator,
  FileText,
  CheckSquare,
  LayoutTemplate,
  Settings,
  Landmark,
  LucideIcon
} from "lucide-react";

interface ModuleConfig {
  key: "haeuser" | "wohnungen" | "mieter" | "zaehler" | "finanzen" | "betriebskosten" | "dokumente" | "aufgaben" | "vorlagen" | "organisation" | "kautionen";
  label: string;
  icon: LucideIcon;
  /**
   * Aktionen, die für dieses Modul ohne Wirkung sind und daher weder gesetzt noch angezeigt
   * werden (Spalte deaktiviert, "Alle auswählen" setzt sie nicht).
   */
  nichtVerfuegbar?: readonly string[];
}

const MODULES: readonly ModuleConfig[] = [
  { key: "haeuser",        label: "Häuser",        icon: Building2      },
  { key: "wohnungen",      label: "Wohnungen",      icon: KeyRound       },
  { key: "mieter",         label: "Mieter",         icon: Users2         },
  { key: "zaehler",        label: "Zähler",         icon: Gauge          },
  { key: "finanzen",       label: "Finanzen",       icon: Coins          },
  { key: "betriebskosten", label: "Betriebskosten", icon: Calculator     },
  { key: "dokumente",      label: "Dokumente",      icon: FileText       },
  { key: "aufgaben",       label: "Aufgaben",       icon: CheckSquare    },
  { key: "vorlagen",       label: "Vorlagen",       icon: LayoutTemplate },
  { key: "organisation",   label: "Organisation",   icon: Settings       },
  // "verwalten" hat im Kautionsmanagement keine Wirkung (alle Aktionen laufen über ansehen/erstellen/bearbeiten/loeschen).
  { key: "kautionen",      label: "Kautionen",      icon: Landmark, nichtVerfuegbar: ["verwalten"] },
] as const;

const AKTIONEN = [
  { key: "ansehen",    label: "Ansehen"    },
  { key: "erstellen",  label: "Erstellen"  },
  { key: "bearbeiten", label: "Bearbeiten" },
  { key: "loeschen",   label: "Löschen"    },
  { key: "verwalten",  label: "Verwalten"  },
] as const;

/** Ob eine Aktion für das Modul wirksam ist (siehe `ModuleConfig.nichtVerfuegbar`). */
function istAktionVerfuegbar(moduleKey: string, aktionKey: string): boolean {
  const mod = MODULES.find(m => m.key === moduleKey);
  return !mod?.nichtVerfuegbar?.includes(aktionKey);
}

/**
 * Modul "kautionen": Die Schreib-RPCs der Datenbank verlangen zusätzlich zum Schreibrecht das Leserecht "ansehen"
 * (ein Schreibrecht impliziert es dort nicht, ohne "ansehen" folgt 42501). Der Editor lässt diesen Zustand deshalb
 * nicht entstehen:
 * - Ein Schreibrecht zu setzen, setzt "ansehen" mit. Das gilt auch dann, wenn eine Richtlinie "ansehen" gewährt:
 *   Ein Override für das Modul ersetzt die Richtlinienrechte, "ansehen" muss also im Override selbst stehen.
 * - "ansehen" zu entziehen, entzieht auch die Schreibrechte. Von einer Richtlinie gewährte Schreibrechte lassen
 *   sich hier nicht entziehen; solange es sie gibt, bleibt "ansehen" gesetzt (die Checkbox ist dann gesperrt).
 */
const KAUTION_SCHREIBRECHTE: readonly string[] = ["erstellen", "bearbeiten", "loeschen"];

function istKautionSchreibrecht(moduleKey: string, aktionKey: string): boolean {
  return moduleKey === "kautionen" && KAUTION_SCHREIBRECHTE.includes(aktionKey);
}

/** Ob "ansehen" im Modul entzogen werden darf (nicht, solange eine Richtlinie ein Schreibrecht von Kautionen gewährt). */
function darfLeserechtEntziehen(moduleKey: string, policy: string[]): boolean {
  return moduleKey !== "kautionen" || !policy.some(a => KAUTION_SCHREIBRECHTE.includes(a));
}

/** Setzt die Aktion; ein Schreibrecht in "kautionen" setzt "ansehen" mit (an erster Stelle, wie in `AKTIONEN`). */
function aktionSetzen(moduleKey: string, current: string[], aktionKey: string): string[] {
  const next = current.includes(aktionKey) ? current : [...current, aktionKey];
  if (istKautionSchreibrecht(moduleKey, aktionKey) && !next.includes("ansehen")) return ["ansehen", ...next];
  return next;
}

/** Entfernt die Aktion; "ansehen" in "kautionen" nimmt die manuell gesetzten Schreibrechte mit (oder bleibt, siehe oben). */
function aktionEntfernen(moduleKey: string, current: string[], aktionKey: string, policy: string[]): string[] {
  if (moduleKey === "kautionen" && aktionKey === "ansehen") {
    if (!darfLeserechtEntziehen(moduleKey, policy)) return current;
    return current.filter(a => a !== "ansehen" && !KAUTION_SCHREIBRECHTE.includes(a));
  }
  return current.filter(a => a !== aktionKey);
}

/** Rest nach "alles abwählen" (Zeile, Raster): die Richtlinienrechte; "ansehen" bleibt, solange es sie für Schreibrechte braucht. */
function nachAbwahlAllerRechte(moduleKey: string, current: string[], policy: string[]): string[] {
  const leserechtBleibt = !darfLeserechtEntziehen(moduleKey, policy);
  return current.filter(a => policy.includes(a) || (leserechtBleibt && a === "ansehen"));
}

interface ModulePermissionEditorProps {
  modulePermissions: Record<string, string[]>;
  onChange: (permissions: Record<string, string[]>) => void;
  disabled?: boolean;
  policyGrantedModulePermissions?: Record<string, string[]>;
}

export function ModulePermissionEditor({
  modulePermissions,
  onChange,
  disabled = false,
  policyGrantedModulePermissions,
}: ModulePermissionEditorProps) {

  const togglePermission = (moduleKey: string, aktionKey: string) => {
    if (disabled) return;
    if (!istAktionVerfuegbar(moduleKey, aktionKey)) return;
    const policy = policyGrantedModulePermissions?.[moduleKey] || [];
    if (policy.includes(aktionKey)) return;
    const current = modulePermissions[moduleKey] || [];
    onChange({
      ...modulePermissions,
      [moduleKey]: current.includes(aktionKey)
        ? aktionEntfernen(moduleKey, current, aktionKey, policy)
        : aktionSetzen(moduleKey, current, aktionKey),
    });
  };

  const toggleColumn = (actionKey: string) => {
    if (disabled) return;
    // Module, für die die Aktion ohne Wirkung ist (z. B. "verwalten" bei Kautionen), bleiben unberührt.
    const applicableModules = MODULES.filter(mod => istAktionVerfuegbar(mod.key, actionKey));
    const isAllChecked = applicableModules.every(mod => {
      const current = modulePermissions[mod.key] || [];
      const policy = policyGrantedModulePermissions?.[mod.key] || [];
      return current.includes(actionKey) || policy.includes(actionKey);
    });
    const nextPermissions = { ...modulePermissions };
    applicableModules.forEach(mod => {
      const policy = policyGrantedModulePermissions?.[mod.key] || [];
      if (policy.includes(actionKey)) return;
      const current = nextPermissions[mod.key] || [];
      nextPermissions[mod.key] = isAllChecked
        ? aktionEntfernen(mod.key, current, actionKey, policy)
        : aktionSetzen(mod.key, current, actionKey);
    });
    onChange(nextPermissions);
  };

  const getColumnState = (actionKey: string) => {
    const applicableModules = MODULES.filter(mod => istAktionVerfuegbar(mod.key, actionKey));
    let checkedCount = 0;
    applicableModules.forEach(mod => {
      const current = modulePermissions[mod.key] || [];
      const policy = policyGrantedModulePermissions?.[mod.key] || [];
      if (current.includes(actionKey) || policy.includes(actionKey)) checkedCount++;
    });
    if (checkedCount === 0) return "unchecked";
    if (checkedCount === applicableModules.length) return "checked";
    return "indeterminate";
  };

  const toggleRow = (moduleKey: string) => {
    if (disabled) return;
    const current = modulePermissions[moduleKey] || [];
    const policy = policyGrantedModulePermissions?.[moduleKey] || [];
    const availableActions = AKTIONEN.filter(a => istAktionVerfuegbar(moduleKey, a.key));
    const checkedActions = availableActions.filter(a => current.includes(a.key) || policy.includes(a.key));
    const allSelected = checkedActions.length === availableActions.length;

    const nextPermissions = { ...modulePermissions };
    if (allSelected) {
      // Deselect all that are not policy locked
      nextPermissions[moduleKey] = nachAbwahlAllerRechte(moduleKey, current, policy);
    } else {
      // Select all (nur wirksame Aktionen des Moduls)
      nextPermissions[moduleKey] = availableActions.map(a => a.key);
    }
    onChange(nextPermissions);
  };

  const toggleAllGrid = () => {
    if (disabled) return;
    const isAllChecked = MODULES.every(mod => {
      const current = modulePermissions[mod.key] || [];
      const policy = policyGrantedModulePermissions?.[mod.key] || [];
      return AKTIONEN.filter(a => istAktionVerfuegbar(mod.key, a.key))
        .every(a => current.includes(a.key) || policy.includes(a.key));
    });
    const nextPermissions = { ...modulePermissions };
    MODULES.forEach(mod => {
      const policy = policyGrantedModulePermissions?.[mod.key] || [];
      if (isAllChecked) {
        nextPermissions[mod.key] = nachAbwahlAllerRechte(mod.key, nextPermissions[mod.key] || [], policy);
      } else {
        nextPermissions[mod.key] = AKTIONEN.filter(a => istAktionVerfuegbar(mod.key, a.key)).map(a => a.key);
      }
    });
    onChange(nextPermissions);
  };

  // Shared border styling classes
  const borderColor = "border-zinc-200 dark:border-zinc-800";

  return (
    <div className="flex flex-col gap-4">
      {/* 
        Native HTML table with custom borders. 
        Wrapped in a relative container so row-select checkboxes can float outside.
      */}
      <div className="relative">
        <table className="w-full border-none border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-none bg-transparent">
              {/* First header cell: bottom + right border */}
              <th className={cn(
                "w-[200px] font-semibold py-3.5 pl-6 text-left align-middle text-zinc-800 dark:text-zinc-200 border-b border-r sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md",
                borderColor
              )}>
                Modul
              </th>

              {AKTIONEN.map((aktion, idx) => {
                const columnState = getColumnState(aktion.key);
                const isChecked = columnState === "checked";
                const isIndeterminate = columnState === "indeterminate";
                const isVerwalten = aktion.key === "verwalten";
                const isLastColumn = idx === AKTIONEN.length - 1;

                return (
                  <th
                    key={aktion.key}
                    className={cn(
                      "text-center align-middle font-medium py-3.5 border-b sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md",
                      !isLastColumn && "border-r",
                      borderColor
                    )}
                  >
                    <div className="flex flex-col items-center gap-1.5 justify-center">
                      <span className={cn(
                        "font-semibold text-zinc-700 dark:text-zinc-300",
                        isVerwalten && "text-amber-600 dark:text-amber-400"
                      )}>
                        {aktion.label}
                      </span>
                      <Checkbox
                        checked={isIndeterminate ? "indeterminate" : isChecked}
                        onCheckedChange={() => toggleColumn(aktion.key)}
                        disabled={disabled}
                        aria-label={`${aktion.label} für alle Module`}
                        className={cn(
                          "scale-90",
                          isVerwalten && "border-amber-400/60 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white"
                        )}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-none bg-transparent">
            {MODULES.map(mod => {
              const currentPerms  = modulePermissions[mod.key] || [];
              const policyPerms   = policyGrantedModulePermissions?.[mod.key] || [];
              const isRowEmpty    = currentPerms.length === 0 && policyPerms.length === 0;
              const availableActions = AKTIONEN.filter(a => istAktionVerfuegbar(mod.key, a.key));
              const checkedActions = availableActions.filter(a => currentPerms.includes(a.key) || policyPerms.includes(a.key));
              const isRowChecked = checkedActions.length === availableActions.length;
              const isRowIndeterminate = checkedActions.length > 0 && checkedActions.length < availableActions.length;
              const ModIcon  = mod.icon;

              return (
                <tr key={mod.key} className="group/row border-none bg-transparent relative">
                  {/* First body cell: right border */}
                  <td className={cn(
                    "py-3.5 pl-6 align-middle bg-transparent border-r relative",
                    borderColor
                  )}>
                    {/* Floating row-select checkbox – hidden, revealed on hover, positioned outside the cell without hover gaps */}
                    {!disabled && (
                      <div className="absolute right-full top-0 bottom-0 w-12 flex items-center justify-end pr-3 opacity-0 group-hover/row:opacity-100 transition-opacity duration-150 ease-out z-20">
                        <Checkbox
                          checked={isRowIndeterminate ? "indeterminate" : isRowChecked}
                          onCheckedChange={() => toggleRow(mod.key)}
                          disabled={disabled}
                          aria-label={`Alle Berechtigungen für Modul ${mod.label}`}
                          className="scale-90"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2.5 min-h-[40px]">
                      <div className={cn(
                        "p-1.5 rounded-lg shrink-0 transition-colors",
                        isRowEmpty
                          ? "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      )}>
                        <ModIcon className="size-4" />
                      </div>
                      <span className={cn(
                        "font-semibold text-sm truncate transition-all",
                        isRowEmpty
                          ? "line-through text-red-500/70 dark:text-red-400/60 decoration-red-500/50"
                          : "text-zinc-800 dark:text-zinc-200"
                      )}>
                        {mod.label}
                      </span>
                    </div>
                  </td>

                  {/* Action checkbox cells: right border (except last column) */}
                  {AKTIONEN.map((aktion, idx) => {
                    const isUnavailable = !istAktionVerfuegbar(mod.key, aktion.key);
                    const isGrantedByPolicy = !isUnavailable && policyPerms.includes(aktion.key);
                    const isChecked  = !isUnavailable && (currentPerms.includes(aktion.key) || isGrantedByPolicy);
                    // Kautionen: "ansehen" bleibt gesetzt, solange eine Richtlinie ein Schreibrecht gewährt (siehe oben).
                    const isLeserechtGesperrt = aktion.key === "ansehen" && isChecked && !isGrantedByPolicy
                      && !darfLeserechtEntziehen(mod.key, policyPerms);
                    const isVerwalten = aktion.key === "verwalten";
                    const isLastColumn = idx === AKTIONEN.length - 1;

                    return (
                      <td
                        key={aktion.key}
                        className={cn(
                          "text-center align-middle py-3.5 bg-transparent",
                          !isLastColumn && "border-r",
                          borderColor
                        )}
                      >
                        <div className="flex justify-center items-center">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => togglePermission(mod.key, aktion.key)}
                            disabled={disabled || isGrantedByPolicy || isUnavailable || isLeserechtGesperrt}
                            id={`perm-${mod.key}-${aktion.key}`}
                            aria-label={isUnavailable
                              ? `${mod.label} ${aktion.label} (für dieses Modul nicht verfügbar)`
                              : isLeserechtGesperrt
                                ? `${mod.label} ${aktion.label} (wird für ein durch eine Richtlinie gewährtes Schreibrecht benötigt)`
                                : `${mod.label} ${aktion.label}`}
                            title={isUnavailable
                              ? "Für dieses Modul nicht verfügbar"
                              : isLeserechtGesperrt ? "Wird für ein durch eine Richtlinie gewährtes Schreibrecht benötigt" : undefined}
                            className={cn(
                              isVerwalten && "border-amber-400/60 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white",
                              isUnavailable && "opacity-30"
                            )}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
