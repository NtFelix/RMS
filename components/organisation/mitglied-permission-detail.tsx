"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { MemberPermissions, HausWithWohnungen, OrganisationPolicy } from "@/lib/organisation-types";
import { getMitgliedPermissionsAction, getOrgHaeuserAction, setMitgliedOverridesAction } from "@/lib/perms-actions";
import { getPoliciesAction, updateMitgliedPoliciesAction } from "@/lib/organisation/policy-actions";
import { ObjectScopeEditor } from "./object-scope-editor";
import { ModulePermissionEditor } from "./module-permission-editor";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldAlert, Lock, CheckCircle, RefreshCw, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const [policies, setPolicies] = useState<OrganisationPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, startSavingTransition] = useTransition();

  const isLocked = rolle === "owner" || rolle === "admin";

  useEffect(() => {
    const fetchPermissionsAndPolicies = async () => {
      if (isLocked) return;
      setLoading(true);
      try {
        const [perms, houses, orgPolicies] = await Promise.all([
          getMitgliedPermissionsAction(mitgliedId),
          getOrgHaeuserAction(),
          getPoliciesAction(),
        ]);
        setPermissions(perms);
        setOriginalPermissions(structuredClone(perms));
        setHaeuser(houses);
        setPolicies(orgPolicies);
      } catch (error) {
        console.error("Failed to load permissions and policies:", error);
        toast({
          title: "Fehler beim Laden",
          description: "Die Berechtigungen und Richtlinien konnten nicht geladen werden.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPermissionsAndPolicies();
  }, [mitgliedId, isLocked]);

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

  const policyGrantedHausIds = useMemo(() => {
    if (!policies || !permissions?.policy_ids) return [];

    const activePolicies = policies.filter(p => permissions.policy_ids.includes(p.id));

    const hasUnrestrictedPolicy = activePolicies.some(p => {
      const houses = p.berechtigungen.objekte?.haeuser;
      return !houses || houses.length === 0;
    });

    if (hasUnrestrictedPolicy) {
      return null;
    }

    const ids = new Set<string>();
    activePolicies.forEach(p => {
      const houses = p.berechtigungen.objekte?.haeuser;
      if (Array.isArray(houses)) {
        houses.forEach(id => ids.add(id));
      }
    });

    return Array.from(ids);
  }, [policies, permissions?.policy_ids]);

  const policyGrantedModulePermissions = useMemo(() => {
    if (!policies || !permissions?.policy_ids) return {};

    const activePolicies = policies.filter(p => permissions.policy_ids.includes(p.id));
    const merged: Record<string, string[]> = {};

    activePolicies.forEach(p => {
      const modules = p.berechtigungen.module;
      if (modules) {
        Object.entries(modules).forEach(([modKey, actions]) => {
          if (Array.isArray(actions)) {
            if (!merged[modKey]) {
              merged[modKey] = [];
            }
            actions.forEach(action => {
              if (!merged[modKey].includes(action)) {
                merged[modKey].push(action);
              }
            });
          }
        });
      }
    });

    return merged;
  }, [policies, permissions?.policy_ids]);

  // Check if dirty
  const isDirty = useMemo(() => {
    if (!permissions || !originalPermissions) return false;
    return JSON.stringify(permissions) !== JSON.stringify(originalPermissions);
  }, [permissions, originalPermissions]);

  const handleSave = () => {
    if (!permissions || !originalPermissions || !isDirty) return;

    startSavingTransition(async () => {
      try {
        const hasOverridesChanges = JSON.stringify(permissions.module) !== JSON.stringify(originalPermissions.module)
          || JSON.stringify(permissions.objekte) !== JSON.stringify(originalPermissions.objekte);
        if (hasOverridesChanges) {
          const payload = {
            module: permissions.module || {},
            objekte: { haeuser: permissions.objekte?.haeuser ?? null },
          };

          const res = await setMitgliedOverridesAction(mitgliedId, payload);
          if (!res.success) {
            throw new Error(res.error || "Problem beim Speichern der Overrides.");
          }
        }

        const toAssign = permissions.policy_ids.filter(id => !originalPermissions.policy_ids.includes(id));
        const toRemove = originalPermissions.policy_ids.filter(id => !permissions.policy_ids.includes(id));

        if (toAssign.length > 0 || toRemove.length > 0) {
          await updateMitgliedPoliciesAction(mitgliedId, toAssign, toRemove);
        }

        toast({
          title: "Speichern erfolgreich",
          description: `Die Berechtigungen und Richtlinien für ${memberName} wurden erfolgreich aktualisiert.`,
          variant: "success",
        });

        setOriginalPermissions(structuredClone(permissions));
      } catch (error: any) {
        console.error("Failed to save changes:", error);
        toast({
          title: "Fehler beim Speichern",
          description: error.message || "Es gab ein Problem beim Speichern.",
          variant: "destructive",
        });
      }
    });
  };

  const handleReset = () => {
    if (originalPermissions) {
      setPermissions(structuredClone(originalPermissions));
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
        <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
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

      {/* Zugeordnete Richtlinien */}
      <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Zugeordnete Richtlinien</CardTitle>
          <CardDescription className="text-xs">
            Weisen Sie diesem Mitarbeiter Richtlinien zu. Die Berechtigungen der Richtlinien werden addiert.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {policies.length === 0 ? (
            <p className="text-xs text-muted-foreground">Keine Richtlinien in der Organisation vorhanden.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {policies.map(policy => {
                const isChecked = permissions.policy_ids?.includes(policy.id);
                return (
                  <div
                    key={policy.id}
                    className={cn(
                      "p-3 border rounded-2xl flex items-center gap-3 transition-all",
                      isChecked
                        ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900"
                        : "bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                    )}
                  >
                    <Checkbox
                      id={`policy-assign-${policy.id}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        setPermissions({
                          ...permissions,
                          policy_ids: checked
                            ? [...permissions.policy_ids, policy.id]
                            : permissions.policy_ids.filter(id => id !== policy.id),
                        });
                      }}
                      disabled={saving}
                    />
                    <label
                      htmlFor={`policy-assign-${policy.id}`}
                      className="text-sm font-semibold select-none flex-1 cursor-pointer text-zinc-800 dark:text-zinc-200"
                    >
                      {policy.name}
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accordion or Tabs for editors */}
      <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Objekt-Scope (Zugriffsbeschränkung Overrides)</CardTitle>
          <CardDescription className="text-xs">
            Legen Sie fest, auf welche Häuser und Wohnungen dieser Mitarbeiter über die Richtlinien hinaus Zugriff erhalten soll.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ObjectScopeEditor
            haeuser={haeuser}
            selectedHausIds={permissions.objekte?.haeuser}
            policyGrantedHausIds={policyGrantedHausIds}
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
            policyGrantedModulePermissions={policyGrantedModulePermissions}
            onChange={handleModulePermissionsChange}
            disabled={saving}
          />
        </CardContent>
      </Card>
    </div>
  );
}
