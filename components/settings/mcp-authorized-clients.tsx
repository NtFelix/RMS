"use client";

import { useState } from "react";
import Image from "next/image";
import { Bot, Trash2, Clock, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { SettingsCard, SettingsSection } from "@/components/settings/shared";
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

export interface McpAuthorizedClientsProps {
  initialAuthorizations?: UserMcpAuthorizationRecord[];
}

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
      <Image
        src={src}
        alt={name}
        width={40}
        height={40}
        unoptimized
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

const EMPTY_AUTHORIZATIONS: UserMcpAuthorizationRecord[] = [];

export function McpAuthorizedClientsCard({
  initialAuthorizations = EMPTY_AUTHORIZATIONS,
}: McpAuthorizedClientsProps) {
  const [authorizations, setAuthorizations] = useState<UserMcpAuthorizationRecord[]>(initialAuthorizations);
  const [revokingClientId, setRevokingClientId] = useState<string | null>(null);

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
  );
}
