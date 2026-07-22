'use client';

import React from 'react';
import { AgentRunStatusBadge } from './AgentRunStatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface RunSummary {
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
}

interface AgentRunListProps {
  runs: RunSummary[];
  selectedRunId?: string | null;
  onSelectRun: (id: string) => void;
  statusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
  isLoading?: boolean;
}

export function AgentRunList({
  runs = [],
  selectedRunId,
  onSelectRun,
  statusFilter,
  onStatusFilterChange,
  isLoading,
}: AgentRunListProps) {
  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return '-';
    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm text-foreground">Ausführungshistorie</h3>
        <Select
          value={statusFilter || 'all'}
          onValueChange={(val) => onStatusFilterChange(val === 'all' ? null : val)}
        >
          <SelectTrigger className="w-[140px] text-xs h-8">
            <SelectValue placeholder="Alle Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
            <SelectItem value="laufend">Laufend</SelectItem>
            <SelectItem value="in_warteschlange">Warteschlange</SelectItem>
            <SelectItem value="fehler">Fehler</SelectItem>
            <SelectItem value="zeitueberschreitung">Timeouts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 border rounded-lg animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="p-8 border rounded-lg text-center text-xs text-muted-foreground bg-muted/10">
          Keine Agent-Ausführungen gefunden.
        </div>
      ) : (
        <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
          {runs.map((run) => {
            const isSelected = run.id === selectedRunId;
            return (
              <div
                key={run.id}
                onClick={() => onSelectRun(run.id)}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  isSelected ? 'bg-accent/60 border-primary ring-1 ring-primary' : 'bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <AgentRunStatusBadge status={run.status} />
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {calculateDuration(run.gestartet_am, run.beendet_am)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span className="truncate">Modus: {run.auth_mode}</span>
                  <span className="text-[11px]">{formatDate(run.gestartet_am)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
