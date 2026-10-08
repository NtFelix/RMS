'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: 'in_warteschlange' | 'laufend' | 'abgeschlossen' | 'fehler' | 'zeitueberschreitung' | string;
}

export function AgentRunStatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'abgeschlossen':
      return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Abgeschlossen</Badge>;
    case 'laufend':
      return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 animate-pulse">Laufend</Badge>;
    case 'in_warteschlange':
      return <Badge variant="outline" className="text-muted-foreground">In Warteschlange</Badge>;
    case 'fehler':
      return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30">Fehler</Badge>;
    case 'zeitueberschreitung':
      return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">Zeitüberschreitung</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}
