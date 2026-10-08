'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Step2Props {
  anweisungen: string;
  onChange: (anweisungen: string) => void;
}

export function Step2Instructions({ anweisungen, onChange }: Step2Props) {
  const charCount = anweisungen.length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">System-Anweisungen</h3>
        <p className="text-sm text-muted-foreground">
          Definiere das Verhalten, die Rolle und die Arbeitsanweisungen des KI-Agenten im Detail.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="agent-instructions" className="text-sm font-medium">
            System Prompt <span className="text-destructive">*</span>
          </Label>
          <span className="text-xs text-muted-foreground font-mono">{charCount} Zeichen</span>
        </div>

        <Textarea
          id="agent-instructions"
          placeholder={`Du bist ein spezialisierter Mietevo-Agent...\n\nDeine Aufgaben:\n1. Überprüfe offene Nebenkosten-Abrechnungen.\n2. Erstelle Aufgaben bei Unstimmigkeiten.\n3. Benachrichtige das Team via E-Mail.`}
          value={anweisungen}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-sm min-h-[300px] leading-relaxed p-4 bg-muted/30"
        />

        <p className="text-xs text-muted-foreground">
          Tipp: Sei präzise in deinen Formulierungen. Gib konkrete Schritt-für-Schritt Anweisungen und Regelbeispiele an.
        </p>
      </div>
    </div>
  );
}
