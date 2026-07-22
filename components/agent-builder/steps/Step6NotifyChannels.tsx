'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface NotifyChannel {
  type: string;
  config: Record<string, any>;
}

interface Step6Props {
  benachrichtigungsKanaele: NotifyChannel[];
  onChange: (kanaele: NotifyChannel[]) => void;
}

const CHANNELS = [
  { id: 'email', title: 'E-Mail Benachrichtigung', desc: 'Benachrichtigt bei Fehlern oder Ergebnissen per E-Mail' },
  { id: 'in_app', title: 'In-App Benachrichtigung', desc: 'Erzeugt eine Mitteilung im Mietevo Dashboard' },
  { id: 'webhook', title: 'Webhook Dispatcher', desc: 'Sendet Ausführungsergebnisse an ein externes System' },
];

export function Step6NotifyChannels({ benachrichtigungsKanaele = [], onChange }: Step6Props) {
  const isSelected = (channelId: string) => benachrichtigungsKanaele.some((c) => c.type === channelId);
  const getChannelConfig = (channelId: string) => benachrichtigungsKanaele.find((c) => c.type === channelId)?.config || {};

  const toggleChannel = (channelId: string) => {
    if (isSelected(channelId)) {
      onChange(benachrichtigungsKanaele.filter((c) => c.type !== channelId));
    } else {
      onChange([...benachrichtigungsKanaele, { type: channelId, config: {} }]);
    }
  };

  const updateChannelConfig = (channelId: string, key: string, value: any) => {
    onChange(
      benachrichtigungsKanaele.map((c) => (c.type === channelId ? { ...c, config: { ...c.config, [key]: value } } : c))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Benachrichtigungskanäle</h3>
        <p className="text-sm text-muted-foreground">
          Bestimme, wer und wie über den Ausführungsstatus des Agenten informiert werden soll.
        </p>
      </div>

      <div className="space-y-4">
        {CHANNELS.map((channel) => {
          const checked = isSelected(channel.id);
          const config = getChannelConfig(channel.id);
          return (
            <div
              key={channel.id}
              className={`border rounded-lg p-4 transition-colors ${
                checked ? 'bg-card border-primary/40' : 'bg-background hover:bg-muted/30'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleChannel(channel.id)}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium text-sm text-foreground">{channel.title}</div>
                  <div className="text-xs text-muted-foreground">{channel.desc}</div>
                </div>
              </label>

              {checked && (
                <div className="mt-4 pt-3 border-t space-y-3 pl-7">
                  {channel.id === 'email' && (
                    <div>
                      <Label className="text-xs">Empfänger E-Mails (kommagetrennt)</Label>
                      <Input
                        placeholder="admin@mietevo.de, manager@mietevo.de"
                        value={config.recipients || ''}
                        onChange={(e) => updateChannelConfig(channel.id, 'recipients', e.target.value)}
                        className="mt-1 text-xs"
                      />
                    </div>
                  )}

                  {channel.id === 'webhook' && (
                    <div>
                      <Label className="text-xs">Webhook Dispatcher URL</Label>
                      <Input
                        placeholder="https://hooks.slack.com/services/..."
                        value={config.url || ''}
                        onChange={(e) => updateChannelConfig(channel.id, 'url', e.target.value)}
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
