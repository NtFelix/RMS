import type { JSONContent } from '@tiptap/react';
import { validateMentionVariables } from './template-validation';
import { MENTION_VARIABLES } from './template-constants';

const absatz = (...inhalt: JSONContent[]): JSONContent => ({ type: 'paragraph', content: inhalt });

describe('validateMentionVariables', () => {
  it('akzeptiert alle Variablen der Registry', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        absatz(...MENTION_VARIABLES.map(v => ({ type: 'mention', attrs: { id: v.id, label: v.label } }))),
      ],
    };

    expect(validateMentionVariables(doc).isValid).toBe(true);
  });

  it('akzeptiert die neuen Anrede-Variablen', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        absatz({ type: 'mention', attrs: { id: 'mieter.anrede_voll', label: 'Mieter.AnredeVoll' } }),
        absatz({ type: 'mention', attrs: { id: 'mieter.anrede', label: 'Mieter.Anrede' } }),
      ],
    };

    expect(validateMentionVariables(doc).isValid).toBe(true);
  });

  it('meldet unbekannte Mention-IDs', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [absatz({ type: 'mention', attrs: { id: 'mieter.gibtsnicht', label: 'Mieter.Gibtsnicht' } })],
    };

    const ergebnis = validateMentionVariables(doc);
    expect(ergebnis.isValid).toBe(false);
    expect(ergebnis.errors).toEqual([
      { field: 'inhalt', message: 'Ungültige Mention-Variable: mieter.gibtsnicht' },
    ]);
  });

  it('akzeptiert einen gültigen Bedingungsblock', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'bedingung',
          attrs: { variable: 'mieter.telefon', operator: 'ausgefuellt', wert: null },
          content: [absatz({ type: 'text', text: 'Telefon vorhanden' })],
        },
      ],
    };

    expect(validateMentionVariables(doc).isValid).toBe(true);
  });

  it('meldet Bedingungen mit unbekannter Variable', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'bedingung',
          attrs: { variable: 'mieter.gibtsnicht', operator: 'ausgefuellt', wert: null },
          content: [absatz({ type: 'text', text: 'Text' })],
        },
      ],
    };

    const ergebnis = validateMentionVariables(doc);
    expect(ergebnis.isValid).toBe(false);
    expect(ergebnis.errors.map(e => e.field)).toEqual(['inhalt']);
    expect(ergebnis.errors[0].message).toContain('mieter.gibtsnicht');
  });

  it('meldet gleich-Bedingungen ohne Vergleichswert', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'bedingung',
          attrs: { variable: 'mieter.anrede', operator: 'gleich', wert: '   ' },
          content: [absatz({ type: 'text', text: 'Text' })],
        },
      ],
    };

    const ergebnis = validateMentionVariables(doc);
    expect(ergebnis.isValid).toBe(false);
    expect(ergebnis.errors.length).toBeGreaterThan(0);
  });
});
