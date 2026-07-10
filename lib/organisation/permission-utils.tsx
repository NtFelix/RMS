import React from "react";
import { Home, Building, Users, Gauge, CreditCard, Calculator, FileText, CheckSquare, Layout, Shield, Eye, Plus, Pencil, Trash2, Settings, FileSpreadsheet, Database, Key, type LucideIcon } from "lucide-react";

export const MODULE_CONFIG: Record<string, { label: string; icon: LucideIcon }> = {
  haeuser:        { label: "Häuser",        icon: Home },
  wohnungen:      { label: "Wohnungen",      icon: Building },
  mieter:         { label: "Mieter",         icon: Users },
  zaehler:        { label: "Zähler",         icon: Gauge },
  finanzen:       { label: "Finanzen",       icon: CreditCard },
  betriebskosten: { label: "Betriebskosten", icon: Calculator },
  dokumente:      { label: "Dokumente",      icon: FileText },
  aufgaben:       { label: "Aufgaben",       icon: CheckSquare },
  vorlagen:       { label: "Vorlagen",       icon: Layout },
  organisation:   { label: "Organisation",   icon: Shield },
};

export const ACTION_CONFIG: Record<string, { label: string; icon: LucideIcon }> = {
  ansehen:    { label: "Ansehen",    icon: Eye },
  erstellen:  { label: "Erstellen",  icon: Plus },
  bearbeiten: { label: "Bearbeiten", icon: Pencil },
  loeschen:   { label: "Löschen",    icon: Trash2 },
  verwalten:  { label: "Verwalten",  icon: Settings },
};

export function getModuleIcon(modKey: string, className?: string): React.ReactNode {
  const cfg = MODULE_CONFIG[modKey];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return <Icon className={className ?? "inline-block size-3.5 mx-1 align-text-bottom text-zinc-500 dark:text-zinc-400"} />;
}

export function getPermissionIcon(action: string, className?: string): React.ReactNode {
  const cfg = ACTION_CONFIG[action];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return <Icon className={className ?? "inline-block size-3 mx-0.5 align-text-bottom text-zinc-400 dark:text-zinc-500"} />;
}

export function getModuleLabel(modKey: string): string {
  return MODULE_CONFIG[modKey]?.label ?? modKey;
}

export function getActionLabel(actionKey: string): string {
  return ACTION_CONFIG[actionKey]?.label ?? actionKey;
}

export function getTableIcon(tableName: string): LucideIcon {
  switch (tableName) {
    case 'Haeuser':
      return Home;
    case 'Wohnungen':
      return Building;
    case 'Mieter':
      return Users;
    case 'Finanzen':
      return CreditCard;
    case 'Dokumente_Metadaten':
      return FileText;
    case 'Aufgaben':
      return CheckSquare;
    case 'Nebenkosten':
      return Calculator;
    case 'Zaehler':
    case 'Zaehler_Ablesungen':
      return Gauge;
    case 'Rechnungen':
      return FileSpreadsheet;
    case 'Vorlagen':
      return Layout;
    case 'Organisation':
      return Shield;
    case 'Organisation_Mitglieder':
    case 'Organisation_Einladungen':
      return Users;
    case 'Organisation_Policies':
    case 'Organisation_Mitglieder_Policies':
    case 'Organisation_Mitglieder_Overrides':
      return Key;
    default:
      return Database;
  }
}

export const DASHBOARD_OFFSET = 180;

export interface ChangeSummary {
  description: React.ReactNode;
  type: "add" | "remove" | "modify";
}
