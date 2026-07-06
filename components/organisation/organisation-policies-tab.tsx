"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { HausWithWohnungen, OrganisationPolicy, PolicyBerechtigungen } from "@/lib/organisation-types";
import {
  getPoliciesAction,
  createPolicyAction,
  updatePolicyAction,
  deletePolicyAction
} from "@/lib/organisation/policy-actions";
import { getOrgHaeuserAction } from "@/lib/perms-actions";
import { ObjectScopeEditor } from "./object-scope-editor";
import { ModulePermissionEditor } from "./module-permission-editor";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Trash2, Save, RefreshCw, AlertTriangle, CheckCircle, Trash } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface OrganisationPoliciesTabProps {
  hasVerwaltenPermission: boolean;
}

export function OrganisationPoliciesTab({ hasVerwaltenPermission }: OrganisationPoliciesTabProps) {
  const [policies, setPolicies] = useState<OrganisationPolicy[]>([]);
  const [haeuser, setHaeuser] = useState<HausWithWohnungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, startSavingTransition] = useTransition();

  const [editingPolicy, setEditingPolicy] = useState<OrganisationPolicy | null>(null);
  const [originalPolicy, setOriginalPolicy] = useState<OrganisationPolicy | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPolicy, setDeletingPolicy] = useState<OrganisationPolicy | null>(null);

  // Fetch policies and houses on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [policiesData, housesData] = await Promise.all([
          getPoliciesAction(),
          getOrgHaeuserAction(),
        ]);
        setPolicies(policiesData);
        setHaeuser(housesData);
      } catch (error) {
        console.error("Failed to load policies or houses:", error);
        toast({
          title: "Fehler beim Laden",
          description: "Die Daten konnten nicht geladen werden.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);


  // Check if current editing policy is dirty
  const isDirty = useMemo(() => {
    if (!editingPolicy) return false;
    if (!originalPolicy) {
      // New policy is dirty if name is not empty or has any permissions
      return editingPolicy.name.trim().length > 0 ||
        (editingPolicy.berechtigungen.module && Object.keys(editingPolicy.berechtigungen.module).length > 0) ||
        (editingPolicy.berechtigungen.objekte?.haeuser && editingPolicy.berechtigungen.objekte.haeuser.length > 0);
    }
    return (
      editingPolicy.name !== originalPolicy.name ||
      JSON.stringify(editingPolicy.berechtigungen) !== JSON.stringify(originalPolicy.berechtigungen)
    );
  }, [editingPolicy, originalPolicy]);

  const handleSelectPolicy = (policy: OrganisationPolicy | null) => {
    if (policy) {
      setEditingPolicy(structuredClone(policy));
      setOriginalPolicy(structuredClone(policy));
    } else {
      setEditingPolicy(null);
      setOriginalPolicy(null);
    }
  };

  const handleCreateNewTemplate = () => {
    const newTemplate: OrganisationPolicy = {
      id: "",
      organisation_id: "",
      name: "",
      berechtigungen: {
        module: {},
        objekte: { haeuser: null }
      },
      erstellt_am: new Date().toISOString()
    };
    setEditingPolicy(newTemplate);
    setOriginalPolicy(null);
  };

  const handleSave = () => {
    if (!editingPolicy || !isDirty) return;

    if (!editingPolicy.name.trim()) {
      toast({
        title: "Fehler",
        description: "Der Name der Richtlinie darf nicht leer sein.",
        variant: "destructive"
      });
      return;
    }

    startSavingTransition(async () => {
      try {
        const payloadBerechtigungen: PolicyBerechtigungen = {
          module: editingPolicy.berechtigungen.module || {},
          objekte: {
            haeuser: editingPolicy.berechtigungen.objekte?.haeuser ?? null
          }
        };

        if (!originalPolicy) {
          // Create new policy
          const newPolicy = await createPolicyAction(editingPolicy.name, payloadBerechtigungen);
          setPolicies(prev => [...prev, newPolicy]);
          handleSelectPolicy(newPolicy);
          toast({
            title: "Richtlinie erstellt",
            description: `Die Richtlinie "${newPolicy.name}" wurde erfolgreich erstellt.`,
            variant: "success"
          });
        } else {
          // Update existing policy
          const updatedPolicy = await updatePolicyAction(editingPolicy.id, editingPolicy.name, payloadBerechtigungen);
          setPolicies(prev => prev.map(p => p.id === updatedPolicy.id ? updatedPolicy : p));
          handleSelectPolicy(updatedPolicy);
          toast({
            title: "Richtlinie aktualisiert",
            description: `Die Richtlinie "${updatedPolicy.name}" wurde erfolgreich gespeichert.`,
            variant: "success"
          });
        }
      } catch (error: any) {
        console.error("Failed to save policy:", error);
        toast({
          title: "Fehler beim Speichern",
          description: error.message || "Es gab ein Problem beim Speichern.",
          variant: "destructive"
        });
      }
    });
  };

  const handleDelete = () => {
    if (!editingPolicy || !originalPolicy) return;
    setDeletingPolicy(editingPolicy);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!deletingPolicy) return;
    const policyId = deletingPolicy.id;
    const policyName = deletingPolicy.name;

    startSavingTransition(async () => {
      try {
        await deletePolicyAction(policyId);
        setPolicies(prev => prev.filter(p => p.id !== policyId));
        if (editingPolicy?.id === policyId) {
          handleSelectPolicy(null);
        }
        setDeletingPolicy(null);
        toast({
          title: "Richtlinie gelöscht",
          description: `Die Richtlinie "${policyName}" wurde erfolgreich entfernt.`,
          variant: "success"
        });
      } catch (error: any) {
        console.error("Failed to delete policy:", error);
        toast({
          title: "Fehler beim Löschen",
          description: error.message || "Die Richtlinie konnte nicht gelöscht werden.",
          variant: "destructive"
        });
      } finally {
        setShowDeleteConfirm(false);
      }
    });
  };

  const handleObjectScopeChange = (hausIds: string[] | null) => {
    if (!editingPolicy) return;
    setEditingPolicy({
      ...editingPolicy,
      berechtigungen: {
        ...editingPolicy.berechtigungen,
        objekte: {
          haeuser: hausIds
        }
      }
    });
  };

  const handleModulePermissionsChange = (modulePerms: Record<string, string[]>) => {
    if (!editingPolicy) return;
    setEditingPolicy({
      ...editingPolicy,
      berechtigungen: {
        ...editingPolicy.berechtigungen,
        module: modulePerms
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] min-h-[400px] gap-3">
        <RefreshCw className="size-6 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Richtlinien werden geladen...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* Left Pane: Policies List */}
      <div className={cn("flex flex-col gap-4 w-full", editingPolicy ? "md:w-1/2" : "md:w-2/3")}>
        <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl">Organisation Richtlinien</CardTitle>
              <CardDescription>
                Richtlinien definieren Rollen- und Objektrechte, die Teammitgliedern zugewiesen werden können.
              </CardDescription>
            </div>
            {hasVerwaltenPermission && (
              <Button
                onClick={handleCreateNewTemplate}
                size="sm"
                className="rounded-xl bg-primary hover:bg-primary/95 text-white flex items-center gap-1.5 h-9"
              >
                <Plus className="size-4" />
                <span>Neue Richtlinie</span>
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
                  <TableRow>
                    <TableHead className="py-3 pl-6">Name</TableHead>
                    <TableHead className="py-3">Details</TableHead>
                    <TableHead className="py-3 pr-6 text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Keine Richtlinien vorhanden.
                      </TableCell>
                    </TableRow>
                  ) : (
                    policies.map(policy => {
                      const isUnrestricted = !policy.berechtigungen.objekte?.haeuser || policy.berechtigungen.objekte.haeuser.length === 0;
                      const housesCount = policy.berechtigungen.objekte?.haeuser?.length || 0;
                      const housesText = isUnrestricted
                        ? "Alle Häuser"
                        : `${housesCount} ${housesCount === 1 ? 'Haus' : 'Häuser'}`;

                      const activeModulesCount = Object.values(policy.berechtigungen.module || {}).filter(
                        actions => actions && actions.length > 0
                      ).length;
                      const modulesText = `${activeModulesCount} ${activeModulesCount === 1 ? 'Modul' : 'Module'}`;
                      const isSelected = editingPolicy?.id === policy.id && originalPolicy !== null;

                      return (
                        <TableRow
                          key={policy.id}
                          onClick={() => handleSelectPolicy(isSelected ? null : policy)}
                          className={cn(
                            "cursor-pointer transition-colors duration-150",
                            isSelected
                              ? "bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                              : "hover:bg-zinc-50/30 dark:hover:bg-zinc-900/30"
                          )}
                        >
                          <TableCell className="py-4 pl-6 font-semibold text-sm flex items-center gap-2">
                            <Shield className="size-4 text-indigo-500 shrink-0" />
                            <span>{policy.name}</span>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="text-xs text-muted-foreground">
                              {modulesText} · {housesText}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                            {hasVerwaltenPermission && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-500 rounded-lg"
                                onClick={() => {
                                  if (isDirty && editingPolicy && editingPolicy.id !== policy.id) {
                                    toast({
                                      title: "Ungespeicherte Änderungen",
                                      description: "Bitte speichern oder verwerfen Sie die aktuellen Änderungen.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  setDeletingPolicy(policy);
                                  setShowDeleteConfirm(true);
                                }}
                                title="Richtlinie löschen"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Pane: Policy Editor */}
      <div className={cn("w-full", editingPolicy ? "md:w-1/2" : "md:w-1/3")}>
        {editingPolicy ? (
          <div className="flex flex-col gap-6">
            {/* Top Bar for Discard / Save */}
            {isDirty && (
              <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Ungespeicherte Änderungen an dieser Richtlinie
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      if (originalPolicy) {
                        setEditingPolicy(structuredClone(originalPolicy));
                      } else {
                        setEditingPolicy(null);
                      }
                    }}
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

            <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {originalPolicy ? "Richtlinie bearbeiten" : "Neue Richtlinie erstellen"}
                  </CardTitle>
                  <CardDescription>
                    {originalPolicy
                      ? "Passen Sie den Namen und die Berechtigungen für diese Richtlinie an."
                      : "Geben Sie der neuen Richtlinie einen Namen und definieren Sie Berechtigungen."}
                  </CardDescription>
                </div>
                {originalPolicy && hasVerwaltenPermission && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl size-9"
                    onClick={handleDelete}
                    disabled={saving}
                    title="Richtlinie löschen"
                  >
                    <Trash className="size-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="policy-name-input" className="text-xs font-semibold uppercase text-zinc-500">Name der Richtlinie</label>
                  <Input
                    id="policy-name-input"
                    type="text"
                    value={editingPolicy.name}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, name: e.target.value })}
                    placeholder="z.B. Buchhaltung, Hausmeister"
                    disabled={saving || !hasVerwaltenPermission}
                    className="rounded-xl h-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Objekt-Scope (Häuser-Zugriff)</CardTitle>
                <CardDescription className="text-xs">
                  Legen Sie fest, auf welche Häuser diese Richtlinie Zugriff gewährt.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ObjectScopeEditor
                  haeuser={haeuser}
                  selectedHausIds={editingPolicy.berechtigungen.objekte?.haeuser ?? null}
                  onChange={handleObjectScopeChange}
                  disabled={saving || !hasVerwaltenPermission}
                />
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Modul- und Aktionsrechte</CardTitle>
                <CardDescription className="text-xs">
                  Aktivieren Sie die gewünschten Berechtigungen in den jeweiligen Modulen.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:px-6 sm:pb-6">
                <ModulePermissionEditor
                  modulePermissions={editingPolicy.berechtigungen.module || {}}
                  onChange={handleModulePermissionsChange}
                  disabled={saving || !hasVerwaltenPermission}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs p-6 text-center text-zinc-500">
            <p className="text-sm">
              Wählen Sie eine Richtlinie aus der Liste aus oder klicken Sie auf "Neue Richtlinie", um eine neue Richtlinie zu erstellen.
            </p>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-[2rem] max-w-md border border-zinc-200/50 dark:border-zinc-800/50">
          <AlertDialogHeader className="flex flex-col gap-3">
            <div className="mx-auto bg-amber-500/10 text-amber-500 p-4 rounded-full w-fit">
              <AlertTriangle className="size-8" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-center">
              Richtlinie löschen
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-muted-foreground leading-relaxed">
              Möchten Sie die Richtlinie <strong className="text-foreground">"{deletingPolicy?.name}"</strong> wirklich löschen?
              Diese Richtlinie wird allen betroffenen Mitgliedern entzogen, wodurch sie die daraus resultierenden Rechte sofort verlieren.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
            <AlertDialogCancel className="rounded-xl flex-1 border border-zinc-200 dark:border-zinc-800" disabled={saving}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl flex-1 bg-red-500 hover:bg-red-600 text-white font-medium"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={saving}
            >
              {saving ? "Bitte warten..." : "Bestätigen & Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
