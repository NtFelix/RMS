"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { setOrganisationMcpAccessAction } from "@/app/organisation-actions";

export interface OrganisationMcpAccessCardProps {
  hasVerwaltenPermission: boolean;
  organisationId?: string;
  initialMcpZugriffAktiviert?: boolean;
}

export function OrganisationMcpAccessCard({
  hasVerwaltenPermission,
  organisationId,
  initialMcpZugriffAktiviert = true,
}: OrganisationMcpAccessCardProps) {
  const [mcpEnabled, setMcpEnabled] = useState<boolean>(initialMcpZugriffAktiviert);
  const [isMcpUpdating, setIsMcpUpdating] = useState<boolean>(false);

  const handleToggleMcpAccess = async (checked: boolean) => {
    if (!organisationId || !hasVerwaltenPermission) return;

    const previousState = mcpEnabled;
    setMcpEnabled(checked);
    setIsMcpUpdating(true);

    try {
      const result = await setOrganisationMcpAccessAction(organisationId, checked);
      if (!result.success) {
        setMcpEnabled(previousState);
        toast({
          title: "Fehler beim Aktualisieren",
          description: result.error?.message || "MCP Server Zugriff konnte nicht aktualisiert werden.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "MCP Server Zugriff aktualisiert",
          description: checked
            ? "MCP Server Zugriff für diese Organisation wurde aktiviert."
            : "MCP Server Zugriff für diese Organisation wurde deaktiviert.",
          variant: "success",
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Es gab ein Problem beim Aktualisieren des MCP Server Zugriffs.";
      setMcpEnabled(previousState);
      toast({
        title: "Fehler beim Aktualisieren",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsMcpUpdating(false);
    }
  };

  return (
    <Card className="rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 shadow-xs bg-card/60 backdrop-blur-xs overflow-hidden">
      <CardContent className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          <div className="size-11 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 mt-0.5 border border-primary/20 text-primary">
            <Bot className="size-6" />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
                MCP Server Zugriff (Model Context Protocol)
              </h3>
              <Badge
                variant={mcpEnabled ? "default" : "destructive"}
                className={cn(
                  "rounded-full text-[11px] font-semibold px-2.5 py-0.5",
                  mcpEnabled
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                )}
              >
                {mcpEnabled ? "Aktiviert" : "Deaktiviert"}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Ermöglicht autorisierten KI-Assistenten (z. B. Claude, ChatGPT, Cursor) den Lese- und Schreibzugriff auf Daten dieser Organisation über das standardisierte Mietevo MCP Protokoll.
            </p>
            {!hasVerwaltenPermission && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Nur Administratoren und Eigentümer können den MCP Server Zugriff verwalten.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <Switch
            id="mcp-server-access-switch"
            aria-label="MCP Server Zugriff umschalten"
            checked={mcpEnabled}
            onCheckedChange={handleToggleMcpAccess}
            disabled={!hasVerwaltenPermission || isMcpUpdating || !organisationId}
          />
        </div>
      </CardContent>
    </Card>
  );
}
