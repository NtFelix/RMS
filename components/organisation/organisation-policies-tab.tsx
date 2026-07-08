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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchInput } from "@/components/ui/search-input";
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
import { Shield, PlusCircle, Save, RefreshCw, AlertTriangle, Trash, Clock } from "lucide-react";
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

  const [searchQuery, setSearchQuery] = useState("");
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

  // Filter policies based on search query
  const filteredPolicies = useMemo(() => {
    if (!searchQuery) return policies;
    const query = searchQuery.toLowerCase();
    return policies.filter(p => p.name.toLowerCase().includes(query));
  }, [policies, searchQuery]);

  // Check if current editing policy is dirty
  const isDirty = useMemo(() => {
    if (!editingPolicy) return false;
    if (!originalPolicy) {
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
    if (isDirty) {
      toast({
        title: "Ungespeicherte Änderungen",
        description: "Bitte speichern oder verwerfen Sie die aktuellen Änderungen zuerst.",
        variant: "destructive",
      });
      return;
    }
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {/* Left Pane: Unified Policies Navigation List */}
      <Card className="md:col-span-1 rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden h-[calc(100vh-220px)] flex flex-col md:sticky md:top-24">
        <div className="p-4 border-b border-zinc-200/50 dark:border-zinc-800/50 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-200">Richtlinien</h3>
            {hasVerwaltenPermission && (
              <Button
                size="sm"
                onClick={handleCreateNewTemplate}
                className="rounded-xl bg-primary hover:bg-primary/95 text-white flex items-center gap-1.5 h-8 text-xs font-semibold px-3"
              >
                <PlusCircle className="size-3.5" />
                <span>Erstellen</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SearchInput
              placeholder="Suchen nach Richtlinien..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 text-xs rounded-xl"
              wrapperClassName="w-full"
            />
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-zinc-50/30 dark:bg-zinc-950/10">
          {filteredPolicies.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-8">
              Keine Richtlinien gefunden.
            </div>
          ) : (
            filteredPolicies.map((policy) => {
              const isSelected = editingPolicy?.id === policy.id && originalPolicy !== null;
              const initials = policy.name
                ? policy.name.split(" ").map(n => n.charAt(0)).join("").toUpperCase().slice(0, 2)
                : "RL";

              const isUnrestricted = !policy.berechtigungen.objekte?.haeuser || policy.berechtigungen.objekte.haeuser.length === 0;
              const housesCount = policy.berechtigungen.objekte?.haeuser?.length || 0;
              const housesText = isUnrestricted
                ? "Alle Häuser"
                : `${housesCount} ${housesCount === 1 ? 'Haus' : 'Häuser'}`;

              const activeModulesCount = Object.values(policy.berechtigungen.module || {}).filter(
                actions => actions && actions.length > 0
              ).length;
              const modulesText = `${activeModulesCount} ${activeModulesCount === 1 ? 'Modul' : 'Module'}`;

              return (
                <div
                  key={policy.id}
                  onClick={() => {
                    if (isDirty && editingPolicy && editingPolicy.id !== policy.id) {
                      toast({
                        title: "Ungespeicherte Änderungen",
                        description: "Bitte speichern oder verwerfen Sie die aktuellen Änderungen.",
                        variant: "destructive",
                      });
                      return;
                    }
                    handleSelectPolicy(isSelected ? null : policy);
                  }}
                  className={cn(
                    "p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 border border-transparent",
                    isSelected
                      ? "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/50 dark:border-zinc-700/50 shadow-xs"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900/30"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 border border-zinc-200/20 shrink-0">
                      <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 truncate">
                        {policy.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {modulesText} · {housesText}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 mr-1 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-lg text-zinc-500">
                    <Shield className="size-3.5" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Right Pane: Policy Editor Detail Panel */}
      <div className="md:col-span-2">
        {editingPolicy ? (
          <div className="flex flex-col gap-6">
            {/* Header section matching MitgliedPermissionDetail */}
            <div className="flex flex-col gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-200 flex items-center gap-2 truncate">
                    {editingPolicy.name || "Neue Richtlinie"}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {originalPolicy
                      ? `Erstellt am ${new Date(editingPolicy.erstellt_am).toLocaleDateString("de-DE")}`
                      : "Entwurf für eine neue Richtlinie"}
                  </span>
                </div>

                {/* Actions inside header */}
                {originalPolicy && hasVerwaltenPermission && (
                  <div className="flex items-center gap-3 shrink-0">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-xs text-muted-foreground hover:text-red-500 rounded-lg h-8 px-2 flex items-center gap-1 hover:bg-red-500/5 dark:hover:bg-red-500/10 border border-zinc-200/50 dark:border-zinc-800/50"
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      <Trash className="size-3.5" />
                      <span>Löschen</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Section 1: Name der Richtlinie */}
            <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Name der Richtlinie</CardTitle>
                <CardDescription className="text-xs">
                  Geben Sie einen aussagekräftigen Namen für diese Richtlinie an.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Input
                  id="policy-name-input"
                  type="text"
                  value={editingPolicy.name}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, name: e.target.value })}
                  placeholder="z.B. Buchhaltung, Hausmeister"
                  disabled={saving || !hasVerwaltenPermission}
                  className="rounded-xl h-10 border-zinc-200/80 dark:border-zinc-800/80"
                />
              </CardContent>
            </Card>

            {/* Section 2: Object-Scope (Häuser-Zugriff) */}
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

            {/* Section 3: Modul- und Aktionsrechte */}
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

            {/* Section 4: Save / Discard Bar matching MitgliedPermissionDetail */}
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
                    onClick={() => {
                      if (originalPolicy) {
                        setEditingPolicy(structuredClone(originalPolicy));
                      } else {
                        setEditingPolicy(null);
                      }
                    }}
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
                      <span>Richtlinie speichern</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state matching Mitglied empty state */
          <Card className="rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800 shadow-xs p-12 text-center text-zinc-500 h-full flex flex-col items-center justify-center gap-4">
            <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-full text-zinc-400 dark:text-zinc-600">
              <Shield className="size-10" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg text-zinc-800 dark:text-zinc-200">Keine Richtlinie ausgewählt</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Wählen Sie eine Richtlinie aus der Liste aus oder erstellen Sie eine neue, um Berechtigungen anzuzeigen oder Einstellungen zu verwalten.
              </p>
            </div>
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
