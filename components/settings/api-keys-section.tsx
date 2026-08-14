"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Trash2,
  XCircle,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  Info,
  Calendar,
  User,
  Shield,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SettingsSection } from "@/components/settings/shared";

interface ApiKeyItem {
  id: string;
  organisation_id: string;
  mitglied_id: string;
  name: string;
  key_prefix: string | null;
  environment: "live" | "test";
  status: "ausstehend" | "aktiv" | "abgelehnt" | "widerrufen" | "pausiert";
  erstellt_von: string | null;
  ersteller_email?: string | null;
  ersteller_first_name?: string | null;
  ersteller_last_name?: string | null;
  angefragte_berechtigungen: any;
  berechtigungen: any;
  genehmigt_von: string | null;
  genehmigt_von_email?: string | null;
  genehmigt_von_first_name?: string | null;
  genehmigt_von_last_name?: string | null;
  genehmigt_am: string | null;
  expires_at: string | null;
  last_used_at: string | null;
  pausiert_grund: string | null;
  erstellt_am: string;
  geaendert_am: string;
  ersteller_status?: string;
}

const AVAILABLE_MODULES = [
  { id: "haeuser", label: "Häuser" },
  { id: "wohnungen", label: "Wohnungen" },
  { id: "mieter", label: "Mieter" },
  { id: "finanzen", label: "Finanzen" },
  { id: "aufgaben", label: "Aufgaben" },
  { id: "zaehler", label: "Zähler" },
  { id: "zaehler_ablesungen", label: "Zählerablesungen" },
];

const AVAILABLE_ACTIONS = [
  { id: "ansehen", label: "Lesen" },
  { id: "erstellen", label: "Erstellen" },
  { id: "bearbeiten", label: "Bearbeiten" },
  { id: "loeschen", label: "Löschen" },
];

