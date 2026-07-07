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
  LucideIcon
} from "lucide-react";

interface ModuleConfig {
  key: "haeuser" | "wohnungen" | "mieter" | "zaehler" | "finanzen" | "betriebskosten" | "dokumente" | "aufgaben" | "vorlagen" | "organisation";
  label: string;
  icon: LucideIcon;
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
] as const;

const AKTIONEN = [
  { key: "ansehen",    label: "Ansehen"    },
  { key: "erstellen",  label: "Erstellen"  },
  { key: "bearbeiten", label: "Bearbeiten" },
  { key: "loeschen",   label: "Löschen"    },
  { key: "verwalten",  label: "Verwalten"  },
] as const;

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
    const policy = policyGrantedModulePermissions?.[moduleKey] || [];
    if (policy.includes(aktionKey)) return;
    const current = modulePermissions[moduleKey] || [];
    onChange({
      ...modulePermissions,
      [moduleKey]: current.includes(aktionKey)
        ? current.filter(a => a !== aktionKey)
        : [...current, aktionKey],
    });
  };

  const toggleColumn = (actionKey: string) => {
    if (disabled) return;
    const isAllChecked = MODULES.every(mod => {
      const current = modulePermissions[mod.key] || [];
      const policy = policyGrantedModulePermissions?.[mod.key] || [];
      return current.includes(actionKey) || policy.includes(actionKey);
    });
    const nextPermissions = { ...modulePermissions };
    MODULES.forEach(mod => {
      const policy = policyGrantedModulePermissions?.[mod.key] || [];
      if (policy.includes(actionKey)) return;
      const current = nextPermissions[mod.key] || [];
      nextPermissions[mod.key] = isAllChecked
        ? current.filter(a => a !== actionKey)
        : current.includes(actionKey) ? current : [...current, actionKey];
    });
    onChange(nextPermissions);
  };

  const getColumnState = (actionKey: string) => {
    let checkedCount = 0;
    MODULES.forEach(mod => {
      const current = modulePermissions[mod.key] || [];
      const policy = policyGrantedModulePermissions?.[mod.key] || [];
      if (current.includes(actionKey) || policy.includes(actionKey)) checkedCount++;
    });
    if (checkedCount === 0) return "unchecked";
    if (checkedCount === MODULES.length) return "checked";
    return "indeterminate";
  };

  const handleSelectRowAll = (moduleKey: string) => {
    if (disabled) return;
    onChange({ ...modulePermissions, [moduleKey]: AKTIONEN.map(a => a.key) });
  };

  const handleDeselectRowAll = (moduleKey: string) => {
    if (disabled) return;
    onChange({ ...modulePermissions, [moduleKey]: [] });
  };

  // Shared border styling classes
  const borderColor = "border-zinc-200 dark:border-zinc-800";

  return (
    <div className="flex flex-col gap-4">
      {/* 
        Native HTML table with custom borders. 
        Horizontal bottom border on header + vertical right borders on columns except the last one.
      */}
      <table className="w-full border-none border-collapse text-sm">
        <thead className="sticky top-24 z-10 bg-transparent">
          <tr className="border-none bg-transparent">
            {/* First header cell: bottom + right border */}
            <th className={cn(
              "w-[200px] font-semibold py-3.5 pl-6 text-left align-middle text-zinc-800 dark:text-zinc-200 bg-transparent border-b border-r",
              borderColor
            )}>
              Modul
            </th>

            {AKTIONEN.map((aktion, idx) => {
              const columnState = getColumnState(aktion.key);
              const isChecked = columnState === "checked";
              const isIndeterminate = columnState === "indeterminate";
              const isVerwalten = aktion.key === "verwalten";
              // It is the last column only if quick-select is disabled and this is the verwalten action
              const isLastColumn = disabled && idx === AKTIONEN.length - 1;

              return (
                <th
                  key={aktion.key}
                  className={cn(
                    "text-center align-middle font-medium py-3.5 bg-transparent border-b",
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

            {/* Last header cell (Schnellauswahl): bottom border only (no right border) */}
            {!disabled && (
              <th className={cn(
                "w-[120px] text-center align-middle font-semibold py-3.5 pr-6 bg-transparent border-b",
                borderColor
              )}>
                Schnellauswahl
              </th>
            )}
          </tr>
        </thead>

        <tbody className="divide-none bg-transparent">
          {MODULES.map(mod => {
            const currentPerms  = modulePermissions[mod.key] || [];
            const policyPerms   = policyGrantedModulePermissions?.[mod.key] || [];
            const isRowEmpty    = currentPerms.length === 0 && policyPerms.length === 0;
            const hasAllPerms   = AKTIONEN.every(a =>
              currentPerms.includes(a.key) || policyPerms.includes(a.key)
            );
            const ModIcon  = mod.icon;

            return (
              <tr key={mod.key} className="border-none bg-transparent">
                {/* First body cell: right border */}
                <td className={cn(
                  "py-3.5 pl-6 align-middle bg-transparent border-r",
                  borderColor
                )}>
                  <div className="flex items-center justify-between gap-2 min-h-[40px]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                        <ModIcon className="size-4" />
                      </div>
                      <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 truncate">
                        {mod.label}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0 mr-4">
                      {isRowEmpty && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200/50 dark:border-red-800/30 text-[9px] py-0 px-2 rounded-full font-medium tracking-wide">
                          Kein Zugriff
                        </Badge>
                      )}
                      {hasAllPerms && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30 text-[9px] py-0 px-2 rounded-full font-medium tracking-wide">
                          Vollzugriff
                        </Badge>
                      )}
                    </div>
                  </div>
                </td>

                {/* Action checkbox cells: right border (except last column) */}
                {AKTIONEN.map((aktion, idx) => {
                  const isGrantedByPolicy = policyPerms.includes(aktion.key);
                  const isChecked  = currentPerms.includes(aktion.key) || isGrantedByPolicy;
                  const isVerwalten = aktion.key === "verwalten";
                  // Last column check
                  const isLastColumn = disabled && idx === AKTIONEN.length - 1;

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
                          disabled={disabled || isGrantedByPolicy}
                          id={`perm-${mod.key}-${aktion.key}`}
                          aria-label={`${mod.label} ${aktion.label}`}
                          className={cn(
                            isVerwalten && "border-amber-400/60 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white"
                          )}
                        />
                      </div>
                    </td>
                  );
                })}

                {/* Quick-select cell: no right border */}
                {!disabled && (
                  <td className="text-center align-middle py-3.5 pr-6 bg-transparent">
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => hasAllPerms ? handleDeselectRowAll(mod.key) : handleSelectRowAll(mod.key)}
                        className={cn(
                          "rounded-full px-3 py-1 text-[10px] font-semibold transition-all border w-14 text-center cursor-pointer",
                          hasAllPerms
                            ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:border-zinc-700"
                            : "bg-primary/5 text-primary hover:bg-primary/10 border-primary/10"
                        )}
                      >
                        {hasAllPerms ? "Keine" : "Alle"}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
