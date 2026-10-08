import React from "react";
import { Badge } from "@/components/ui/badge";
import { ApiKeyItem, AVAILABLE_MODULES, AVAILABLE_ACTIONS } from "./types";

interface StatusBadgeProps {
  status: ApiKeyItem["status"];
  pausiertGrund?: string | null;
}

export function StatusBadge({ status, pausiertGrund }: StatusBadgeProps): React.ReactElement {
  switch (status) {
    case "aktiv":
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Aktiv</Badge>;
    case "ausstehend":
      return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Ausstehend</Badge>;
    case "pausiert":
      return (
        <Badge
          className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
          title={pausiertGrund === "ersteller_deaktiviert" ? "Ersteller deaktiviert — Prüfung nötig" : "Manuell deaktiviert"}
        >
          {pausiertGrund === "ersteller_deaktiviert" ? "Pausiert (Ersteller inaktiv)" : "Deaktiviert"}
        </Badge>
      );
    case "widerrufen":
      return <Badge variant="secondary">Widerrufen</Badge>;
    case "abgelehnt":
      return <Badge variant="destructive">Abgelehnt</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

interface PermissionsSummaryProps {
  berechtigungen: Record<string, unknown> | null;
}

export function PermissionsSummary({ berechtigungen }: PermissionsSummaryProps): React.ReactElement {
  if (!berechtigungen || !berechtigungen.module || typeof berechtigungen.module !== "object") {
    return <span className="text-muted-foreground">Keine Module zugewiesen</span>;
  }

  const moduleObj = berechtigungen.module as Record<string, unknown>;
  const badges: React.ReactElement[] = [];

  for (const [modName, acts] of Object.entries(moduleObj)) {
    let actList = "";
    if (Array.isArray(acts) && acts.length > 0) {
      actList = acts.join(", ");
    } else if (typeof acts === "object" && acts !== null) {
      const activeActs: string[] = [];
      for (const [actionKey, isEnabled] of Object.entries(acts as Record<string, unknown>)) {
        if (isEnabled) {
          const actionDef = AVAILABLE_ACTIONS.find((a) => a.id === actionKey);
          activeActs.push(actionDef ? actionDef.label : actionKey);
        }
      }
      if (activeActs.length > 0) {
        actList = activeActs.join(", ");
      }
    }

    if (actList) {
      const modDef = AVAILABLE_MODULES.find((m) => m.id === modName);
      const label = modDef ? modDef.label : modName;
      badges.push(
        <Badge key={modName} variant="secondary" className="text-[11px] font-normal py-0.5 px-2 bg-muted/60">
          {label}: {actList}
        </Badge>
      );
    }
  }

  // House scope badge
  if (Array.isArray(berechtigungen.haeuser) && berechtigungen.haeuser.length > 0) {
    badges.push(
      <Badge key="haeuser-scope" variant="outline" className="text-[11px] font-normal py-0.5 px-2 border-primary/40 text-primary bg-primary/5">
        Objekte: {berechtigungen.haeuser.length} {berechtigungen.haeuser.length === 1 ? "Haus" : "Häuser"}
      </Badge>
    );
  } else if (berechtigungen.haeuser === null || berechtigungen.haeuser === undefined) {
    badges.push(
      <Badge key="haeuser-scope" variant="outline" className="text-[11px] font-normal py-0.5 px-2 border-border/60 text-muted-foreground">
        Objekte: Alle
      </Badge>
    );
  }

  if (badges.length === 0) {
    return <span className="text-muted-foreground">Keine aktiven Rechte</span>;
  }

  return <div className="flex flex-wrap gap-1.5">{badges}</div>;
}
