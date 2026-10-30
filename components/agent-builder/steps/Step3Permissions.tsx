'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface AgentBerechtigungen {
  module?: Record<string, string[]>;
  objekte?: {
    haeuser?: string[] | null;
  };
}

interface Step3Props {
  berechtigungen: AgentBerechtigungen;
  onChange: (berechtigungen: AgentBerechtigungen) => void;
  haeuser?: Array<{ id: string; name: string }>;
}

const MODULES = [
  { id: 'haeuser', label: 'Häuser & Gebäude' },
  { id: 'wohnungen', label: 'Wohnungen & Einheiten' },
  { id: 'mieter', label: 'Mieter & Verträge' },
  { id: 'zaehler', label: 'Zähler & Ablesungen' },
  { id: 'finanzen', label: 'Finanzen & Buchungen' },
  { id: 'betriebskosten', label: 'Betriebskosten' },
  { id: 'dokumente', label: 'Dokumente & Dateifreigaben' },
  { id: 'aufgaben', label: 'Aufgaben & Workflows' },
  { id: 'vorlagen', label: 'Vorlagen' },
  { id: 'organisation', label: 'Organisation' },
];

const ACTIONS = [
  { id: 'ansehen', label: 'Lesen' },
  { id: 'erstellen', label: 'Erstellen' },
  { id: 'bearbeiten', label: 'Bearbeiten' },
  { id: 'loeschen', label: 'Löschen' },
];

export function Step3Permissions({ berechtigungen, onChange, haeuser = [] }: Step3Props) {
  const currentModules = berechtigungen?.module || {};
  const currentHaeuser = berechtigungen?.objekte?.haeuser;

  const toggleAction = (moduleId: string, actionId: string) => {
    const moduleActions = currentModules[moduleId] || [];
    const updatedActions = moduleActions.includes(actionId)
      ? moduleActions.filter((a) => a !== actionId)
      : [...moduleActions, actionId];

    const updatedModules = { ...currentModules };
    if (updatedActions.length > 0) {
      updatedModules[moduleId] = updatedActions;
    } else {
      delete updatedModules[moduleId];
    }

    onChange({
      ...berechtigungen,
      module: updatedModules,
    });
  };

  const toggleHouse = (houseId: string) => {
    let updatedHaeuser: string[] | null;
    if (currentHaeuser === null || currentHaeuser === undefined) {
      // Switch from all to specific house
      updatedHaeuser = [houseId];
    } else if (currentHaeuser.includes(houseId)) {
      const filtered = currentHaeuser.filter((h) => h !== houseId);
      updatedHaeuser = filtered.length > 0 ? filtered : null;
    } else {
      updatedHaeuser = [...currentHaeuser, houseId];
    }

    onChange({
      ...berechtigungen,
      objekte: {
        ...berechtigungen?.objekte,
        haeuser: updatedHaeuser,
      },
    });
  };

  const selectAllHouses = () => {
    onChange({
      ...berechtigungen,
      objekte: {
        ...berechtigungen?.objekte,
        haeuser: null,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Berechtigungen & Objekt-Zugriff</h3>
        <p className="text-sm text-muted-foreground">
          Lege fest, auf welche Module und Datenobjekte der Agent zugreifen darf.
        </p>
      </div>

      <div className="space-y-6">
        {/* Module Permissions */}
        <div className="border rounded-lg p-4 space-y-4 bg-card">
          <h4 className="font-medium text-sm text-foreground">Modul-Berechtigungen</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODULES.map((mod) => {
              const activeActions = currentModules[mod.id] || [];
              return (
                <div key={mod.id} className="p-3 border rounded-md bg-background space-y-2">
                  <div className="font-medium text-sm text-foreground">{mod.label}</div>
                  <div className="flex flex-wrap gap-3">
                    {ACTIONS.map((act) => {
                      const isChecked = activeActions.includes(act.id);
                      return (
                        <label key={act.id} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleAction(mod.id, act.id)}
                          />
                          <span>{act.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* House Scope */}
        <div className="border rounded-lg p-4 space-y-4 bg-card">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-foreground">Häuser-Scope (Objektbegrenzung)</h4>
            <button
              type="button"
              onClick={selectAllHouses}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                currentHaeuser === null || currentHaeuser === undefined
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-background hover:bg-muted'
              }`}
            >
              Alle Häuser (uneingeschränkt)
            </button>
          </div>

          {haeuser.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Keine einzelnen Häuser geladen oder vorhanden.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {haeuser.map((house) => {
                const isSelected =
                  currentHaeuser === null || currentHaeuser === undefined || currentHaeuser.includes(house.id);
                return (
                  <label
                    key={house.id}
                    className={`flex items-center gap-2 p-2.5 border rounded-md text-sm cursor-pointer transition-colors ${
                      isSelected ? 'bg-accent/40 border-primary/40' : 'bg-background hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleHouse(house.id)}
                    />
                    <span className="truncate">{house.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
