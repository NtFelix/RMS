"use client";

import React, { useState, useEffect, useTransition } from "react";
import { MemberPermissions, HausWithWohnungen } from "@/lib/organisation-types";
import { getMitgliedPermissionsAction, getOrgHaeuserAction, setMitgliedOverridesAction } from "@/lib/perms-actions";
import { ObjectScopeEditor } from "./object-scope-editor";
import { ModulePermissionEditor } from "./module-permission-editor";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Lock, CheckCircle, RefreshCw, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  mitgliedId: string;
  rolle: "owner" | "admin" | "mitarbeiter";
  status: "eingeladen" | "aktiv" | "deaktiviert";
  memberName: string;
}

export function MitgliedPermissionDetail({ mitgliedId, rolle, status, memberName }: Props) {
  const [permissions, setPermissions] = useState<MemberPermissions | null>(null);
  const [originalPermissions, setOriginalPermissions] = useState<MemberPermissions | null>(null);
  const [haeuser, setHaeuser] = useState<HausWithWohnungen[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, startSavingTransition] = useTransition();

  const isLocked = rolle === "owner" || rolle === "admin";

  const fetchPermissions = async () => {
    if (isLocked) return;
    setLoading(true);
    try {
      const [perms, houses] = await Promise.all([
        getMitgliedPermissionsAction(mitgliedId),
        getOrgHaeuserAction(),
      ]);
      setPermissions(perms);
      // Deep clone to keep track of dirty states
      setOriginalPermissions(JSON.parse(JSON.stringify(perms)));
      setHaeuser(houses);
    } catch (error) {
      console.error("Failed to load permissions:", error);
      toast({
        title: "Fehler beim Laden",
        description: "Die Berechtigungen konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [mitgliedId, rolle]);

  // Compute stats for overview pane
  const statsSummary = React.useMemo(() => {
    if (!permissions) return null;
    const isUnrestricted = permissions.objekte?.haeuser === null;
    
    // Count houses
    const housesCount = isUnrestricted
      ? haeuser.length
      : permissions.objekte?.haeuser?.length || 0;

    // Count apartments (derived from selected houses — no per-wohnung scope)
    const apartmentsCount = isUnrestricted
      ? haeuser.reduce((sum, h) => sum + h.wohnungen.length, 0)
      : haeuser
          .filter(h => permissions.objekte?.haeuser?.includes(h.id))
          .reduce((sum, h) => sum + h.wohnungen.length, 0);

    // Count modules that have at least one permission
    const activeModules = Object.values(permissions.module || {}).filter(arr => arr.length > 0).length;

    return {
      isUnrestricted,
      housesCount,
      apartmentsCount,
      activeModules,
    };
  }, [permissions, haeuser]);

  // Check if dirty
  const isDirty = React.useMemo(() => {
    if (!permissions || !originalPermissions) return false;
    return JSON.stringify(permissions) !== JSON.stringify(originalPermissions);
  }, [permissions, originalPermissions]);

  const handleSave = () => {
    if (!permissions || !isDirty) return;

    startSavingTransition(async () => {
      const payload = {
        module: permissions.module || {},
        objekte: { haeuser: permissions.objekte?.haeuser ?? null },
      };

      const res = await setMitgliedOverridesAction(mitgliedId, payload);
      if (res.success) {
        toast({
          title: "Berechtigungen gespeichert",
          description: `Die Berechtigungen für ${memberName} wurden erfolgreich aktualisiert.`,
          variant: "success",
        });
        setOriginalPermissions(JSON.parse(JSON.stringify(permissions)));
      } else {
        toast({
          title: "Fehler beim Speichern",
          description: res.error || "Es gab ein Problem beim Speichern.",
          variant: "destructive",
        });
      }
    });
  };

  const handleReset = () => {
    if (originalPermissions) {
      setPermissions(JSON.parse(JSON.stringify(originalPermissions)));
    }
  };

  const handleObjectScopeChange = (hausIds: string[] | null) => {
    if (!permissions) return;
    setPermissions({
      ...permissions,
      objekte: {
        haeuser: hausIds,
      },
    });
  };

  const handleModulePermissionsChange = (modulePerms: Record<string, string[]>) => {
    if (!permissions) return;
    setPermissions({
      ...permissions,
      module: modulePerms,
    });
  };

  if (isLocked) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Lock className="size-5 text-indigo-500" />
              Rollenbasierte Berechtigungen
            </CardTitle>
            <CardDescription>
              Für diese Rolle sind Berechtigungen fest definiert.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <Alert className="rounded-2xl bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400 [&>svg]:text-indigo-500">
              <ShieldAlert className="size-4" />
              <AlertTitle className="font-semibold">{rolle === "owner" ? "Eigentümer" : "Administrator"}</AlertTitle>
              <AlertDescription className="text-xs mt-1">
                {rolle === "owner" ? "Der Eigentümer" : "Administratoren"} der Organisation {rolle === "owner" ? "hat" : "haben"} vollumfänglichen Zugriff auf alle Objekte, Module und Einstellungen und {rolle === "owner" ? "kann" : "können"} nicht eingeschränkt werden.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] min-h-[300px] gap-3">
        <RefreshCw className="size-6 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Berechtigungen werden geladen...</span>
      </div>
    );
  }

  if (!permissions) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] min-h-[300px]">
        <span className="text-sm text-muted-foreground">Wählen Sie ein Mitglied aus der Liste aus, um Berechtigungen anzuzeigen.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Save / Discard bar if dirty */}
      {isDirty && (
        <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-250">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Ungespeicherte Änderungen an den Berechtigungen von {memberName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="ghost"
              onClick={handleReset}
              disabled={saving}
              className="text-xs h-8 rounded-lg"
            >
              Verwerfen
            </Button>
            <Button
              size="xs"
              onClick={handleSave}
              disabled={saving}
              className="text-xs h-8 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <RefreshCw className="size-3 animate-spin" />
                  <span>Speichert...</span>
                </>
              ) : (
                <>
                  <Save className="size-3" />
                  <span>Speichern</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Permissions Stats Summary Bar */}
      {statsSummary && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Objekt-Scope</span>
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {statsSummary.isUnrestricted
                ? "Unbeschränkt"
                : `${statsSummary.housesCount} Haus / ${statsSummary.apartmentsCount} Wohn.`}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 border-x border-zinc-200/80 dark:border-zinc-800/80 px-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Module</span>
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {statsSummary.activeModules} von 10 aktiv
            </span>
          </div>
          <div className="flex flex-col gap-0.5 pl-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</span>
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
              <CheckCircle className="size-3.5 text-emerald-500" />
              Konfiguriert
            </span>
          </div>
        </div>
      )}

      {/* Accordion or Tabs for editors */}
      <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Objekt-Scope (Zugriffsbeschränkung)</CardTitle>
          <CardDescription className="text-xs">
            Legen Sie fest, auf welche Häuser und Wohnungen dieser Mitarbeiter Zugriff erhalten soll.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ObjectScopeEditor
            haeuser={haeuser}
            selectedHausIds={permissions.objekte?.haeuser}
            onChange={handleObjectScopeChange}
            disabled={saving}
          />
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Modul- und Aktionsberechtigungen</CardTitle>
          <CardDescription className="text-xs">
            Legen Sie fest, welche Aktionen in den jeweiligen Modulen ausgeführt werden dürfen.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:px-6 sm:pb-6">
          <ModulePermissionEditor
            modulePermissions={permissions.module || {}}
            onChange={handleModulePermissionsChange}
            disabled={saving}
          />
        </CardContent>
      </Card>
    </div>
  );
}
