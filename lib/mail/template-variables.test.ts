import type { JSONContent } from '@tiptap/react';
import { renderTemplateText, templateUsesVorauszahlungSatz, type MailTemplateContext } from './template-variables';

const text = (value: string): JSONContent => ({ type: 'text', text: value });
const mention = (id: string, label = id): JSONContent => ({ type: 'mention', attrs: { id, label } });
const paragraph = (...content: JSONContent[]): JSONContent => ({ type: 'paragraph', content });
const doc = (...content: JSONContent[]): JSONContent => ({ type: 'doc', content });

const satz = doc(
  paragraph(
    text('Ab dem '),
    mention('vorauszahlung.ab_datum'),
    text(' beträgt Ihre Vorauszahlung '),
    mention('vorauszahlung.neuer_betrag'),
    text(' statt '),
    mention('vorauszahlung.alter_betrag'),
    text('.')
  )
);

const baseCtx: MailTemplateContext = {
  mieter: { name: 'Erika Beispiel', email: 'mieter@example.test' },
  wohnung: { bezeichnung: 'EG links' },
  vermieter: { vorname: 'Max', nachname: 'Muster', adresse: 'Teststraße 1, 12345 Teststadt' },
  abrechnung: { startdatum: '2025-01-01', enddatum: '2025-12-31', ergebnis: 123.45 },
  vorauszahlung: { alterBetrag: 80, erhoehung: null },
  heute: new Date(2026, 9, 8),
};

const withErhoehung: MailTemplateContext = {
  ...baseCtx,
  vorauszahlung: { alterBetrag: 80, erhoehung: { neuerBetrag: 95, abDatum: '2026-01-01' } },
};

