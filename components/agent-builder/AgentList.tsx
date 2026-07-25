'use client';

import React, { useState } from 'react';
import { AgentCard, AgentItem } from './AgentCard';
import { Button } from '@/components/ui/button';
import { Plus, Bot, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AgentListProps {
  agents: AgentItem[];
  onCreateNew: () => void;
  onEdit: (agent: AgentItem) => void;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
  isLoading?: boolean;
}

export function AgentList({
  agents = [],
  onCreateNew,
  onEdit,
  onDelete,
  onRun,
  isLoading,
}: AgentListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (agent.beschreibung && agent.beschreibung.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">KI-Agenten Overview</h2>
          <p className="text-sm text-muted-foreground">
            Verwalte erstelle Agenten, passe Auslöser an oder erstelle neue benutzerdefinierte Agenten.
          </p>
        </div>

        <Button type="button" onClick={onCreateNew} className="gap-2 text-xs">
          <Plus className="w-4 h-4" /> Neuer Agent
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Agenten suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 border rounded-lg animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border rounded-lg border-dashed bg-muted/10 text-center">
          <Bot className="w-12 h-12 text-muted-foreground mb-3" />
          <h3 className="text-base font-semibold text-foreground">Keine KI-Agenten gefunden</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            {searchTerm ? 'Es wurde kein Agent für deine Suchanfrage gefunden.' : 'Erstelle deinen ersten benutzerdefinierten Agenten mit dem 7-Schritt-Wizard.'}
          </p>
          {!searchTerm && (
            <Button type="button" size="sm" onClick={onCreateNew} className="gap-2 text-xs">
              <Plus className="w-4 h-4" /> Agenten Erstellen
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={onEdit}
              onDelete={onDelete}
              onRun={onRun}
            />
          ))}
        </div>
      )}
    </div>
  );
}
