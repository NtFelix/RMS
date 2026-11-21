import type { JSONContent } from '@tiptap/react';
import { vorlageZuText } from './rendern';
import type { VorlagenKontext } from './variablen';

const kontext: VorlagenKontext = {
  mieter: {
    anrede: 'frau',
    vorname: 'Erika',
    nachname: 'Muster',
    name: 'Erika Muster',
    email: 'erika@example.test',
    telefonnummer: null,
  },
  vermieter: { name: 'Hausverwaltung Beispiel' },
  heute: new Date(2026, 10, 21),
};

const text = (t: string): JSONContent => ({ type: 'text', text: t });
const absatz = (...inhalt: JSONContent[]): JSONContent => ({ type: 'paragraph', content: inhalt });
const variable = (id: string, label: string): JSONContent => ({ type: 'mention', attrs: { id, label } });
const listenpunkt = (...inhalt: JSONContent[]): JSONContent => ({ type: 'listItem', content: [absatz(...inhalt)] });

describe('vorlageZuText (Golden)', () => {
  it('rendert einen Brief mit Anrede, Datum und Absätzen', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        absatz(variable('mieter.anrede_voll', 'Mieter.AnredeVoll'), text(',')),
        absatz(text('hiermit bestätigen wir den Eingang am '), variable('datum.heute', 'Datum.Heute'), text('.')),
        absatz(text('Mit freundlichen Grüßen')),
        absatz(variable('vermieter.name', 'Vermieter.Name')),
      ],
    };

    expect(vorlageZuText(doc, kontext)).toBe(
      'Sehr geehrte Frau Muster,\n\n' +
        'hiermit bestätigen wir den Eingang am 21.11.2026.\n\n' +
        'Mit freundlichen Grüßen\n\n' +
        'Hausverwaltung Beispiel'
    );
  });

  it('rendert Zeilenumbrüche (hardBreak) innerhalb eines Absatzes', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        absatz(
          text('Erika Muster'),
          { type: 'hardBreak' },
          text('Musterstraße 1'),
          { type: 'hardBreak' },
          text('12345 Musterstadt')
        ),
      ],
    };

    expect(vorlageZuText(doc, kontext)).toBe('Erika Muster\nMusterstraße 1\n12345 Musterstadt');
  });

  it('rendert Überschriften wie Absätze', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [text('Betreff: Mietvertrag')] },
        absatz(text('Text')),
      ],
    };

    expect(vorlageZuText(doc, kontext)).toBe('Betreff: Mietvertrag\n\nText');
  });

  it('rendert Aufzählungen mit "- " und nummerierte Listen mit "1. ", "2. "', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        absatz(text('Bitte bringen Sie mit:')),
        { type: 'bulletList', content: [listenpunkt(text('Ausweis')), listenpunkt(text('Mietvertrag'))] },
        absatz(text('Ablauf:')),
        {
          type: 'orderedList',
          attrs: { start: 1 },
          content: [listenpunkt(text('Begrüßung')), listenpunkt(text('Übergabe'))],
        },
      ],
    };

    expect(vorlageZuText(doc, kontext)).toBe(
      'Bitte bringen Sie mit:\n\n' +
        '- Ausweis\n- Mietvertrag\n\n' +
        'Ablauf:\n\n' +
        '1. Begrüßung\n2. Übergabe'
    );
  });

  it('gibt unbekannte Variablen als [Label] aus', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        absatz(text('Adresse: '), variable('wohnung.adresse', 'Wohnung.Adresse')),
        absatz(text('Telefon: '), variable('mieter.telefon', 'Mieter.Telefon')),
      ],
    };

    expect(vorlageZuText(doc, kontext)).toBe('Adresse: [Wohnung.Adresse]\n\nTelefon:');
  });

  it('löst eine Variable nicht über ihr Label auf', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [absatz(variable('gibt.es.nicht', 'Mieter.Name'))],
    };

    expect(vorlageZuText(doc, kontext)).toBe('[Mieter.Name]');
  });

  it('gibt einen Bedingungsblock aus, wenn die Bedingung erfüllt ist', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        absatz(text('Sehr geehrte Damen und Herren,')),
        {
          type: 'bedingung',
          attrs: { variable: 'mieter.email', operator: 'ausgefuellt', wert: null },
          content: [absatz(text('wir senden Ihnen Ihre Unterlagen per E-Mail.'))],
        },
        absatz(text('Viele Grüße')),
      ],
    };

    expect(vorlageZuText(doc, kontext)).toBe(
      'Sehr geehrte Damen und Herren,\n\n' +
        'wir senden Ihnen Ihre Unterlagen per E-Mail.\n\n' +
        'Viele Grüße'
    );
  });

  it('lässt einen Bedingungsblock weg, wenn die Bedingung nicht erfüllt ist', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        absatz(text('Sehr geehrte Damen und Herren,')),
        {
          type: 'bedingung',
          attrs: { variable: 'mieter.telefon', operator: 'ausgefuellt', wert: null },
          content: [absatz(text('Bitte rufen Sie uns an.'))],
        },
        absatz(text('Viele Grüße')),
      ],
    };

    expect(vorlageZuText(doc, kontext)).toBe('Sehr geehrte Damen und Herren,\n\nViele Grüße');
  });

  it('wertet gleich und ungleich gegen die aufgelöste Variable aus', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'bedingung',
          attrs: { variable: 'mieter.anrede', operator: 'gleich', wert: ' frau ' },
          content: [absatz(text('Frau-Zweig'))],
        },
        {
          type: 'bedingung',
          attrs: { variable: 'mieter.anrede', operator: 'ungleich', wert: 'Frau' },
          content: [absatz(text('Nicht-Frau-Zweig'))],
        },
      ],
    };

    expect(vorlageZuText(doc, kontext)).toBe('Frau-Zweig');
  });

  it('rendert eine Liste innerhalb eines erfüllten Bedingungsblocks', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'bedingung',
          attrs: { variable: 'mieter.email', operator: 'ausgefuellt', wert: null },
          content: [
            absatz(text('Unterlagen:')),
            { type: 'bulletList', content: [listenpunkt(text('Mietvertrag')), listenpunkt(text('Hausordnung'))] },
          ],
        },
      ],
    };

    expect(vorlageZuText(doc, kontext)).toBe('Unterlagen:\n\n- Mietvertrag\n- Hausordnung');
  });

  it('liefert für ein leeres Dokument einen leeren Text', () => {
    expect(vorlageZuText({ type: 'doc', content: [absatz()] }, kontext)).toBe('');
    expect(vorlageZuText({ type: 'doc' }, kontext)).toBe('');
  });
});