describe('renderTemplateText', () => {
  it('resolves the tenant, apartment, landlord, date and Abrechnung variables', () => {
    const inhalt = doc(
      paragraph(text('Hallo '), mention('mieter.name', 'Mieter.Name'), text(',')),
      paragraph(text('Wohnung: '), mention('wohnung.bezeichnung')),
      paragraph(text('Zeitraum: '), mention('abrechnung.zeitraum')),
      paragraph(text('Nachzahlung: '), mention('abrechnung.nachzahlung'), text('|Guthaben: '), mention('abrechnung.guthaben')),
      paragraph(mention('datum.heute'), text(' / '), mention('datum.monat'), text(' / '), mention('datum.jahr')),
      paragraph(mention('vermieter.name'), text(' – '), mention('vermieter.vorname'), text(' '), mention('vermieter.nachname')),
      paragraph(mention('vermieter.adresse'))
    );

    expect(renderTemplateText(inhalt, baseCtx)).toBe(
      [
        'Hallo Erika Beispiel,',
        'Wohnung: EG links',
        'Zeitraum: 1.1.2025 – 31.12.2025',
        'Nachzahlung: 123,45 €|Guthaben:',
        '8.10.2026 / Oktober / 2026',
        'Max Muster – Max Muster',
        'Teststraße 1, 12345 Teststadt',
      ].join('\n\n')
    );
  });

  it('fills the Guthaben and leaves the Nachzahlung empty for a credit', () => {
    const inhalt = doc(paragraph(text('N:'), mention('abrechnung.nachzahlung'), text(' G:'), mention('abrechnung.guthaben')));
    const ctx = { ...baseCtx, abrechnung: { ...baseCtx.abrechnung!, ergebnis: -50 } };
    expect(renderTemplateText(inhalt, ctx)).toBe('N: G:50,00 €');
  });

  it('looks variables up by id, so labels with umlauts resolve too', () => {
    const inhalt = doc(paragraph(mention('wohnung.bezeichnung', 'Wohnung.Bezeichnung (Größe)')));
    expect(renderTemplateText(inhalt, baseCtx)).toBe('EG links');
  });

  it('shows a placeholder for variables the context does not know', () => {
    const inhalt = doc(paragraph(text('Zimmer: '), mention('wohnung.zimmer', 'Wohnung.Zimmer'), text(' '), mention('unbekannt.feld')));
    expect(renderTemplateText(inhalt, { mieter: { name: 'X' } })).toBe('Zimmer: [Wohnung.Zimmer] [unbekannt.feld]');
  });

  it('puts list items on their own lines and keeps hard breaks', () => {
    const inhalt = doc(
      { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(text('Eins'))] }, { type: 'listItem', content: [paragraph(text('Zwei'))] }] },
      { type: 'orderedList', attrs: { start: 3 }, content: [{ type: 'listItem', content: [paragraph(text('Drei'))] }] },
      paragraph(text('Zeile 1'), { type: 'hardBreak' }, text('Zeile 2'))
    );
    expect(renderTemplateText(inhalt, baseCtx)).toBe('- Eins\n- Zwei\n\n3. Drei\n\nZeile 1\nZeile 2');
  });

  it('drops empty paragraphs', () => {
    expect(renderTemplateText(doc(paragraph(text('A')), paragraph(), paragraph(text('  ')), paragraph(text('B'))), baseCtx)).toBe('A\n\nB');
  });

  it('returns an empty string for empty content', () => {
    expect(renderTemplateText(null, baseCtx)).toBe('');
    expect(renderTemplateText({ type: 'doc' }, baseCtx)).toBe('');
  });

  describe('@vorauszahlung.satz', () => {
    const body = doc(paragraph(text('Anbei die Abrechnung.')), paragraph(mention('vorauszahlung.satz')), paragraph(text('Grüße')));

    it('places the filled sentence when an increase is set', () => {
      expect(renderTemplateText(body, withErhoehung, { vorauszahlungSatz: satz })).toBe(
        'Anbei die Abrechnung.\n\nAb dem 1.1.2026 beträgt Ihre Vorauszahlung 95,00 € statt 80,00 €.\n\nGrüße'
      );
    });

    it('removes a paragraph that only holds the variable when no increase is set', () => {
      expect(renderTemplateText(body, baseCtx, { vorauszahlungSatz: satz })).toBe('Anbei die Abrechnung.\n\nGrüße');
    });

    it('keeps other text of the paragraph and only drops the variable', () => {
      const mixed = doc(paragraph(text('Hinweis: '), mention('vorauszahlung.satz'), text(' Danke.')));
      expect(renderTemplateText(mixed, baseCtx, { vorauszahlungSatz: satz })).toBe('Hinweis: Danke.');
      expect(renderTemplateText(doc(paragraph(text('Ende '), mention('vorauszahlung.satz'), text('.'))), baseCtx, { vorauszahlungSatz: satz })).toBe('Ende.');
    });

    it('inserts nothing when the body does not place the variable', () => {
      const plain = doc(paragraph(text('Nur Text')));
      expect(renderTemplateText(plain, withErhoehung, { vorauszahlungSatz: satz })).toBe('Nur Text');
    });

    it('drops the variable when the template has no sentence', () => {
      expect(renderTemplateText(body, withErhoehung, { vorauszahlungSatz: null })).toBe('Anbei die Abrechnung.\n\nGrüße');
    });

    it('never places the sentence inside itself', () => {
      const selfReferencing = doc(paragraph(text('Neu: '), mention('vorauszahlung.neuer_betrag'), mention('vorauszahlung.satz')));
      expect(renderTemplateText(body, withErhoehung, { vorauszahlungSatz: selfReferencing })).toBe(
        'Anbei die Abrechnung.\n\nNeu: 95,00 €\n\nGrüße'
      );
    });

    it('leaves the new amount and date empty without an increase', () => {
      const direct = doc(paragraph(text('Neu: '), mention('vorauszahlung.neuer_betrag'), text(' ab '), mention('vorauszahlung.ab_datum')));
      expect(renderTemplateText(direct, baseCtx)).toBe('Neu:  ab');
    });
  });
});

describe('templateUsesVorauszahlungSatz', () => {
  it('finds the variable anywhere in the document', () => {
    expect(templateUsesVorauszahlungSatz(doc(paragraph(text('x'))))).toBe(false);
    expect(
      templateUsesVorauszahlungSatz(
        doc({ type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(mention('vorauszahlung.satz'))] }] })
      )
    ).toBe(true);
    expect(templateUsesVorauszahlungSatz(null)).toBe(false);
  });
});
