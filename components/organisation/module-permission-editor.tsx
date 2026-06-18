"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MODULES = [
  { key: "haeuser", label: "Häuser" },
  { key: "wohnungen", label: "Wohnungen" },
  { key: "mieter", label: "Mieter" },
  { key: "zaehler", label: "Zähler" },
  { key: "finanzen", label: "Finanzen" },
  { key: "betriebskosten", label: "Betriebskosten" },
  { key: "dokumente", label: "Dokumente" },
  { key: "aufgaben", label: "Aufgaben" },
  { key: "vorlagen", label: "Vorlagen" },
  { key: "organisation", label: "Organisation" },
] as const;

const AKTIONEN = [
  { key: "ansehen", label: "Ansehen" },
  { key: "erstellen", label: "Erstellen" },
  { key: "bearbeiten", label: "Bearbeiten" },
  { key: "loeschen", label: "Löschen" },
  { key: "verwalten", label: "Verwalten" },
] as const;

interface ModulePermissionEditorProps {
  modulePermissions: Record<string, string[]>;
  onChange: (permissions: Record<string, string[]>) => void;
  disabled?: boolean;
}

export function ModulePermissionEditor({
  modulePermissions,
  onChange,
  disabled = false,
}: ModulePermissionEditorProps) {
  const togglePermission = (moduleKey: string, aktionKey: string) => {
    if (disabled) return;

    const currentModulePerms = modulePermissions[moduleKey] || [];
    let nextModulePerms: string[];

    if (currentModulePerms.includes(aktionKey)) {
      nextModulePerms = currentModulePerms.filter(a => a !== aktionKey);
    } else {
      nextModulePerms = [...currentModulePerms, aktionKey];
    }

    onChange({
      ...modulePermissions,
      [moduleKey]: nextModulePerms,
    });
  };

  const handleSelectRowAll = (moduleKey: string) => {
    if (disabled) return;
    onChange({
      ...modulePermissions,
      [moduleKey]: AKTIONEN.map(a => a.key),
    });
  };

  const handleDeselectRowAll = (moduleKey: string) => {
    if (disabled) return;
    onChange({
      ...modulePermissions,
      [moduleKey]: [],
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <Table>
          <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
            <TableRow>
              <TableHead className="w-[180px] font-semibold py-3 pl-6">Modul</TableHead>
              {AKTIONEN.map(aktion => (
                <TableHead key={aktion.key} className="text-center font-medium text-xs py-3">
                  {aktion.label}
                </TableHead>
              ))}
              {!disabled && <TableHead className="w-[140px] text-right py-3 pr-6">Aktionen</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MODULES.map(mod => {
              const currentPerms = modulePermissions[mod.key] || [];
              const isRowEmpty = currentPerms.length === 0;
              const isRowAllSelected = currentPerms.length === AKTIONEN.length;

              return (
                <TableRow key={mod.key} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/30">
                  <TableCell className="font-semibold text-sm py-3.5 pl-6 flex items-center gap-2">
                    <span>{mod.label}</span>
                    {isRowEmpty && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] py-0 px-1.5 rounded-full font-medium">
                        Kein Zugriff
                      </Badge>
                    )}
                  </TableCell>
                  {AKTIONEN.map(aktion => {
                    const isChecked = currentPerms.includes(aktion.key);
                    return (
                      <TableCell key={aktion.key} className="text-center py-3.5">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => togglePermission(mod.key, aktion.key)}
                            disabled={disabled}
                            id={`perm-${mod.key}-${aktion.key}`}
                            aria-label={`${mod.label} ${aktion.label}`}
                          />
                        </div>
                      </TableCell>
                    );
                  })}
                  {!disabled && (
                    <TableCell className="text-right py-3.5 pr-6">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            if (isRowAllSelected) {
                              handleDeselectRowAll(mod.key);
                            } else {
                              handleSelectRowAll(mod.key);
                            }
                          }}
                          className="h-7 text-xs rounded-lg px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          {isRowAllSelected ? "Zurücksetzen" : "Alle"}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
