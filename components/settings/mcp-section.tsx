"use client";

import { useState } from "react";
import {
  Bot,
  Shield,
  AlertTriangle,
  Lock,
  Copy,
  Check,
  Trash2,
  Clock,
  Globe,
  Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { SettingsCard, SettingsSection } from "@/components/settings/shared";
import { setOrganisationMcpAccessAction } from "@/app/organisation-actions";
import {
  revokeUserMcpAuthorizationAction,
  type UserMcpAuthorizationRecord,
} from "@/app/oauth/consent/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export interface McpSectionProps {
  organisationId?: string;
  organisationName?: string;
  initialMcpZugriffAktiviert?: boolean;
  initialAuthorizations?: UserMcpAuthorizationRecord[];
  hasVerwaltenPermission?: boolean;
}

// MCP endpoint URL — env-configurable, /mcp path appended (base URL has no path)
const MCP_SERVER_URL = `${process.env.NEXT_PUBLIC_MIETEVO_MCP_URL || "https://mcp.mietevo.de"}/mcp`;

function ClientLogo({ src, name }: { src?: string | null; name: string }) {
  const [error, setError] = useState(false);
  const isSafeUrl = !!src && (/^https:\/\//i.test(src) || /^data:image\//i.test(src));

  if (!isSafeUrl || error) {
    return (
      <div className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
        <Bot className="size-5" />
      </div>
    );
  }

  return (
    <div className="size-10 rounded-xl bg-muted/40 border border-border/50 p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        onError={() => setError(true)}
        className="size-full object-contain"
      />
    </div>
  );
}

function formatLastUsed(dateString?: string | null): string {
  if (!dateString) return "Noch nie";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Unbekannt";
    return formatDistanceToNow(d, { addSuffix: true, locale: de });
  } catch {
    return "Unbekannt";
  }
}

function getHostFromUri(uri?: string | null): string | null {
  if (!uri) return null;
  try {
    const url = new URL(uri);
    return url.hostname;
  } catch {
    return uri;
  }
}

export default function McpSection({
  organisationId,
  organisationName,
  initialMcpZugriffAktiviert = true,
  initialAuthorizations = [],
  hasVerwaltenPermission = false,
}: McpSectionProps) {
  const [mcpEnabled, setMcpEnabled] = useState<boolean>(initialMcpZugriffAktiviert);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Authorized clients list
  const [authorizations, setAuthorizations] = useState<UserMcpAuthorizationRecord[]>(initialAuthorizations);
  const [revokingClientId, setRevokingClientId] = useState<string | null>(null);

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

  const handleRevoke = async (clientId: string, clientName: string) => {
    setRevokingClientId(clientId);
    try {
      const res = await revokeUserMcpAuthorizationAction(clientId);
      if (!res.success) {
        toast({
          title: "Fehler beim Widerrufen",
          description: res.error || "Zugriff konnte nicht widerrufen werden.",
          variant: "destructive",
        });
      } else {
        setAuthorizations((prev) => prev.filter((a) => a.client_id !== clientId));
        toast({
          title: "Zugriff widerrufen",
          description: `Der Zugriff für "${clientName}" wurde erfolgreich entfernt.`,
          variant: "success",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Es gab ein Problem beim Widerrufen.";
      toast({
        title: "Fehler beim Widerrufen",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setRevokingClientId(null);
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

      {/* Connected services / authorized MCP clients section */}
      <SettingsSection
        title="Verbundene Dienste & KI-Assistenten"
        description="Hier sehen Sie alle externen Anwendungen und Assistenten, denen Sie Zugriff auf Ihre Mietevo-Daten gewährt haben."
      >
        <SettingsCard>
          {authorizations.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <div className="mx-auto size-12 rounded-2xl bg-muted/60 border border-border/50 flex items-center justify-center text-muted-foreground">
                <Bot className="size-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h5 className="text-sm font-semibold text-foreground">
                  Keine aktiven Verbindungen
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sie haben noch keine externen KI-Assistenten (wie z. B. Notion, Claude oder Cursor) mit Ihrem Benutzerkonto verbunden.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {authorizations.map((auth) => {
                const displayName = auth.client_name || auth.client_id;
                const host = getHostFromUri(auth.redirect_uri);
                const isRevoking = revokingClientId === auth.client_id;

                const permissionLabel = auth.scopes?.all
                  ? "Vollzugriff"
                  : auth.scopes?.write === false
                  ? "Nur Lesen"
                  : "Lesen & Schreiben";

                const orgScopeLabel = auth.alle_erlaubt
                  ? "Alle Organisationen"
                  : `${auth.erlaubte_organisations_ids?.length || 0} Organisation(en)`;

                return (
                  <div
                    key={auth.id || auth.client_id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <ClientLogo src={auth.client_icon} name={displayName} />
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-sm font-semibold text-foreground truncate">
                            {displayName}
                          </h5>
                          <Badge variant="secondary" className="text-[11px] font-normal py-0 h-5">
                            {orgScopeLabel}
                          </Badge>
                          <Badge variant="outline" className="text-[11px] font-normal py-0 h-5">
                            {permissionLabel}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          {host && (
                            <span className="flex items-center gap-1 truncate max-w-xs">
                              <Globe className="size-3 shrink-0" />
                              <span className="truncate">{host}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 shrink-0" />
                            <span>Aktiv: {formatLastUsed(auth.zuletzt_verwendet_am)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isRevoking}
                            className="h-8 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 gap-1.5"
                          >
                            {isRevoking ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                            <span>Trennen</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Zugriff für &quot;{displayName}&quot; widerrufen?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Der Assistent verliert sofort den Zugriff auf Ihre Organisationen und Daten über das Model Context Protocol. Sie können die Verbindung jederzeit erneut herstellen.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRevoke(auth.client_id, displayName)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Verbindung trennen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Verbindungsinformationen & Sicherheit"
        description="Technische Details zur Anbindung von MCP-kompatiblen Clients."
      >
        <SettingsCard>
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                MCP Server Endpunkt (SSE / HTTP)
              </span>
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
