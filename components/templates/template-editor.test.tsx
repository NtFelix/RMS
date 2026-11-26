import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TemplateEditor } from '@/components/templates/template-editor';

let mockFlagAktiv = false;
jest.mock('@/hooks/use-vorlagen-bedingungen-flag', () => ({
  useVorlagenBedingungenFlag: () => mockFlagAktiv,
}));

const GESPEICHERTE_VORLAGE = {
  type: 'doc',
  content: [
    {
      type: 'bedingung',
      attrs: { variable: 'mieter.email', operator: 'ausgefuellt', wert: null },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Gespeicherter Hinweis' }] }],
    },
  ],
};

describe('TemplateEditor Bedingter Block', () => {
  beforeEach(() => {
    mockFlagAktiv = false;
  });

  it('zeigt die Schaltfläche Bedingter Block nur bei aktivem Flag', async () => {
    const { unmount } = render(<TemplateEditor content={{ type: 'doc', content: [{ type: 'paragraph' }] }} />);
    await waitFor(() => expect(screen.getByLabelText('Überschrift 1')).toBeInTheDocument());
    expect(screen.queryByLabelText('Bedingter Block')).not.toBeInTheDocument();
    unmount();

    mockFlagAktiv = true;
    render(<TemplateEditor content={{ type: 'doc', content: [{ type: 'paragraph' }] }} />);
    await waitFor(() => expect(screen.getByLabelText('Bedingter Block')).toBeInTheDocument());
  });

  it('blendet die Schaltfläche im schreibgeschützten Modus aus', async () => {
    mockFlagAktiv = true;
    render(<TemplateEditor content={{ type: 'doc', content: [{ type: 'paragraph' }] }} readOnly />);
    await waitFor(() => expect(document.querySelector('.ProseMirror')).toBeInTheDocument());
    expect(screen.queryByLabelText('Bedingter Block')).not.toBeInTheDocument();
  });

  it('öffnet gespeicherte Vorlagen mit Bedingung auch bei ausgeschaltetem Flag', async () => {
    mockFlagAktiv = false;
    render(<TemplateEditor content={GESPEICHERTE_VORLAGE} />);
    expect(await screen.findByText('Gespeicherter Hinweis')).toBeInTheDocument();
    expect(screen.getByText('Wenn')).toBeInTheDocument();
    expect(screen.queryByLabelText('Bedingter Block')).not.toBeInTheDocument();
  });
});
