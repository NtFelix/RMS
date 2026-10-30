'use client';

import React, { useState, useEffect } from 'react';
import { AgentRunList, RunSummary } from './AgentRunList';
import { AgentRunDetail, RunDetails } from './AgentRunDetail';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AgentResultsViewProps {
  initialAgentId?: string | null;
}

export function AgentResultsView({ initialAgentId }: AgentResultsViewProps) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(initialAgentId || null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRunDetails, setSelectedRunDetails] = useState<RunDetails | null>(null);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Fetch agent list for filter dropdown
  useEffect(() => {
    let active = true;
    async function loadAgents() {
      try {
        const res = await fetch('/api/agents');
        if (res.ok && active) {
          const data = await res.json();
          setAgents(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) console.error('Failed to fetch agents:', err);
      }
    }
    loadAgents();
    return () => {
      active = false;
    };
  }, []);

  // Fetch runs when agent or status filter changes
  useEffect(() => {
    let active = true;
    async function fetchRuns() {
      try {
        if (active) setIsLoadingRuns(true);
        const params = new URLSearchParams();
        if (selectedAgentId) params.set('agent_id', selectedAgentId);
        if (statusFilter) params.set('status', statusFilter);

        const res = await fetch(`/api/agents/runs?${params.toString()}`);
        if (res.ok && active) {
          const data = await res.json();
          const runArray = Array.isArray(data) ? data : [];
          setRuns(runArray);
          if (runArray.length > 0 && !selectedRunId) {
            setSelectedRunId(runArray[0].id);
          }
        }
      } catch (err) {
        if (active) console.error('Failed to fetch runs:', err);
      } finally {
        if (active) setIsLoadingRuns(false);
      }
    }
    fetchRuns();
    return () => {
      active = false;
    };
  }, [selectedAgentId, statusFilter]);

  // Fetch run details when selectedRunId changes
  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRunDetails(null);
      return;
    }

    let active = true;
    async function fetchRunDetails() {
      try {
        if (active) setIsLoadingDetails(true);
        const res = await fetch(`/api/agents/runs/${selectedRunId}`);
        if (res.ok && active) {
          const data = await res.json();
          setSelectedRunDetails(data);
        }
      } catch (err) {
        if (active) console.error('Failed to fetch run details:', err);
      } finally {
        if (active) setIsLoadingDetails(false);
      }
    }
    fetchRunDetails();
    return () => {
      active = false;
    };
  }, [selectedRunId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Agent Ausführungsergebnisse</h2>
          <p className="text-sm text-muted-foreground">
            Ergebnisse, Log-Meldungen und Nachrichtenverläufe von Chat- und Hintergrund-Agenten einsehen.
          </p>
        </div>

        <div className="w-full sm:w-auto flex items-center gap-3">
          <Select
            value={selectedAgentId || 'all'}
            onValueChange={(val) => setSelectedAgentId(val === 'all' ? null : val)}
          >
            <SelectTrigger className="w-[200px] text-xs">
              <SelectValue placeholder="Alle Agenten" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Agenten</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.icon || '🤖'} {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <AgentRunList
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectRun={setSelectedRunId}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            isLoading={isLoadingRuns}
          />
        </div>

        <div className="lg:col-span-8">
          <AgentRunDetail
            runDetails={selectedRunDetails}
            isLoading={isLoadingDetails}
          />
        </div>
      </div>
    </div>
  );
}
