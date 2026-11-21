import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TemplatePreview } from '@/components/templates/template-preview';
import { extractRichTextPreview } from '@/lib/template-performance';

const DOC_MIT_BEDINGUNG = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Guten Tag' }] },
    {
      type: 'bedingung',
      attrs: { variable: 'mieter.nachname', operator: 'gleich', wert: 'Muster' },
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hinweis für ' },
            { type: 'mention', attrs: { id: 'mieter.vorname', label: 'Mieter.Vorname' } },
          ],
        },
      ],
    },
  ],
};

describe('Vorschau mit bedingtem Block', () => {
  it('stellt den Inhalt des Blocks mit Präfix der Bedingung dar', () => {
    const preview = extractRichTextPreview(DOC_MIT_BEDINGUNG, 500);
    expect(preview.text).toBe('Guten Tag [Wenn Mieter.Nachname ist gleich „Muster“] Hinweis für @Mieter.Vorname');
  });

  it('markiert den Präfix-Teil als Bedingung', () => {
    const preview = extractRichTextPreview(DOC_MIT_BEDINGUNG, 500);
    const praefix = preview.segments.find((segment) => segment.isBedingung);
    expect(praefix?.text).toBe('[Wenn Mieter.Nachname ist gleich „Muster“] ');
    expect(preview.hasHighlights).toBe(true);
  });

  it('zeigt die Vorschau ohne Mentions als Text, inklusive Präfix', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'bedingung',
          attrs: { variable: 'mieter.email', operator: 'leer', wert: null },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bitte Adresse prüfen' }] }],
        },
      ],
    };
    const { container } = render(<TemplatePreview content={doc} />);
    expect(container.textContent).toContain('[Wenn Mieter.Email ist leer] Bitte Adresse prüfen');
  });

  it('hebt den Präfix der Bedingung im Rendering hervor', () => {
    render(<TemplatePreview content={DOC_MIT_BEDINGUNG} />);
    const praefix = screen.getByText('[Wenn Mieter.Nachname ist gleich „Muster“]', { exact: false });
    expect(praefix.className).toContain('italic');
    expect(screen.getByText('@Mieter.Vorname')).toBeInTheDocument();
  });

  it('bleibt bei Vorlagen ohne Bedingung unverändert', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nur Text' }] }] };
    const preview = extractRichTextPreview(doc, 500);
    expect(preview.segments.some((segment) => segment.isBedingung)).toBe(false);
    render(<TemplatePreview content={doc} />);
    expect(screen.getByText('Nur Text')).toBeInTheDocument();
  });
});
