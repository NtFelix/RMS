'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface AgentMemberAccess {
  mitgliedId: string;
  name?: string;
  email?: string;
  zugriffsLevel: 'view' | 'manage' | 'results_only' | 'none';
}

interface Step7Props {
  accessRights: Record<string, 'view' | 'manage' | 'results_only' | 'none'>;
  onChange: (accessRights: Record<string, 'view' | 'manage' | 'results_only' | 'none'>) => void;
  mitglieder?: Array<{ id: string; user_id?: string; email?: string; vorname?: string; nachname?: string }>;
}

export function Step7Access({ accessRights = {}, onChange, mitglieder = [] }: Step7Props) {
  const handleLevelChange = (mitgliedId: string, level: 'view' | 'manage' | 'results_only' | 'none') => {
    const updated = { ...accessRights, [mitgliedId]: level };
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Agent Access & Zugriffsrechte</h3>
        <p className="text-sm text-muted-foreground">
          Konfiguriere, welche Organisationsmitglieder den Agenten verwalten, einsehen oder nur Ausführungsergebnisse abrufen dürfen.
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-card space-y-3">
        <div className="text-xs font-medium text-muted-foreground grid grid-cols-12 pb-2 border-b">
          <div className="col-span-6">Mitglied</div>
          <div className="col-span-6 text-right">Zugriffs-Level</div>
        </div>

        {mitglieder.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-3 text-center">Keine weiteren Mitglieder in der Organisation.</p>
        ) : (
          mitglieder.map((member) => {
            const memberName =
              [member.vorname, member.nachname].filter(Boolean).join(' ') || member.email || member.id;
            const currentLevel = accessRights[member.id] || 'none';

            return (
              <div key={member.id} className="grid grid-cols-12 items-center py-2 border-b last:border-0 text-sm">
                <div className="col-span-6 truncate font-medium text-foreground">
                  {memberName}
                  {member.email && <span className="text-xs text-muted-foreground block truncate">{member.email}</span>}
                </div>
                <div className="col-span-6 flex justify-end">
                  <Select
                    value={currentLevel}
                    onValueChange={(val) => handleLevelChange(member.id, val as any)}
                  >
                    <SelectTrigger className="w-[160px] text-xs h-8">
                      <SelectValue placeholder="Kein Zugriff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kein Zugriff</SelectItem>
                      <SelectItem value="view">Ansehen (View)</SelectItem>
                      <SelectItem value="results_only">Nur Ergebnisse</SelectItem>
                      <SelectItem value="manage">Verwalten (Manage)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
