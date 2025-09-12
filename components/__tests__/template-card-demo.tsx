import { TemplateCard } from '../template-card';
import { Template } from '@/types/template';

// Demo component to showcase TemplateCard functionality
export function TemplateCardDemo() {
  const sampleTemplates: Template[] = [
    {
      id: '1',
      titel: 'Mietvertrag Vorlage',
      inhalt: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Sehr geehrte/r ' },
              {
                type: 'mention',
                attrs: { id: 'mieter.name', label: '@Mieter.Name' },
              },
              { type: 'text', text: ', hiermit bestätigen wir den Mietvertrag für die Wohnung in der ' },
              {
                type: 'mention',
                attrs: { id: 'wohnung.adresse', label: '@Wohnung.Adresse' },
              },
              { type: 'text', text: '.' },
            ],
          },
        ],
      },
      user_id: 'user-1',
      kategorie: 'Vertrag',
      kontext_anforderungen: ['mieter', 'wohnung'],
      erstellungsdatum: '2024-01-15T09:00:00Z',
      aktualisiert_am: '2024-01-15T14:30:00Z',
    },
    {
      id: '2',
      titel: 'Mahnung Vorlage',
      inhalt: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Sehr geehrte/r ' },
              {
                type: 'mention',
                attrs: { id: 'mieter.name', label: '@Mieter.Name' },
              },
              { type: 'text', text: ', wir müssen Sie daran erinnern, dass die Miete für ' },
              {
                type: 'mention',
                attrs: { id: 'wohnung.adresse', label: '@Wohnung.Adresse' },
              },
              { type: 'text', text: ' noch nicht eingegangen ist.' },
            ],
          },
        ],
      },
      user_id: 'user-1',
      kategorie: 'Mahnung',
      kontext_anforderungen: ['mieter', 'wohnung'],
      erstellungsdatum: '2024-01-10T11:00:00Z',
      aktualisiert_am: '2024-01-12T16:45:00Z',
    },
    {
      id: '3',
      titel: 'Willkommens-E-Mail',
      inhalt: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hallo ' },
              {
                type: 'mention',
                attrs: { id: 'mieter.vorname', label: '@Mieter.Vorname' },
              },
              { type: 'text', text: ', herzlich willkommen in Ihrem neuen Zuhause!' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Ihre neue Adresse: ' },
              {
                type: 'mention',
                attrs: { id: 'wohnung.adresse', label: '@Wohnung.Adresse' },
              },
            ],
          },
        ],
      },
      user_id: 'user-1',
      kategorie: 'Mail',
      kontext_anforderungen: ['mieter', 'wohnung'],
      erstellungsdatum: '2024-01-08T08:00:00Z',
      aktualisiert_am: '2024-01-08T08:00:00Z',
    },
  ];

  const handleEdit = (template: Template) => {
    console.log('Edit template:', template.titel);
  };

  const handleDelete = (templateId: string) => {
    console.log('Delete template:', templateId);
  };

  return (
    <div className="p-6 bg-background">
      <h2 className="text-2xl font-bold mb-6">Template Card Demo</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sampleTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}