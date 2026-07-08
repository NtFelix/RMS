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

  const toggleRow = (moduleKey: string) => {
    if (disabled) return;
    const current = modulePermissions[moduleKey] || [];
    const policy = policyGrantedModulePermissions?.[moduleKey] || [];
    const checkedActions = AKTIONEN.filter(a => current.includes(a.key) || policy.includes(a.key));
    const allSelected = checkedActions.length === AKTIONEN.length;

    const nextPermissions = { ...modulePermissions };
    if (allSelected) {
      // Deselect all that are not policy locked
      nextPermissions[moduleKey] = current.filter(a => policy.includes(a));
    } else {
      // Select all
      nextPermissions[moduleKey] = AKTIONEN.map(a => a.key);
    }
    onChange(nextPermissions);
  };

  const toggleAllGrid = () => {
    if (disabled) return;
    const isAllChecked = MODULES.every(mod => {
      const current = modulePermissions[mod.key] || [];
      const policy = policyGrantedModulePermissions?.[mod.key] || [];
      return AKTIONEN.every(a => current.includes(a.key) || policy.includes(a.key));
    });
    const nextPermissions = { ...modulePermissions };
    MODULES.forEach(mod => {
      const policy = policyGrantedModulePermissions?.[mod.key] || [];
      if (isAllChecked) {
        nextPermissions[mod.key] = (nextPermissions[mod.key] || []).filter(a => policy.includes(a));
      } else {
        nextPermissions[mod.key] = AKTIONEN.map(a => a.key);
      }
    });
    onChange(nextPermissions);
  };

  const getGridState = () => {
    let totalCount = 0;
    let checkedCount = 0;
    MODULES.forEach(mod => {
      const current = modulePermissions[mod.key] || [];
      const policy = policyGrantedModulePermissions?.[mod.key] || [];
      AKTIONEN.forEach(a => {
        totalCount++;
        if (current.includes(a.key) || policy.includes(a.key)) checkedCount++;
      });
    });
    if (checkedCount === 0) return "unchecked";
    if (checkedCount === totalCount) return "checked";
    return "indeterminate";
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
                const isLastColumn = idx === AKTIONEN.length - 1;

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
            </tr>
          </thead>

          <tbody className="divide-none bg-transparent">
            {MODULES.map(mod => {
              const currentPerms  = modulePermissions[mod.key] || [];
              const policyPerms   = policyGrantedModulePermissions?.[mod.key] || [];
              const isRowEmpty    = currentPerms.length === 0 && policyPerms.length === 0;
              const checkedActions = AKTIONEN.filter(a => currentPerms.includes(a.key) || policyPerms.includes(a.key));
              const isRowChecked = checkedActions.length === AKTIONEN.length;
              const isRowIndeterminate = checkedActions.length > 0 && checkedActions.length < AKTIONEN.length;
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
                    const isGrantedByPolicy = policyPerms.includes(aktion.key);
                    const isChecked  = currentPerms.includes(aktion.key) || isGrantedByPolicy;
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
