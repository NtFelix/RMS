'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Step1Props {
  name: string;
  beschreibung: string;
  icon: string;
  onChange: (updates: { name?: string; beschreibung?: string; icon?: string }) => void;
}

const EMOJI_SUGGESTIONS = ['🤖', '🏠', '⚡', '📊', '📩', '🔔', '💼', '🔍', '🛠️', '📝'];

export function Step1BasicInfo({ name, beschreibung, icon, onChange }: Step1Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Grundinformationen</h3>
        <p className="text-sm text-muted-foreground">
          Gib deinem KI-Agenten einen aussagekräftigen Namen, ein Symbol und eine Beschreibung.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="agent-name" className="text-sm font-medium">
            Name des Agenten <span className="text-destructive">*</span>
          </Label>
          <Input
            id="agent-name"
            placeholder="z.B. Mietvertrags-Prüfer oder Nebenkosten-Assistent"
            value={name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="agent-icon" className="text-sm font-medium">
            Icon (Emoji)
          </Label>
          <div className="flex items-center gap-3 mt-1">
            <Input
              id="agent-icon"
              placeholder="🤖"
              value={icon}
              onChange={(e) => onChange({ icon: e.target.value })}
              className="w-20 text-center text-xl"
              maxLength={4}
            />
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_SUGGESTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onChange({ icon: emoji })}
                  className={`px-2.5 py-1 rounded text-lg transition-colors hover:bg-accent ${
                    icon === emoji ? 'bg-accent ring-2 ring-primary' : 'bg-background border'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="agent-description" className="text-sm font-medium">
            Beschreibung (optional)
          </Label>
          <Textarea
            id="agent-description"
            placeholder="Beschreibe kurz die Hauptaufgabe dieses Agenten..."
            value={beschreibung}
            onChange={(e) => onChange({ beschreibung: e.target.value })}
            className="mt-1 min-h-[100px]"
          />
        </div>
      </div>
    </div>
  );
}
