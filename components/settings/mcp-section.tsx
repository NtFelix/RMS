"use client";

import { useState } from "react";
import {
  Bot,
  Shield,
  AlertTriangle,
  Lock,
  Copy,
  Check,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SettingsCard, SettingsSection } from "@/components/settings/shared";
import { setOrganisationMcpAccessAction } from "@/app/organisation-actions";

export interface McpSectionProps {
  organisationId?: string;
  organisationName?: string;
  initialMcpZugriffAktiviert?: boolean;
  hasVerwaltenPermission?: boolean;
}

const MCP_SERVER_URL = "https://mcp.mietevo.de/mcp";

export default function McpSection({
  organisationId,
  organisationName,
  initialMcpZugriffAktiviert = true,
  hasVerwaltenPermission = false,
}: McpSectionProps) {
  const [mcpEnabled, setMcpEnabled] = useState<boolean>(initialMcpZugriffAktiviert);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(MCP_SERVER_URL);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      toast({
        title: "Kopiert",
        description: "MCP Server URL wurde in die Zwischenablage kopiert.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Fehler beim Kopieren",
        description: "Konnte URL nicht kopieren.",
        variant: "destructive",
      });
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (!organisationId || !hasVerwaltenPermission) return;

    const previous = mcpEnabled;
    setMcpEnabled(checked);
    setIsUpdating(true);

    try {
      const res = await setOrganisationMcpAccessAction(organisationId, checked);
      if (!res.success) {
        setMcpEnabled(previous);
        toast({
          title: "Fehler beim Aktualisieren",
          description: res.error?.message || "MCP Server Zugriff konnte nicht geändert werden.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Einstellung gespeichert",
          description: checked
            ? `MCP Server Zugriff für "${organisationName || "diese Organisation"}" wurde aktiviert.`
            : `MCP Server Zugriff für "${organisationName || "diese Organisation"}" wurde deaktiviert.`,
          variant: "success",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Es gab ein Problem beim Aktualisieren.";
      setMcpEnabled(previous);
      toast({
        title: "Fehler beim Aktualisieren",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Model Context Protocol (MCP)"
        description="Steuern Sie den Zugriff von externen KI-Assistenten (z. B. Claude, Cursor, ChatGPT) auf die Daten dieser Organisation."
      >
        <SettingsCard>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary mt-0.5 border border-primary/20 shrink-0">
                  <Bot className="size-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold tracking-tight text-foreground">
                    MCP Server Zugriff für {organisationName || "Organisation"}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Wenn aktiviert, können autorisierte KI-Assistenten über OAuth 2.0 PKCE und das Mietevo MCP Protokoll auf Immobilien-, Mieter- und Finanzdaten zugreifen.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <Switch
                  id="mcp-access-switch"
                  aria-label="MCP Server Zugriff umschalten"
                  checked={mcpEnabled}
                  onCheckedChange={handleToggle}
                  disabled={!hasVerwaltenPermission || isUpdating || !organisationId}
                />
              </div>
            </div>

            {!hasVerwaltenPermission && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-medium">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Nur Administratoren und Eigentümer können den MCP Server Zugriff dieser Organisation verwalten.</span>
              </div>
            )}
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Verbindungsinformationen & Sicherheit"
        description="Technische Details zur Anbindung von MCP-kompatiblen Clients."
      >
        <SettingsCard>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                MCP Server Endpunkt (SSE / HTTP)
              </label>
              <div className="flex items-center gap-2 max-w-xl">
                <div className="flex-1 h-9 rounded-lg bg-muted/60 border border-border/50 px-3 flex items-center font-mono text-xs text-foreground overflow-x-auto select-all">
                  {MCP_SERVER_URL}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="h-9 px-3 shrink-0 rounded-lg gap-1.5"
                >
                  {copiedUrl ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  <span>{copiedUrl ? "Kopiert" : "Kopieren"}</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-card/60 border border-border/50 space-y-1.5">
                <div className="flex items-center gap-2 text-primary font-medium text-sm">
                  <Shield className="size-4" />
                  <span>Granulare Scopes & Autorisierung</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Beim ersten Verbindungsaufbau entscheiden Sie im OAuth-Consent-Screen exakt, welche Module (z. B. nur Immobilien oder auch Mieter) und Organisationen freigegeben werden.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card/60 border border-border/50 space-y-1.5">
                <div className="flex items-center gap-2 text-primary font-medium text-sm">
                  <Lock className="size-4" />
                  <span>Audit-Log & Schutz vor Datenverlust</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Jede Lese- und Schreibaktion über den MCP-Server wird lückenlos im Audit-Log der Organisation aufgezeichnet und unterliegt den Rollen- und Objektberechtigungen.
                </p>
              </div>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  );
}
