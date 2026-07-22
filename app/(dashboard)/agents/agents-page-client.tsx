'use client';

import React, { useState, useEffect } from 'react';
import { AgentList } from '@/components/agent-builder/AgentList';
import { AgentBuilder } from '@/components/agent-builder/AgentBuilder';
import { AgentItem } from '@/components/agent-builder/AgentCard';
import { useToast } from '@/hooks/use-toast';

export function AgentsPageClient() {
  const { toast } = useToast();
  const [mode, setMode] = useState<'list' | 'builder'>('list');
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreateNew = () => {
    setEditingAgentId(null);
    setMode('builder');
  };

  const handleEdit = (agent: AgentItem) => {
    setEditingAgentId(agent.id);
    setMode('builder');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchtest du diesen Agenten wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Fehler beim Löschen');
      }
      toast({
        title: 'Agent gelöscht',
        description: 'Der Agent wurde pausiert und in den Papierkorb verschoben.',
      });
      fetchAgents();
    } catch (err: any) {
      toast({
        title: 'Fehler',
        description: err?.message || String(err),
        variant: 'destructive',
      });
    }
  };

  const handleRun = async (id: string) => {
    try {
      const res = await fetch(`/api/agents/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'manual' }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Fehler beim Starten des Agenten');
      }

      const data = await res.json();
      toast({
        title: 'Agent gestartet',
        description: `Run-ID: ${data.runId}. Du kannst den Status in der Results View verfolgen.`,
      });
    } catch (err: any) {
      toast({
        title: 'Fehler beim Ausführen',
        description: err?.message || String(err),
        variant: 'destructive',
      });
    }
  };

  if (mode === 'builder') {
    return (
      <div className="p-8">
        <AgentBuilder
          agentId={editingAgentId}
          onClose={() => setMode('list')}
          onSuccess={() => {
            setMode('list');
            fetchAgents();
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <AgentList
        agents={agents}
        onCreateNew={handleCreateNew}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRun={handleRun}
        isLoading={isLoading}
      />
    </div>
  );
}
