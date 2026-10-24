import type { JSONContent } from '@tiptap/react';
import { hasTipTapContent, validateMentionVariables, validateVorauszahlungSatz } from './template-validation';

const doc = (...ids: string[]): JSONContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: ids.map(id => ({ type: 'mention', attrs: { id, label: id } })) }],
});

describe('validateMentionVariables', () => {
  it('accepts the Abrechnung variables in Betriebskostenabrechnung templates', () => {
    expect(validateMentionVariables(doc('mieter.name', 'abrechnung.guthaben', 'vorauszahlung.satz'), 'Betriebskostenabrechnung').isValid).toBe(true);
  });

  it('rejects the Abrechnung variables in other templates', () => {
    const result = validateMentionVariables(doc('mieter.name', 'abrechnung.guthaben'), 'Mail');
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([{ field: 'inhalt', message: 'Ungültige Mention-Variable: abrechnung.guthaben' }]);
  });

  it('accepts every known variable without a category and still rejects unknown ones', () => {
    expect(validateMentionVariables(doc('vermieter.vorname', 'abrechnung.zeitraum')).isValid).toBe(true);
    expect(validateMentionVariables(doc('gibt.es.nicht')).isValid).toBe(false);
  });
});

describe('validateVorauszahlungSatz', () => {
  it('allows the amounts and the date of the increase', () => {
    expect(validateVorauszahlungSatz(doc('vorauszahlung.alter_betrag', 'vorauszahlung.neuer_betrag', 'vorauszahlung.ab_datum')).isValid).toBe(true);
    expect(validateVorauszahlungSatz(null).isValid).toBe(true);
  });

  it('rejects other variables and the sentence itself', () => {
    const result = validateVorauszahlungSatz(doc('mieter.name', 'vorauszahlung.satz'));
    expect(result.errors.map(error => error.field)).toEqual(['vorauszahlung_satz', 'vorauszahlung_satz']);
  });
});

describe('hasTipTapContent', () => {
  it('counts text and variables as content', () => {
    expect(hasTipTapContent(doc('vorauszahlung.neuer_betrag'))).toBe(true);
    expect(hasTipTapContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }] })).toBe(true);
  });

  it('treats empty paragraphs and whitespace as empty', () => {
    expect(hasTipTapContent({ type: 'doc', content: [{ type: 'paragraph' }, { type: 'paragraph', content: [{ type: 'text', text: '  ' }] }] })).toBe(false);
    expect(hasTipTapContent(undefined)).toBe(false);
  });
});
