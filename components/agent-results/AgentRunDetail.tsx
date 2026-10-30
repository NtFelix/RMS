'use client';

import React from 'react';
import { AgentRunStatusBadge } from './AgentRunStatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Clock, Cpu, AlertTriangle, FileText } from 'lucide-react';

export interface RunDetails {
  id: string;
  agent_id?: string;
  status: string;
  ausfuehrungs_typ: string;
  auth_mode: string;
  gestartet_am?: string;
  beendet_am?: string;
  ergebnis?: any;
  fehler_meldung?: string;
  konversation_id?: string;
  container_instanz?: string;
  nachrichten?: Array<{
    id: string;
    rolle: 'user' | 'assistant' | 'system';
    inhalt: string;
    status?: string;
    token_anzahl?: number;
    latenz_ms?: number;
    erstellt_am?: string;
  }>;
}

interface AgentRunDetailProps {
  runDetails: RunDetails | null;
  isLoading?: boolean;
}

export function AgentRunDetail({ runDetails, isLoading }: AgentRunDetailProps) {
  if (isLoading) {
    return (
      <div className="p-8 border rounded-lg animate-pulse bg-muted/20 text-center text-xs text-muted-foreground">
        Lade Ausführungsdetails...
      </div>
    );
  }

  if (!runDetails) {
    return (
      <div className="p-12 border rounded-lg text-center bg-card">
        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-foreground">Keine Ausführung ausgewählt</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Wähle eine Agenten-Ausführung aus der linken Liste, um Details und Nachrichtenverlauf zu sehen.
        </p>
      </div>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('de-DE');
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="bg-card border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold font-mono">Run ID: {runDetails.id.slice(0, 8)}...</CardTitle>
            <AgentRunStatusBadge status={runDetails.status} />
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Ausführungstyp</span>
            <span className="font-medium text-foreground">{runDetails.ausfuehrungs_typ}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Auth Mode</span>
            <span className="font-medium text-foreground capitalize">{runDetails.auth_mode}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Gestartet am</span>
            <span className="font-medium text-foreground flex items-center gap-1">
              <Clock className="w-3 h-3 text-muted-foreground" /> {formatDate(runDetails.gestartet_am)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Container Instanz</span>
            <span className="font-medium text-foreground flex items-center gap-1 truncate">
              <Cpu className="w-3 h-3 text-muted-foreground" /> {runDetails.container_instanz || 'Local / Edge'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Error block if any */}
      {runDetails.fehler_meldung && (
        <div className="p-4 border border-destructive/40 rounded-lg bg-destructive/10 text-destructive text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-1">Fehler aufgetreten:</span>
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{runDetails.fehler_meldung}</pre>
          </div>
        </div>
      )}

      {/* Structured Result if any */}
      {runDetails.ergebnis && (
        <Card className="bg-card border">
          <CardHeader className="py-2.5 px-4 border-b">
            <CardTitle className="text-xs font-semibold">Ausführungsergebnis (JSON)</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <pre className="p-3 rounded bg-muted font-mono text-[11px] overflow-x-auto">
              {JSON.stringify(runDetails.ergebnis, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Message History timeline */}
      {runDetails.nachrichten && runDetails.nachrichten.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nachrichten-Verlauf</h4>
          <div className="space-y-3">
            {runDetails.nachrichten.map((msg) => (
              <div
                key={msg.id}
                className={`p-3.5 border rounded-lg text-xs leading-relaxed ${
                  msg.rolle === 'assistant'
                    ? 'bg-primary/5 border-primary/20 ml-4'
                    : msg.rolle === 'system'
                    ? 'bg-muted/40 border-muted italic'
                    : 'bg-card border-border mr-4'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 font-medium text-[11px] text-muted-foreground">
                  <span className="capitalize">{msg.rolle}</span>
                  <div className="flex items-center gap-2 font-mono">
                    {msg.token_anzahl !== undefined && <span>{msg.token_anzahl} tokens</span>}
                    {msg.latenz_ms !== undefined && <span>{msg.latenz_ms}ms</span>}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-foreground font-sans">{msg.inhalt}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