export default function ApiKeysSection() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [secretModalOpen, setSecretModalOpen] = useState(false);

  // Form states
  const [keyName, setKeyName] = useState("");
  const [environment, setEnvironment] = useState<"live" | "test">("live");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedModules, setSelectedModules] = useState<Record<string, Record<string, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);

  // Approval state
  const [selectedKeyForApproval, setSelectedKeyForApproval] = useState<ApiKeyItem | null>(null);
  const [approvalPermissions, setApprovalPermissions] = useState<Record<string, Record<string, boolean>>>({});

  // Secret display state
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/einstellungen/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch API keys:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleRequestKey = async () => {
    if (!keyName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen für den API-Key ein.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: keyName.trim(),
        environment,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        angefragte_berechtigungen: {
          module: selectedModules,
        },
      };

      const res = await fetch("/api/einstellungen/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Fehler beim Beantragen des API-Keys.");
      }

      toast({
        title: "Erfolg",
        description: "API-Key wurde erfolgreich beantragt und wartet auf Genehmigung.",
        variant: "success",
      });

      setRequestModalOpen(false);
      setKeyName("");
      setExpiresAt("");
      setSelectedModules({});
      fetchKeys();
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message || "Fehler beim Beantragen.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveKey = async () => {
    if (!selectedKeyForApproval) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/einstellungen/api-keys/${selectedKeyForApproval.id}/genehmigen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          berechtigungen: { module: approvalPermissions },
          environment: selectedKeyForApproval.environment,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Fehler bei der Genehmigung.");
      }

      setApproveModalOpen(false);
      setRevealedSecret(json.plaintext);
      setSecretModalOpen(true);
      fetchKeys();
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message || "Fehler bei der Genehmigung.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectKey = async (id: string) => {
    try {
      const res = await fetch(`/api/einstellungen/api-keys/${id}/ablehnen`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Fehler beim Ablehnen.");
      }
      toast({ title: "Abgelehnt", description: "API-Key wurde abgelehnt." });
      fetchKeys();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      const res = await fetch(`/api/einstellungen/api-keys/${id}/widerrufen`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Fehler beim Widerrufen.");
      }
      toast({ title: "Widerrufen", description: "API-Key wurde widerrufen." });
      fetchKeys();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const handlePauseKey = async (id: string) => {
    try {
      const res = await fetch(`/api/einstellungen/api-keys/${id}/pausieren`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Fehler beim Deaktivieren des API-Keys.");
      }
      toast({ title: "Deaktiviert", description: "API-Key wurde erfolgreich pausiert/deaktiviert." });
      fetchKeys();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const handleResumeKey = async (id: string) => {
    try {
      const res = await fetch(`/api/einstellungen/api-keys/${id}/fortsetzen`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Fehler beim Fortsetzen.");
      }
      toast({ title: "Aktiviert", description: "API-Key wurde erfolgreich fortgesetzt." });
      fetchKeys();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const res = await fetch(`/api/einstellungen/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Fehler beim Löschen.");
      }
      toast({ title: "Gelöscht", description: "API-Key wurde gelöscht." });
      fetchKeys();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const openApprovalModal = (keyItem: ApiKeyItem) => {
    setSelectedKeyForApproval(keyItem);
    const requested = keyItem.angefragte_berechtigungen?.module || {};
    setApprovalPermissions(JSON.parse(JSON.stringify(requested)));
    setApproveModalOpen(true);
  };

  const copyToClipboard = () => {
    if (revealedSecret) {
      navigator.clipboard.writeText(revealedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast({ title: "Kopiert", description: "API-Key in die Zwischenablage kopiert." });
    }
  };

  const renderStatusBadge = (status: ApiKeyItem["status"], pausiertGrund?: string | null) => {
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
  };

  const formatUserName = (firstName?: string | null, lastName?: string | null, email?: string | null) => {
    const fullName = `${firstName || ""} ${lastName || ""}`.trim();
    if (fullName) {
      return email ? `${fullName} (${email})` : fullName;
    }
    return email || "Unbekannter Nutzer";
  };

  const renderPermissionsSummary = (permsObj: any) => {
    if (!permsObj || !permsObj.module) return <span className="text-muted-foreground">Keine Module zugewiesen</span>;
    const entries = Object.entries(permsObj.module).filter(([_, actions]: [string, any]) => {
      if (Array.isArray(actions)) return actions.length > 0;
      if (typeof actions === "object" && actions !== null) return Object.values(actions).some(Boolean);
      return false;
    });

    if (entries.length === 0) return <span className="text-muted-foreground">Keine Berechtigungen</span>;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {entries.map(([modName, acts]: [string, any]) => {
          const modDef = AVAILABLE_MODULES.find((m) => m.id === modName);
          const label = modDef ? modDef.label : modName;
          let actList = "";
          if (Array.isArray(acts)) {
            actList = acts.join(", ");
          } else if (typeof acts === "object" && acts !== null) {
            actList = Object.entries(acts)
              .filter(([_, v]) => Boolean(v))
              .map(([k]) => AVAILABLE_ACTIONS.find((a) => a.id === k)?.label || k)
              .join(", ");
          }
          return (
            <Badge key={modName} variant="secondary" className="text-[11px] font-normal py-0.5 px-2 bg-muted/60">
              {label}: {actList || "Aktiv"}
            </Badge>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        title="API-Schlüssel"
        description="Verwalten Sie API-Schlüssel für den automatisierten und programmatischen Zugriff auf die Mietevo API."
      >
        <SettingsCard>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
            <div>
              <h4 className="font-semibold text-base">Aktive & Beantragte Schlüssel</h4>
              <p className="text-xs text-muted-foreground">
                Schlüssel werden kryptografisch abgesichert und Klartext-Secrets nur bei Genehmigung einmalig angezeigt.
              </p>
            </div>
            <Button
              onClick={() => {
                setKeyName("");
                setSelectedModules({
                  haeuser: { ansehen: true },
                  wohnungen: { ansehen: true },
                });
                setRequestModalOpen(true);
              }}
              className="gap-2 shrink-0"
            >
              <Plus className="h-4 w-4" />
              API-Key beantragen
            </Button>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Lade API-Schlüssel...
            </div>
          ) : keys.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-3">
              <Key className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">Bislang keine API-Keys vorhanden.</p>
              <p className="text-xs">Beantragen Sie einen neuen Schlüssel, um den programmatischen Zugriff zu nutzen.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40 mt-2">
              {keys.map((k) => {
                const creatorDisplayName = formatUserName(k.ersteller_first_name, k.ersteller_last_name, k.ersteller_email);
                const approverDisplayName = formatUserName(k.genehmigt_von_first_name, k.genehmigt_von_last_name, k.genehmigt_von_email);

                return (
                  <div key={k.id} className="py-5 space-y-3">
                    {/* Header line: Name, Badges & Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                        <div className="h-7 w-7 rounded-md bg-muted/80 flex items-center justify-center text-muted-foreground">
                          <Key className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-semibold text-sm truncate">{k.name}</span>
                        {renderStatusBadge(k.status, k.pausiert_grund)}
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                          {k.environment}
                        </Badge>
                        <span className="font-mono text-[11px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded border border-border/40">
                          {k.key_prefix || "mie_••••••••••••"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {k.status === "ausstehend" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openApprovalModal(k)}
                              className="h-8 text-xs font-medium"
                            >
                              Genehmigen
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectKey(k.id)}
                              className="h-8 text-xs text-destructive hover:bg-destructive/10"
                            >
                              Ablehnen
                            </Button>
                          </>
                        )}

                        {k.status === "aktiv" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePauseKey(k.id)}
                            className="h-8 text-xs gap-1.5 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 border-orange-500/30"
                          >
                            <Pause className="h-3.5 w-3.5" />
                            Deaktivieren
                          </Button>
                        )}

                        {k.status === "pausiert" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResumeKey(k.id)}
                            className="h-8 text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30"
                          >
                            <Play className="h-3.5 w-3.5" />
                            Aktivieren
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              •••
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(k.status === "aktiv" || k.status === "pausiert") && (
                              <DropdownMenuItem
                                onClick={() => handleRevokeKey(k.id)}
                                className="text-destructive gap-2 cursor-pointer"
                              >
                                <XCircle className="h-4 w-4" />
                                Endgültig widerrufen
                              </DropdownMenuItem>
                            )}
                            {(k.status === "abgelehnt" || k.status === "widerrufen") && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteKey(k.id)}
                                className="text-destructive gap-2 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                                Löschen
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Paused alert info if applicable */}
                    {k.status === "pausiert" && (
                      <div className="p-2.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-xs text-orange-800 dark:text-orange-300 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" />
                        <div>
                          {k.pausiert_grund === "ersteller_deaktiviert" ? (
                            <span>
                              <strong>Automatisch pausiert:</strong> Das Mitgliedskonto des Antragstellers ist inaktiv/deaktiviert. Der Schlüssel kann erst nach Reaktivierung des Erstellers fortgesetzt werden.
                            </span>
                          ) : (
                            <span>
                              <strong>Schlüssel ist deaktiviert:</strong> Eingehende API-Anfragen mit diesem Schlüssel werden abgewiesen. Klicken Sie auf „Aktivieren“, um den Zugriff wieder freizuschalten.
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Metadata Grid: Creator, Approver, Usage & Permissions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-muted/20 border border-border/40 rounded-lg p-3">
                      {/* Left: Antragsteller & Genehmigung */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium">Beantragt von:</span>
                          <span className="text-muted-foreground truncate">{creatorDisplayName}</span>
                          {k.ersteller_status && k.ersteller_status !== "aktiv" && (
                            <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 h-4 px-1.5">
                              {k.ersteller_status}
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground pl-5 text-[11px]">
                          Beantragt am: {new Date(k.erstellt_am).toLocaleDateString("de-DE")}
                        </div>

                        {k.genehmigt_am && (
                          <div className="flex items-center gap-1.5 text-foreground pt-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span className="font-medium">Genehmigt von:</span>
                            <span className="text-muted-foreground truncate">{approverDisplayName}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Verwendung & Gültigkeit */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium">Zuletzt aktiv:</span>
                          <span className="text-muted-foreground">
                            {k.last_used_at
                              ? new Date(k.last_used_at).toLocaleDateString("de-DE", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "Noch nie verwendet"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-foreground">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium">Gültig bis:</span>
                          <span className="text-muted-foreground">
                            {k.expires_at ? new Date(k.expires_at).toLocaleDateString("de-DE") : "Unbegrenzt gültig"}
                          </span>
                        </div>
                      </div>

                      {/* Full width: Permissions Summary */}
                      <div className="md:col-span-2 pt-2 border-t border-border/40">
                        <div className="flex items-center gap-1.5 text-foreground mb-1">
                          <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium">
                            {k.status === "ausstehend" ? "Angefragte Berechtigungen:" : "Aktive Berechtigungen:"}
                          </span>
                        </div>
                        {renderPermissionsSummary(k.status === "ausstehend" ? k.angefragte_berechtigungen : k.berechtigungen)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SettingsCard>
      </SettingsSection>

      {/* REQUEST MODAL */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>API-Schlüssel beantragen</DialogTitle>
            <DialogDescription>
              Wählen Sie den gewünschten Namen und die benötigten Berechtigungen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Name des Schlüssels</label>
              <Input
                placeholder="z. B. Buchhaltungs-Integration"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Umgebung</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as "live" | "test")}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                >
                  <option value="live">Live</option>
                  <option value="test">Test</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Ablaufdatum (optional)</label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold">Angefragte Berechtigungen</label>
              <div className="border border-border/60 rounded-lg p-3 space-y-3 bg-muted/20">
                {AVAILABLE_MODULES.map((mod) => (
                  <div key={mod.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <span className="font-medium w-32">{mod.label}</span>
                    <div className="flex items-center gap-4 flex-wrap">
                      {AVAILABLE_ACTIONS.map((act) => {
                        const isChecked = !!selectedModules[mod.id]?.[act.id];
                        return (
                          <label key={act.id} className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(val) => {
                                setSelectedModules((prev) => ({
                                  ...prev,
                                  [mod.id]: {
                                    ...(prev[mod.id] || {}),
                                    [act.id]: !!val,
                                  },
                                }));
                              }}
                            />
                            <span>{act.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestModalOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleRequestKey} disabled={submitting}>
              {submitting ? "Beantrage..." : "Antrag absenden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* APPROVE MODAL */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>API-Schlüssel genehmigen</DialogTitle>
            <DialogDescription>
              Prüfen und passen Sie den finalen Berechtigungsumfang für „{selectedKeyForApproval?.name}“ an.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs flex items-start gap-2.5 text-blue-700 dark:text-blue-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Hinweis zur Sicherheitsbegrenzung:</strong> Die gespeicherten Rechte werden serverseitig automatisch auf die effektiven Berechtigungen des Antragstellers begrenzt.
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Finaler Berechtigungsumfang</label>
              <div className="border border-border/60 rounded-lg p-3 space-y-3 bg-muted/20">
                {AVAILABLE_MODULES.map((mod) => (
                  <div key={mod.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <span className="font-medium w-32">{mod.label}</span>
                    <div className="flex items-center gap-4 flex-wrap">
                      {AVAILABLE_ACTIONS.map((act) => {
                        const isChecked = !!approvalPermissions[mod.id]?.[act.id];
                        return (
                          <label key={act.id} className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(val) => {
                                setApprovalPermissions((prev) => ({
                                  ...prev,
                                  [mod.id]: {
                                    ...(prev[mod.id] || {}),
                                    [act.id]: !!val,
                                  },
                                }));
                              }}
                            />
                            <span>{act.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveModalOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleApproveKey} disabled={submitting}>
              {submitting ? "Genehmige..." : "Genehmigen & Secret generieren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ONE-TIME SECRET MODAL */}
      <Dialog open={secretModalOpen} onOpenChange={setSecretModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              API-Key erfolgreich genehmigt!
            </DialogTitle>
            <DialogDescription>
              Der Schlüssel wurde erstellt. Bitte kopieren Sie den Secret-Key jetzt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold">Wichtig: Einmalige Anzeige!</p>
                <p className="mt-0.5">
                  Dieser Schlüssel wird aus Sicherheitsgründen <strong>nur dieses eine Mal</strong> im Klartext angezeigt und nirgends in der Datenbank gespeichert.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Ihr API-Secret:</label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={revealedSecret || ""}
                  className="font-mono text-xs bg-muted/60 select-all"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="shrink-0 gap-1.5"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Kopiert" : "Kopieren"}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setSecretModalOpen(false);
                setRevealedSecret(null);
              }}
            >
              Ich habe den Schlüssel gespeichert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
