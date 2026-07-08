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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lock,
  RefreshCw,
  Save,
  Plus,
  Minus,
  Pencil,
  Home,
  Building,
  Users,
  Gauge,
  CreditCard,
  Calculator,
  FileText,
  CheckSquare,
  Layout,
  Shield,
  Eye,
  Trash2,
  Settings,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChangeSummary {
  description: React.ReactNode;
  type: "add" | "remove" | "modify";
}

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

  const getModuleIcon = (modKey: string) => {
    const cn = "inline-block size-3.5 mx-1 align-text-bottom text-zinc-500 dark:text-zinc-400";
    switch (modKey) {
      case "haeuser":
        return <Home className={cn} />;
      case "wohnungen":
        return <Building className={cn} />;
      case "mieter":
        return <Users className={cn} />;
      case "zaehler":
        return <Gauge className={cn} />;
      case "finanzen":
        return <CreditCard className={cn} />;
      case "betriebskosten":
        return <Calculator className={cn} />;
      case "dokumente":
        return <FileText className={cn} />;
      case "aufgaben":
        return <CheckSquare className={cn} />;
      case "vorlagen":
        return <Layout className={cn} />;
      case "organisation":
        return <Shield className={cn} />;
      default:
        return null;
    }
  };

  const getPermissionIcon = (action: string) => {
    const cn = "inline-block size-3 mx-0.5 align-text-bottom text-zinc-400 dark:text-zinc-500";
    switch (action) {
      case "ansehen":
        return <Eye className={cn} />;
      case "erstellen":
        return <Plus className={cn} />;
      case "bearbeiten":
        return <Pencil className={cn} />;
      case "loeschen":
        return <Trash2 className={cn} />;
      case "verwalten":
        return <Settings className={cn} />;
      default:
        return null;
    }
  };

  const changesDiff = useMemo<ChangeSummary[]>(() => {
    if (!permissions || !originalPermissions) return [];
    const list: ChangeSummary[] = [];

    // 1. Policies assigned
    const prevPolicies = originalPermissions.policy_ids || [];
    const nextPolicies = permissions.policy_ids || [];
    
    // Added policies
    nextPolicies.forEach(id => {
      if (!prevPolicies.includes(id)) {
        const policyName = policies.find(p => p.id === id)?.name || id;
        list.push({
          description: (
            <>
              Richtlinie <strong>"{policyName}"</strong> zugewiesen
            </>
          ),
          type: "add"
        });
      }
    });
    // Removed policies
    prevPolicies.forEach(id => {
      if (!nextPolicies.includes(id)) {
        const policyName = policies.find(p => p.id === id)?.name || id;
        list.push({
          description: (
            <>
              Richtlinie <strong>"{policyName}"</strong> entzogen
            </>
          ),
          type: "remove"
        });
      }
    });

    // 2. House Access
    const prevHouses = originalPermissions.objekte?.haeuser || [];
    const nextHouses = permissions.objekte?.haeuser || [];

    const prevIsUnrestricted = originalPermissions.objekte?.haeuser === null;
    const nextIsUnrestricted = permissions.objekte?.haeuser === null;

    if (prevIsUnrestricted !== nextIsUnrestricted) {
      list.push({
        description: nextIsUnrestricted ? (
          <>
            Häuser-Zugriff auf <strong>"Alle Häuser (Unbeschränkt)"</strong> geändert
          </>
        ) : (
          <>
            Häuser-Zugriff auf <strong>"Eingeschränkte Häuser"</strong> geändert
          </>
        ),
        type: "modify"
      });
    } else if (!prevIsUnrestricted && !nextIsUnrestricted) {
      // Added houses
      nextHouses.forEach(id => {
        if (!prevHouses.includes(id)) {
          const houseName = haeuser.find(h => h.id === id)?.name || id;
          list.push({
            description: (
              <>
                Zugriff auf Haus <strong>"{houseName}"</strong> erteilt
              </>
            ),
            type: "add"
          });
        }
      });
      // Removed houses
      prevHouses.forEach(id => {
        if (!nextHouses.includes(id)) {
          const houseName = haeuser.find(h => h.id === id)?.name || id;
          list.push({
            description: (
              <>
                Zugriff auf Haus <strong>"{houseName}"</strong> entzogen
              </>
            ),
            type: "remove"
          });
        }
      });
    }

    // 3. Module Permissions
    const prevModules = originalPermissions.module || {};
    const nextModules = permissions.module || {};

    const allModuleKeys = Array.from(new Set([
      ...Object.keys(prevModules),
      ...Object.keys(nextModules)
    ]));

    const actionLabelMap: Record<string, string> = {
      ansehen: "Ansehen",
      erstellen: "Erstellen",
      bearbeiten: "Bearbeiten",
      loeschen: "Löschen",
      verwalten: "Verwalten"
    };

    const moduleLabelMap: Record<string, string> = {
      haeuser: "Häuser",
      wohnungen: "Wohnungen",
      mieter: "Mieter",
      zaehler: "Zähler",
      finanzen: "Finanzen",
      betriebskosten: "Betriebskosten",
      dokumente: "Dokumente",
      aufgaben: "Aufgaben",
      vorlagen: "Vorlagen",
      organisation: "Organisation"
    };

    allModuleKeys.forEach(modKey => {
      const prevActions = prevModules[modKey] || [];
      const nextActions = nextModules[modKey] || [];

      const added = nextActions.filter(a => !prevActions.includes(a));
      const removed = prevActions.filter(a => !nextActions.includes(a));

      const modLabel = moduleLabelMap[modKey] || modKey;

      if (added.length > 0) {
        list.push({
          description: (
            <>
              Berechtigung im Modul {getModuleIcon(modKey)} <strong>"{modLabel}"</strong> erteilt:{" "}
              {added.map((a, idx) => (
                <span key={a} className="inline-flex items-center gap-0.5 text-zinc-800 dark:text-zinc-200 font-semibold">
                  {idx > 0 && <span className="text-zinc-400 dark:text-zinc-600 mr-1 font-normal">,</span>}
                  {getPermissionIcon(a)}
                  <span>{actionLabelMap[a] || a}</span>
                </span>
              ))}
            </>
          ),
          type: "add"
        });
      }
      if (removed.length > 0) {
        list.push({
          description: (
            <>
              Berechtigung im Modul {getModuleIcon(modKey)} <strong>"{modLabel}"</strong> entzogen:{" "}
              {removed.map((a, idx) => (
                <span key={a} className="inline-flex items-center gap-0.5 text-zinc-500 line-through">
                  {idx > 0 && <span className="text-zinc-400 dark:text-zinc-600 mr-1 no-underline">,</span>}
                  {getPermissionIcon(a)}
                  <span>{actionLabelMap[a] || a}</span>
                </span>
              ))}
            </>
          ),
          type: "remove"
        });
      }
    });

    return list;
  }, [permissions, originalPermissions, policies, haeuser]);

  const headerContent = (
    <div className="flex flex-col gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5 w-full">
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-200">
              {memberName}
            </h2>
            {isCurrentUser && (
              <span className="text-[10px] text-zinc-400 font-normal border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-full shrink-0">
                Du
              </span>
            )}
          </div>
          {email && <span className="text-xs text-muted-foreground">{email}</span>}
        </div>
      </div>
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

        {/* Section 3: Save / Discard Bar (Application Card style) */}
        {isDirty && (
          <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ungespeicherte Änderungen</CardTitle>
              <CardDescription className="text-xs">
                Folgende Änderungen werden auf dieses Mitglied angewendet:
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex flex-col gap-2.5">
                {changesDiff.map((change, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs py-0.5">
                    <span className={cn(
                      "flex items-center justify-center size-5 rounded-full shrink-0 border mt-0.5",
                      change.type === "add" ? "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-800" :
                      change.type === "remove" ? "bg-red-500/10 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-800" :
                      "bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-800"
                    )}>
                      {change.type === "add" && <Plus className="size-3 stroke-[2.5]" />}
                      {change.type === "remove" && <Minus className="size-3 stroke-[2.5]" />}
                      {change.type === "modify" && <Pencil className="size-2.5 stroke-[2.5]" />}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium leading-6">
                      {change.description}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="p-6 pt-4 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Möchten Sie diese Änderungen jetzt speichern?
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 cursor-pointer bg-transparent border-0"
                >
                  Verwerfen
                </button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs h-9 px-5 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all border-0"
                >
                  {saving ? "Wird gespeichert..." : "Änderungen speichern"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Section 2.5: Danger Zone (only if manageable) */}
        {hasVerwaltenPermission && !isOwnerRow && !isCurrentUser && (
          <Card className="rounded-[2rem] border border-red-200/50 dark:border-red-900/30 shadow-xs bg-red-500/[0.01] dark:bg-red-500/[0.02]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-red-600 dark:text-red-400">Gefahrenbereich</CardTitle>
              <CardDescription className="text-xs">
                Verwalten Sie die Rolle, den Status oder entfernen Sie das Mitglied dauerhaft aus der Organisation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-0 pt-0 pb-3">
              {/* Role Setting Row */}
              {onRoleChange && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-zinc-200/50 dark:border-zinc-800/30">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Mitgliedsrolle</span>
                    <span className="text-xs text-muted-foreground">Bestimmt die Berechtigungsstufe des Mitarbeiters.</span>
                  </div>
                  <Select
                    value={rolle}
                    onValueChange={(val) => onRoleChange(mitgliedId, memberName, val)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-[140px] h-9 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="mitarbeiter">Mitarbeiter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Status Setting Row */}
              {onStatusChange && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-zinc-200/50 dark:border-zinc-800/30">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Kontostatus</span>
                    <span className="text-xs text-muted-foreground">Aktivieren oder deaktivieren Sie den Zugriff des Mitarbeiters.</span>
                  </div>
                  <Select
                    value={status}
                    onValueChange={(val) => onStatusChange(mitgliedId, memberName, val)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-[140px] h-9 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="aktiv">Aktiv</SelectItem>
                      <SelectItem value="deaktiviert">Deaktiviert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Remove Member Row */}
              {onRemove && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Mitglied entfernen</span>
                    <span className="text-xs text-muted-foreground">Entzieht dauerhaft alle Berechtigungen und den Zugriff.</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onRemove(mitgliedId, memberName)}
                    disabled={isPending}
                    className="rounded-xl font-semibold h-9 px-4 shrink-0"
                  >
                    Mitglied löschen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
