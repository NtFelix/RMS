'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Edit3, Trash2 } from 'lucide-react';

export interface AgentItem {
  id: string;
  name: string;
  beschreibung?: string;
  icon?: string;
  status: 'entwurf' | 'aktiv' | 'pausiert';
  trigger?: { type: string; config?: Record<string, any> };
  erstellt_am?: string;
}

interface AgentCardProps {
  agent: AgentItem;
  onEdit: (agent: AgentItem) => void;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
  isTriggering?: boolean;
}

export function AgentCard({ agent, onEdit, onDelete, onRun, isTriggering }: AgentCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aktiv':
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Aktiv</Badge>;
      case 'pausiert':
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">Pausiert</Badge>;
      case 'entwurf':
      default:
        return <Badge variant="secondary">Entwurf</Badge>;
    }
  };

  return (
    <Card className="flex flex-col justify-between hover:shadow-md transition-shadow bg-card border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 rounded-lg bg-accent/50 flex items-center justify-center w-10 h-10">
              {agent.icon || '🤖'}
            </span>
            <div>
              <CardTitle className="text-base font-semibold truncate max-w-[180px]">{agent.name}</CardTitle>
              <div className="mt-1">{getStatusBadge(agent.status)}</div>
            </div>
          </div>
        </div>
        {agent.beschreibung && (
          <CardDescription className="text-xs line-clamp-2 mt-2 leading-relaxed">
            {agent.beschreibung}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pb-3 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center justify-between">
          <span>Trigger-Typ:</span>
          <span className="font-medium text-foreground capitalize">{agent.trigger?.type || 'Manuell'}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t flex items-center justify-between gap-2 bg-muted/20">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onRun(agent.id)}
          disabled={agent.status !== 'aktiv' || isTriggering}
          className="gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
        >
          <Play className="w-3.5 h-3.5 fill-current" /> Ausführen
        </Button>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => onEdit(agent)}
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
          >
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => onDelete(agent.id)}
            className="w-8 h-8 text-destructive/80 hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
