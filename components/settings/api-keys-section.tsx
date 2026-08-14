"use client";

import { useState, useEffect, useCallback } from "react";
import { Key, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SettingsSection } from "@/components/settings/shared";
import { ApiKeyItem } from "./api-keys/types";
import { ApiKeyCard } from "./api-keys/api-key-card";
import { ApiKeyRequestDialog } from "./api-keys/api-key-request-dialog";
import { ApiKeyApproveDialog } from "./api-keys/api-key-approve-dialog";
import { ApiKeySecretDialog } from "./api-keys/api-key-secret-dialog";

export default function ApiKeysSection() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [secretModalOpen, setSecretModalOpen] = useState(false);

  // Approval & secret payload state
  const [selectedKeyForApproval, setSelectedKeyForApproval] = useState<ApiKeyItem | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/einstellungen/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(Array.isArray(data) ? data : []);
      } else {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Fehler beim Laden der API-Keys.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler beim Laden der API-Keys.";
      toast({
        title: "Fehler beim Laden",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleApproveClick = (keyItem: ApiKeyItem) => {
    setSelectedKeyForApproval(keyItem);
    setApproveModalOpen(true);
  };

  const handleApproveSuccess = (plaintextSecret: string) => {
    setRevealedSecret(plaintextSecret);
    setSecretModalOpen(true);
    fetchKeys();
  };

  const runAction = async (url: string, method: "POST" | "DELETE", title: string, description: string) => {
    try {
      const res = await fetch(url, { method });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Fehler bei der Aktion.");
      }
      toast({ title, description });
      fetchKeys();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler beim Ausführen.";
      toast({ title: "Fehler", description: msg, variant: "destructive" });
    }
  };

  const handleRejectKey = (id: string) =>
    runAction(`/api/einstellungen/api-keys/${id}/ablehnen`, "POST", "Abgelehnt", "API-Key wurde abgelehnt.");

  const handleRevokeKey = (id: string) =>
    runAction(`/api/einstellungen/api-keys/${id}/widerrufen`, "POST", "Widerrufen", "API-Key wurde widerrufen.");

  const handlePauseKey = (id: string) =>
    runAction(
      `/api/einstellungen/api-keys/${id}/pausieren`,
      "POST",
      "Deaktiviert",
      "API-Key wurde erfolgreich pausiert/deaktiviert."
    );

  const handleResumeKey = (id: string) =>
    runAction(`/api/einstellungen/api-keys/${id}/fortsetzen`, "POST", "Aktiviert", "API-Key wurde erfolgreich fortgesetzt.");

  const handleDeleteKey = (id: string) =>
    runAction(`/api/einstellungen/api-keys/${id}`, "DELETE", "Gelöscht", "API-Key wurde gelöscht.");

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
            <Button onClick={() => setRequestModalOpen(true)} className="gap-2 shrink-0">
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
              {keys.map((k) => (
                <ApiKeyCard
                  key={k.id}
                  apiKey={k}
                  onApprove={handleApproveClick}
                  onReject={handleRejectKey}
                  onPause={handlePauseKey}
                  onResume={handleResumeKey}
                  onRevoke={handleRevokeKey}
                  onDelete={handleDeleteKey}
                />
              ))}
            </div>
          )}
        </SettingsCard>
      </SettingsSection>

      <ApiKeyRequestDialog
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        onSuccess={fetchKeys}
      />

      <ApiKeyApproveDialog
        open={approveModalOpen}
        onOpenChange={setApproveModalOpen}
        keyItem={selectedKeyForApproval}
        onSuccess={handleApproveSuccess}
      />

      <ApiKeySecretDialog
        open={secretModalOpen}
        onOpenChange={setSecretModalOpen}
        secret={revealedSecret}
      />
    </div>
  );
}
