"use client";

import React, { useState, useEffect, useTransition, useMemo, useRef } from "react";
import { MemberPermissions, HausWithWohnungen, OrganisationPolicy } from "@/lib/organisation-types";
import { getMitgliedPermissionsAction, getOrgHaeuserAction, setMitgliedOverridesAction } from "@/lib/perms-actions";
import { getPoliciesAction, updateMitgliedPoliciesAction, getMitgliedPoliciesAction } from "@/lib/organisation/policy-actions";
import { ObjectScopeEditor } from "./object-scope-editor";
import { ModulePermissionEditor } from "./module-permission-editor";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Lock, RefreshCw, Save, Trash2, ChevronDown, Shield, Clock, Trash, Check, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  mitgliedId: string;
  rolle: "owner" | "admin" | "mitarbeiter";
  status: "eingeladen" | "aktiv" | "deaktiviert";
  memberName: string;
  email?: string;
  hasVerwaltenPermission?: boolean;
  currentUserId?: string;
  selectedMemberUserId?: string;
  onRoleChange?: (memberId: string, name: string, newRole: string) => void;
  onStatusChange?: (memberId: string, name: string, newStatus: string) => void;
  onRemove?: (memberId: string, name: string) => void;
  isPending?: boolean;
}

export function MitgliedPermissionDetail({
  mitgliedId,
  rolle,
  status,
  memberName,
  email,
  hasVerwaltenPermission = false,
  currentUserId,
  selectedMemberUserId,
  onRoleChange,
  onStatusChange,
  onRemove,
  isPending = false,
}: Props) {
  const [permissions, setPermissions] = useState<MemberPermissions | null>(null);
  const [originalPermissions, setOriginalPermissions] = useState<MemberPermissions | null>(null);
  const permissionsRef = useRef(permissions);
  const originalPermissionsRef = useRef(originalPermissions);
  const [haeuser, setHaeuser] = useState<HausWithWohnungen[]>([]);
  const [policies, setPolicies] = useState<OrganisationPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, startSavingTransition] = useTransition();

  const isLocked = rolle === "owner" || rolle === "admin";
  const isCurrentUser = selectedMemberUserId === currentUserId;
  const isOwnerRow = rolle === "owner";

  useEffect(() => {
    const fetchPermissionsAndPolicies = async () => {
      if (isLocked) return;
      setLoading(true);
      try {
        const [perms, houses, orgPolicies, memberPolicyIds] = await Promise.all([
          getMitgliedPermissionsAction(mitgliedId),
          getOrgHaeuserAction(),
          getPoliciesAction(),
          getMitgliedPoliciesAction(mitgliedId),
        ]);
        const withPolicies = { ...perms, policy_ids: memberPolicyIds };
        setPermissions(withPolicies);
        setOriginalPermissions(structuredClone(withPolicies));
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

  useEffect(() => {
    permissionsRef.current = permissions;
  }, [permissions]);
  useEffect(() => {
    originalPermissionsRef.current = originalPermissions;
  }, [originalPermissions]);

  // Compute stats for overview pane
  const statsSummary = useMemo(() => {
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
    const p = permissionsRef.current;
    const op = originalPermissionsRef.current;
    if (!p || !op || !isDirty) return;

    startSavingTransition(async () => {
      try {
        const hasOverridesChanges = JSON.stringify(p.module) !== JSON.stringify(op.module)
          || JSON.stringify(p.objekte) !== JSON.stringify(op.objekte);
        if (hasOverridesChanges) {
          const payload = {
            module: p.module || {},
            objekte: { haeuser: p.objekte?.haeuser ?? null },
          };

          const res = await setMitgliedOverridesAction(mitgliedId, payload);
          if (!res.success) {
            throw new Error(res.error || "Problem beim Speichern der Overrides.");
          }
        }

        const toAssign = p.policy_ids.filter(id => !op.policy_ids.includes(id));
        const toRemove = op.policy_ids.filter(id => !p.policy_ids.includes(id));

        if (toAssign.length > 0 || toRemove.length > 0) {
          await updateMitgliedPoliciesAction(mitgliedId, toAssign, toRemove);
        }

        toast({
          title: "Speichern erfolgreich",
          description: `Die Berechtigungen und Richtlinien für ${memberName} wurden erfolgreich aktualisiert.`,
          variant: "success",
        });

        setOriginalPermissions(structuredClone(p));
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

  // Section 0: Member Header Content
  const summaryText = useMemo(() => {
    if (isLocked) {
      return `Vollzugriff auf alle Häuser und Module`;
    }
    if (!statsSummary) return "";
    const housesText = statsSummary.isUnrestricted
      ? `alle Häuser`
      : `${statsSummary.housesCount} Haus/Häuser`;
    return `Zugriff auf ${housesText} · ${statsSummary.activeModules} Module aktiv`;
  }, [statsSummary, isLocked]);

  const headerContent = (
    <div className="flex flex-col gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            {memberName}
            {isCurrentUser && (
              <span className="text-[10px] text-zinc-400 font-normal border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-full">
                Du
              </span>
            )}
          </h2>
          {email && <span className="text-xs text-muted-foreground">{email}</span>}
        </div>
        
        {/* Actions inside header */}
        <div className="flex flex-wrap items-center gap-3">
          {/* "Verwalten" unified dropdown action */}
          {hasVerwaltenPermission && !isOwnerRow && !isCurrentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={isPending}
                  className="text-xs text-muted-foreground hover:text-foreground rounded-lg h-8 px-3 flex items-center gap-1.5 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-800/50"
                >
                  <Settings className="size-3.5" />
                  <span>Verwalten</span>
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 rounded-xl p-1.5" align="end">
                {onRoleChange && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
                      <Shield className="size-4 text-zinc-500" />
                      <span>Rolle ändern</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="w-40 rounded-xl p-1">
                        <DropdownMenuItem 
                          className={cn("justify-between cursor-pointer", rolle === "admin" && "font-semibold text-primary")}
                          onSelect={() => {
                            setTimeout(() => onRoleChange(mitgliedId, memberName, "admin"), 100);
                          }}
                        >
                          <span>Admin</span>
                          {rolle === "admin" && <Check className="size-3.5" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className={cn("justify-between cursor-pointer", rolle === "mitarbeiter" && "font-semibold text-primary")}
                          onSelect={() => {
                            setTimeout(() => onRoleChange(mitgliedId, memberName, "mitarbeiter"), 100);
                          }}
                        >
                          <span>Mitarbeiter</span>
                          {rolle === "mitarbeiter" && <Check className="size-3.5" />}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                )}

                {onStatusChange && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
                      <Clock className="size-4 text-zinc-500" />
                      <span>Status ändern</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="w-40 rounded-xl p-1">
                        <DropdownMenuItem 
                          className={cn("justify-between cursor-pointer", status === "aktiv" && "font-semibold text-emerald-600")}
                          onSelect={() => {
                            setTimeout(() => onStatusChange(mitgliedId, memberName, "aktiv"), 100);
                          }}
                        >
                          <span>Aktiv</span>
                          {status === "aktiv" && <Check className="size-3.5" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className={cn("justify-between cursor-pointer", status === "deaktiviert" && "font-semibold text-red-600")}
                          onSelect={() => {
                            setTimeout(() => onStatusChange(mitgliedId, memberName, "deaktiviert"), 100);
                          }}
                        >
                          <span>Deaktiviert</span>
                          {status === "deaktiviert" && <Check className="size-3.5" />}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                )}

                {onRemove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 dark:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-600 flex items-center gap-2 cursor-pointer"
                      onSelect={() => {
                        setTimeout(() => onRemove(mitgliedId, memberName), 100);
                      }}
                    >
                      <Trash className="size-4" />
                      <span>Mitglied entfernen</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      {summaryText && (
        <p className="text-sm text-muted-foreground">{summaryText}</p>
      )}
    </div>
  );

  if (isLocked) {
    return (
      <div className="flex flex-col gap-6">
        {headerContent}
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] bg-zinc-50/50 dark:bg-zinc-900/30 text-center gap-4 min-h-[300px]">
          <div className="bg-indigo-500/10 text-indigo-500 p-4 rounded-full">
            <Lock className="size-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-200">Rollenbasierter Vollzugriff</h3>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Inhaber und Administratoren haben stets vollen Zugriff und können nicht eingeschränkt werden.
            </p>
          </div>
        </div>
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
    <div className="space-y-6">
      {headerContent}

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
                          setPermissions(prev => ({
                            ...prev!,
                            policy_ids: checked
                              ? [...prev!.policy_ids, policy.id]
                              : prev!.policy_ids.filter(id => id !== policy.id),
                          }));
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

        {/* Section 1: Object-Scope Editor (House Access) */}
        <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">House Access</CardTitle>
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

        {/* Section 2: Module & Action Permissions (Matrix Editor) */}
        <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Module Permissions</CardTitle>
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

        {/* Section 3: Save / Discard Bar (Inline below the editors) */}
        <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between shadow-xs transition-all duration-200 mt-8">
          <div className="text-xs text-zinc-500">
            {isDirty ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">Ungespeicherte Änderungen</span>
            ) : (
              <span>Alle Änderungen gespeichert</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isDirty && (
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
              >
                Verwerfen
              </button>
            )}
            <Button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className={cn(
                "text-xs h-8 px-4 rounded-xl font-semibold flex items-center gap-1.5 shadow-sm transition-all",
                isDirty
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600 cursor-not-allowed"
              )}
            >
              {saving ? (
                <>
                  <RefreshCw className="size-3 animate-spin" />
                  <span>Speichert...</span>
                </>
              ) : (
                <>
                  <Save className="size-3" />
                  <span>Änderungen speichern</span>
                </>
              )}
            </Button>
          </div>
        </div>
    </div>
  );
}
