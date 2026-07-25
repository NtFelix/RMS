'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface AgentTrigger {
  type: 'manual' | 'cron' | 'webhook' | 'db_event';
  config: Record<string, any>;
}

interface Step4Props {
  trigger: AgentTrigger;
  onChange: (trigger: AgentTrigger) => void;
}

const TIMEZONES = ['Europe/Berlin', 'UTC', 'Europe/Vienna', 'Europe/Zurich'];
const TABLES = ['Mieter', 'Wohnungen', 'Zaehler_Ablesungen', 'Finanzen', 'Rechnungen', 'Aufgaben'];
const DB_EVENTS = ['INSERT', 'UPDATE', 'DELETE'];

export function Step4Trigger({ trigger, onChange }: Step4Props) {
  const triggerType = trigger?.type || 'manual';
  const config = trigger?.config || {};

  const handleTypeChange = (type: 'manual' | 'cron' | 'webhook' | 'db_event') => {
    let defaultConfig: Record<string, any> = {};
    if (type === 'cron') {
      defaultConfig = { cron_expression: '0 8 * * *', timezone: 'Europe/Berlin' };
    } else if (type === 'webhook') {
      defaultConfig = { secret: typeof crypto !== 'undefined' ? crypto.randomUUID() : 'whsec_default' };
    } else if (type === 'db_event') {
      defaultConfig = { table: 'Mieter', event: 'INSERT' };
    }
    onChange({ type, config: defaultConfig });
  };

  const updateConfig = (key: string, value: any) => {
    onChange({
      ...trigger,
      config: {
        ...config,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Trigger-Konfiguration</h3>
        <p className="text-sm text-muted-foreground">
          Wähle aus, wann und wie der Agent automatisch oder manuell ausgeführt werden soll.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Trigger-Typ</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { type: 'manual', label: 'Manuell', desc: 'Per Button / API' },
              { type: 'cron', label: 'Zeitplan (Cron)', desc: 'Wiederkehrend' },
              { type: 'webhook', label: 'HTTP Webhook', desc: 'Externe Systeme' },
              { type: 'db_event', label: 'DB-Event', desc: 'Bei Tabellen-Änderung' },
            ].map((t) => {
              const isSelected = triggerType === t.type;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => handleTypeChange(t.type as any)}
                  className={`p-3 text-left border rounded-lg transition-all ${
                    isSelected ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'bg-card hover:bg-muted'
                  }`}
                >
                  <div className="font-medium text-sm text-foreground">{t.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Config for cron */}
        {triggerType === 'cron' && (
          <div className="p-4 border rounded-lg bg-card space-y-4">
            <h4 className="font-medium text-sm">Cron-Einstellungen</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cron-expr" className="text-xs">Cron Expression</Label>
                <Input
                  id="cron-expr"
                  placeholder="0 8 * * *"
                  value={config.cron_expression || ''}
                  onChange={(e) => updateConfig('cron_expression', e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">z.B. 0 8 * * * (Jeden Tag um 08:00 Uhr)</p>
              </div>

              <div>
                <Label className="text-xs">Zeitzone</Label>
                <Select
                  value={config.timezone || 'Europe/Berlin'}
                  onValueChange={(val) => updateConfig('timezone', val)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Zeitzone wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Config for webhook */}
        {triggerType === 'webhook' && (
          <div className="p-4 border rounded-lg bg-card space-y-3">
            <h4 className="font-medium text-sm">Webhook-Einstellungen</h4>
            <div>
              <Label htmlFor="wh-secret" className="text-xs">Webhook Secret (Header: X-Webhook-Secret)</Label>
              <Input
                id="wh-secret"
                readOnly
                value={config.secret || ''}
                className="mt-1 font-mono text-xs bg-muted"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Endpunkt: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">POST /api/agents/[id]/run</code>
            </p>
          </div>
        )}

        {/* Config for db_event */}
        {triggerType === 'db_event' && (
          <div className="p-4 border rounded-lg bg-card space-y-4">
            <h4 className="font-medium text-sm">Datenbank-Event Einstellungen</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Tabelle</Label>
                <Select
                  value={config.table || 'Mieter'}
                  onValueChange={(val) => updateConfig('table', val)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Tabelle wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {TABLES.map((tbl) => (
                      <SelectItem key={tbl} value={tbl}>
                        {tbl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Event</Label>
                <Select
                  value={config.event || 'INSERT'}
                  onValueChange={(val) => updateConfig('event', val)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Event wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {DB_EVENTS.map((ev) => (
                      <SelectItem key={ev} value={ev}>
                        {ev}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
