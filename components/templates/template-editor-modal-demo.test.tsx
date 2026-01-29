'use client';

import { useState } from 'react';
import { TemplateEditorModal } from '@/components/templates/template-editor-modal';
import { Button } from '@/components/ui/button';
import { Template } from '@/types/template';

export function TemplateEditorModalDemo() {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const existingTemplate: Template = {
    id: '1',
    titel: 'Mietvertrag Standard',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Sehr geehrte/r ' },
            {
              type: 'mention',
              attrs: { id: 'mieter.name', label: 'Mieter.Name' }
            },
            { type: 'text', text: ',' }
          ]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'hiermit bestätigen wir den Mietvertrag für die Wohnung in der ' },
            {
              type: 'mention',
              attrs: { id: 'wohnung.adresse', label: 'Wohnung.Adresse' }
            },
            { type: 'text', text: '.' }
          ]
        }
      ]
    },
    user_id: 'user1',
    kategorie: 'Dokumente',
    kontext_anforderungen: ['mieter.name', 'wohnung.adresse'],
    erstellungsdatum: '2024-01-01',
    aktualisiert_am: '2024-01-01',
  };

  const handleSave = (templateData: any) => {
    console.log('Template saved with title:', templateData.titel);
    setIsNewModalOpen(false);
    setIsEditModalOpen(false);
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">TemplateEditorModal Demo</h1>
      
      <div className="space-x-4">
        <Button onClick={() => setIsNewModalOpen(true)}>
          Neue Vorlage erstellen
        </Button>
        
        <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
          Vorlage bearbeiten
        </Button>
      </div>

      <TemplateEditorModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSave={handleSave}
      />

      <TemplateEditorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSave}
        template={existingTemplate}
      />
    </div>
  );
}