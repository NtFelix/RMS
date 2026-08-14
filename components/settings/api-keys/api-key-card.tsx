"use client";

import {
  Key,
  Trash2,
  XCircle,
  Play,
  Pause,
  AlertTriangle,
  Calendar,
  User,
  Shield,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ApiKeyItem,
  formatUserName,
  formatDateDeterministic,
  formatDateTimeDeterministic,
} from "./types";
import {
  renderStatusBadge,
  renderPermissionsSummary,
} from "./helpers";

interface ApiKeyCardProps {
  apiKey: ApiKeyItem;
  onApprove: (key: ApiKeyItem) => void;
  onReject: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRevoke: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ApiKeyCard({
  apiKey: k,
  onApprove,
  onReject,
  onPause,
  onResume,
  onRevoke,
  onDelete,
}: ApiKeyCardProps) {
  const creatorDisplayName = formatUserName(k.ersteller_first_name, k.ersteller_last_name, k.ersteller_email);
  const approverDisplayName = formatUserName(k.genehmigt_von_first_name, k.genehmigt_von_last_name, k.genehmigt_von_email);

  return (
    <div className="py-5 space-y-3">
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
                onClick={() => onApprove(k)}
                className="h-8 text-xs font-medium"
              >
                Genehmigen
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(k.id)}
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
              onClick={() => onPause(k.id)}
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
              onClick={() => onResume(k.id)}
              className="h-8 text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30"
            >
              <Play className="h-3.5 w-3.5" />
              Aktivieren
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label={`Aktionen für API-Schlüssel ${k.name}`}
              >
                •••
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(k.status === "aktiv" || k.status === "pausiert") && (
                <DropdownMenuItem
                  onClick={() => {
                    if (window.confirm(`Möchten Sie den API-Schlüssel "${k.name}" wirklich endgültig widerrufen? Dieser Vorgang kann nicht rückgängig gemacht werden.`)) {
                      onRevoke(k.id);
                    }
                  }}
                  className="text-destructive gap-2 cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                  Endgültig widerrufen
                </DropdownMenuItem>
              )}
              {(k.status === "abgelehnt" || k.status === "widerrufen") && (
                <DropdownMenuItem
                  onClick={() => {
                    if (window.confirm(`Möchten Sie den API-Schlüssel "${k.name}" wirklich löschen?`)) {
                      onDelete(k.id);
                    }
                  }}
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
            Beantragt am: {formatDateDeterministic(k.erstellt_am)}
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
                ? formatDateTimeDeterministic(k.last_used_at)
                : "Noch nie verwendet"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-foreground">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium">Gültig bis:</span>
            <span className="text-muted-foreground">
              {k.expires_at ? formatDateDeterministic(k.expires_at) : "Unbegrenzt gültig"}
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
}
