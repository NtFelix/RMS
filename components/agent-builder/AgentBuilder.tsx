'use client';

import React, { useState, useEffect } from 'react';
import { AgentBuilderNavigation } from './AgentBuilderNavigation';
import { Step1BasicInfo } from './steps/Step1BasicInfo';
import { Step2Instructions } from './steps/Step2Instructions';
import { Step3Permissions, AgentBerechtigungen } from './steps/Step3Permissions';
import { Step4Trigger, AgentTrigger } from './steps/Step4Trigger';
import { Step5Actions, AgentAction } from './steps/Step5Actions';
import { Step6NotifyChannels, NotifyChannel } from './steps/Step6NotifyChannels';
import { Step7Access } from './steps/Step7Access';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AgentBuilderProps {
  agentId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AgentBuilder({ agentId, onClose, onSuccess }: AgentBuilderProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [name, setName] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [icon, setIcon] = useState('🤖');
  const [anweisungen, setAnweisungen] = useState('');
  const [berechtigungen, setBerechtigungen] = useState<AgentBerechtigungen>({ module: {}, objekte: { haeuser: null } });
  const [trigger, setTrigger] = useState<AgentTrigger>({ type: 'manual', config: {} });
  const [aktionen, setAktionen] = useState<AgentAction[]>([]);
  const [benachrichtigungsKanaele, setBenachrichtigungsKanaele] = useState<NotifyChannel[]>([]);
  const [accessRights, setAccessRights] = useState<Record<string, 'view' | 'manage' | 'results_only' | 'none'>>({});
  const [mitglieder, setMitglieder] = useState<any[]>([]);
  const [haeuser, setHaeuser] = useState<any[]>([]);

  // Load existing agent details if editing
  useEffect(() => {
    async function loadData() {
      try {
        if (agentId) {
          setIsLoadingDetails(true);
          const res = await fetch(`/api/agents/${agentId}`);
          if (res.ok) {
            const data = await res.json();
            setName(data.name || '');
            setBeschreibung(data.beschreibung || '');
            setIcon(data.icon || '🤖');
            setAnweisungen(data.anweisungen || '');
            if (data.trigger) setTrigger(data.trigger);
            if (data.aktionen) setAktionen(data.aktionen);
            if (data.benachrichtigungs_kanaele) setBenachrichtigungsKanaele(data.benachrichtigungs_kanaele);
          }
        }

        // Fetch organization members for step 7
        const membersRes = await fetch('/api/organisation/mitglieder');
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMitglieder(Array.isArray(membersData) ? membersData : []);
        }

        // Fetch houses for step 3
        const housesRes = await fetch('/api/haeuser');
        if (housesRes.ok) {
          const housesData = await housesRes.json();
          setHaeuser(Array.isArray(housesData) ? housesData : []);
        }
      } catch (err) {
        console.error('Failed to load agent/org details:', err);
      } finally {
        setIsLoadingDetails(false);
      }
    }
    loadData();
  }, [agentId]);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return anweisungen.trim().length > 0;
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < 7) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSave = async () => {
    if (!canProceed()) return;

    try {
      setIsSaving(true);
      const payload = {
        name,
        beschreibung,
        icon,
        anweisungen,
        trigger,
        aktionen,
        benachrichtigungs_kanaele: benachrichtigungsKanaele,
        berechtigungen,
      };

      const url = agentId ? `/api/agents/${agentId}` : '/api/agents';
      const method = agentId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Fehler beim Speichern des Agenten');
      }

      const savedData = await res.json();
      const targetAgentId = agentId || savedData.id;

      // Save access rights if any specified
      if (targetAgentId && Object.keys(accessRights).length > 0) {
        for (const [mitgliedId, level] of Object.entries(accessRights)) {
          if (level !== 'none') {
            await fetch(`/api/agents/${targetAgentId}/access`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mitgliedId, zugriffsLevel: level }),
            });
          }
        }
      }

      toast({
        title: agentId ? 'Agent aktualisiert' : 'Agent erstellt',
        description: `Der KI-Agent "${name}" wurde erfolgreich gespeichert.`,
      });

      onSuccess();
    } catch (err: any) {
      toast({
        title: 'Fehler',
        description: err?.message || String(err),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingDetails) {
    return (
      <div className="p-8 text-center border rounded-lg bg-card">
        <p className="text-sm text-muted-foreground animate-pulse">Lade Agenten-Details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} className="gap-2 text-xs">
          <ArrowLeft className="w-4 h-4" /> Zurück zur Übersicht
        </Button>
        <span className="text-xs font-semibold text-muted-foreground">Schritt {currentStep} von 7</span>
      </div>

      <div className="border rounded-xl p-6 bg-card shadow-sm space-y-6">
        {currentStep === 1 && (
          <Step1BasicInfo
            name={name}
            beschreibung={beschreibung}
            icon={icon}
            onChange={(u) => {
              if (u.name !== undefined) setName(u.name);
              if (u.beschreibung !== undefined) setBeschreibung(u.beschreibung);
              if (u.icon !== undefined) setIcon(u.icon);
            }}
          />
        )}

        {currentStep === 2 && (
          <Step2Instructions
            anweisungen={anweisungen}
            onChange={setAnweisungen}
          />
        )}

        {currentStep === 3 && (
          <Step3Permissions
            berechtigungen={berechtigungen}
            onChange={setBerechtigungen}
            haeuser={haeuser}
          />
        )}

        {currentStep === 4 && (
          <Step4Trigger
            trigger={trigger}
            onChange={setTrigger}
          />
        )}

        {currentStep === 5 && (
          <Step5Actions
            aktionen={aktionen}
            onChange={setAktionen}
          />
        )}

        {currentStep === 6 && (
          <Step6NotifyChannels
            benachrichtigungsKanaele={benachrichtigungsKanaele}
            onChange={setBenachrichtigungsKanaele}
          />
        )}

        {currentStep === 7 && (
          <Step7Access
            accessRights={accessRights}
            onChange={setAccessRights}
            mitglieder={mitglieder}
          />
        )}

        <AgentBuilderNavigation
          currentStep={currentStep}
          totalSteps={7}
          onNext={handleNext}
          onPrev={handlePrev}
          onSave={handleSave}
          isSaving={isSaving}
          canProceed={canProceed()}
        />
      </div>
    </div>
  );
}
