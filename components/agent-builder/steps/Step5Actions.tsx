'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface AgentAction {
  type: string;
  config: Record<string, any>;
}

interface Step5Props {
  aktionen: AgentAction[];
  onChange: (aktionen: AgentAction[]) => void;
}

const AVAILABLE_ACTIONS = [
  { id: 'email', title: 'E-Mail senden', desc: 'Sendet automatisch gestaltete E-Mails' },
  { id: 'aufgabe', title: 'Aufgabe erstellen', desc: 'Erstellt neue Aufgaben im Aufgabenboard' },
  { id: 'webhook', title: 'Webhook aufrufen', desc: 'POST Request an ein externes System' },
];

export function Step5Actions({ aktionen = [], onChange }: Step5Props) {
  const isSelected = (actionId: string) => aktionen.some((a) => a.type === actionId);
  const getActionConfig = (actionId: string) => aktionen.find((a) => a.type === actionId)?.config || {};

  const toggleAction = (actionId: string) => {
    if (isSelected(actionId)) {
      onChange(aktionen.filter((a) => a.type !== actionId));
    } else {
      onChange([...aktionen, { type: actionId, config: {} }]);
    }
  };

  const updateActionConfig = (actionId: string, key: string, value: any) => {
    onChange(
      aktionen.map((a) => (a.type === actionId ? { ...a, config: { ...a.config, [key]: value } } : a))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Aktionen</h3>
        <p className="text-sm text-muted-foreground">
          Wähle aus, welche Folgeaktionen der Agent bei seiner Ausführung ausführen darf.
        </p>
      </div>

      <div className="space-y-4">
        {AVAILABLE_ACTIONS.map((action) => {
          const checked = isSelected(action.id);
          const config = getActionConfig(action.id);
          return (
            <div
              key={action.id}
              className={`border rounded-lg p-4 transition-colors ${
                checked ? 'bg-card border-primary/40' : 'bg-background hover:bg-muted/30'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleAction(action.id)}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium text-sm text-foreground">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.desc}</div>
                </div>
              </label>

              {checked && (
                <div className="mt-4 pt-3 border-t space-y-3 pl-7">
                  {action.id === 'email' && (
                    <div>
                      <Label className="text-xs">Standard-Empfänger (optional)</Label>
                      <Input
                        placeholder="team@beispiel.de"
                        value={config.recipient || ''}
                        onChange={(e) => updateActionConfig(action.id, 'recipient', e.target.value)}
                        className="mt-1 text-xs"
                      />
                    </div>
                  )}

                  {action.id === 'aufgabe' && (
                    <div>
                      <Label className="text-xs">Standard-Titel Präfix</Label>
                      <Input
                        placeholder="[Agent-Aufgabe]"
                        value={config.title_prefix || ''}
                        onChange={(e) => updateActionConfig(action.id, 'title_prefix', e.target.value)}
                        className="mt-1 text-xs"
                      />
                    </div>
                  )}

                  {action.id === 'webhook' && (
                    <div>
                      <Label className="text-xs">Ziel Webhook-URL</Label>
                      <Input
                        placeholder="https://api.beispiel.de/webhook"
                        value={config.target_url || ''}
                        onChange={(e) => updateActionConfig(action.id, 'target_url', e.target.value)}
                        className="mt-1 text-xs font-mono"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
