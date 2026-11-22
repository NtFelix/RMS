import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TemplateCard } from '@/components/templates/template-card';
import { Template } from '@/types/template';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, transition, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const vorlage: Template = {
  id: 'vorlage-1',
  titel: 'Mahnung',
  kategorie: 'Mail',
  aktualisiert_am: '2026-01-10T10:00:00.000Z',
  inhalt: {
    type: 'doc',
    content: [
      {
        type: 'bedingung',
        attrs: { variable: 'mieter.email', operator: 'ausgefuellt', wert: null },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bitte per E-Mail antworten.' }] }],
      },
    ],
  },
} as unknown as Template;

describe('TemplateCard mit bedingtem Block', () => {
  it('zeigt den Inhalt des Bedingungsblocks mit Präfix in der Vorschau', () => {
    const { container } = render(<TemplateCard template={vorlage} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Mahnung')).toBeInTheDocument();
    expect(container.textContent).toContain('[Wenn Mieter.Email ist ausgefüllt] Bitte per E-Mail antworten.');
  });
});
