import {
  BEDINGUNG_NODE_NAME,
  bedingungErfuellt,
  formatBedingungPraefix,
  pruefeBedingungen,
  type BedingungAttrs,
} from '@/lib/vorlagen/bedingungen';

const GUELTIG = new Set(['mieter.name', 'mieter.email', 'wohnung.zimmer']);

function bedingung(attrs: Partial<BedingungAttrs>, content: any[] = [{ type: 'paragraph', content: [{ type: 'text', text: 'Text' }] }]) {
  return { type: BEDINGUNG_NODE_NAME, attrs: { variable: 'mieter.name', operator: 'ausgefuellt', wert: null, ...attrs }, content };
}

describe('bedingungErfuellt', () => {
  it.each([
    { operator: 'ausgefuellt', wert: 'Anna', erwartet: true },
    { operator: 'ausgefuellt', wert: '  ', erwartet: false },
    { operator: 'ausgefuellt', wert: null, erwartet: false },
    { operator: 'leer', wert: '', erwartet: true },
    { operator: 'leer', wert: null, erwartet: true },
    { operator: 'leer', wert: 'Anna', erwartet: false },
  ] as const)('$operator mit Wert $wert ergibt $erwartet', ({ operator, wert, erwartet }) => {
    expect(bedingungErfuellt({ variable: 'mieter.name', operator }, wert)).toBe(erwartet);
  });

  it('vergleicht gleich getrimmt und ohne Groß-/Kleinschreibung', () => {
    const attrs: BedingungAttrs = { variable: 'mieter.name', operator: 'gleich', wert: '  frau  ' };
    expect(bedingungErfuellt(attrs, 'Frau')).toBe(true);
    expect(bedingungErfuellt(attrs, ' FRAU ')).toBe(true);
    expect(bedingungErfuellt(attrs, 'Herr')).toBe(false);
  });

  it('vergleicht ungleich getrimmt und ohne Groß-/Kleinschreibung', () => {
    const attrs: BedingungAttrs = { variable: 'mieter.name', operator: 'ungleich', wert: 'Frau' };
    expect(bedingungErfuellt(attrs, 'frau ')).toBe(false);
    expect(bedingungErfuellt(attrs, 'Herr')).toBe(true);
  });

  it('behandelt eine nicht aufgelöste Variable (null) bei gleich als falsch und bei ungleich als wahr', () => {
    expect(bedingungErfuellt({ variable: 'x', operator: 'gleich', wert: '' }, null)).toBe(false);
    expect(bedingungErfuellt({ variable: 'x', operator: 'gleich', wert: 'a' }, null)).toBe(false);
    expect(bedingungErfuellt({ variable: 'x', operator: 'ungleich', wert: 'a' }, null)).toBe(true);
  });

  it('liefert für einen unbekannten Operator false', () => {
    expect(bedingungErfuellt({ variable: 'x', operator: 'quatsch' as any }, 'a')).toBe(false);
  });
});

describe('pruefeBedingungen', () => {
  it('meldet keine Fehler bei gültigen Bedingungen, auch in verschachtelten Blöcken', () => {
    const doc = {
      type: 'doc',
      content: [bedingung({ variable: 'mieter.email', operator: 'ausgefuellt' }, [
        bedingung({ variable: 'wohnung.zimmer', operator: 'gleich', wert: '3' }),
      ])],
    };
    expect(pruefeBedingungen(doc, GUELTIG)).toEqual([]);
  });

  it('meldet eine unbekannte Variable', () => {
    const doc = { type: 'doc', content: [bedingung({ variable: 'haus.unbekannt' })] };
    expect(pruefeBedingungen(doc, GUELTIG)).toEqual(['Bedingung: Die Variable "haus.unbekannt" ist unbekannt.']);
  });

  it('meldet eine fehlende Variable', () => {
    const doc = { type: 'doc', content: [bedingung({ variable: '' })] };
    expect(pruefeBedingungen(doc, GUELTIG)).toEqual(['Bedingung: Bitte eine Variable auswählen.']);
  });

  it('meldet einen fehlenden oder ungültigen Operator', () => {
    const ohne = { type: 'doc', content: [bedingung({ operator: undefined as any })] };
    const falsch = { type: 'doc', content: [bedingung({ operator: 'gross' as any })] };
    expect(pruefeBedingungen(ohne, GUELTIG)).toEqual(['Bedingung: Bitte einen Operator auswählen.']);
    expect(pruefeBedingungen(falsch, GUELTIG)).toEqual(['Bedingung: Bitte einen Operator auswählen.']);
  });

  it.each(['gleich', 'ungleich'] as const)('meldet bei %s einen fehlenden oder leeren Vergleichswert', (operator) => {
    const doc = {
      type: 'doc',
      content: [bedingung({ operator, wert: '   ' }), bedingung({ operator, wert: null })],
    };
    expect(pruefeBedingungen(doc, GUELTIG)).toEqual([
      'Bedingung: Bitte einen Vergleichswert angeben.',
      'Bedingung: Bitte einen Vergleichswert angeben.',
    ]);
  });

  it('verlangt keinen Wert bei ausgefuellt und leer', () => {
    const doc = { type: 'doc', content: [bedingung({ operator: 'leer', wert: null })] };
    expect(pruefeBedingungen(doc, GUELTIG)).toEqual([]);
  });

  it('ignoriert Dokumente ohne Bedingungen', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'mention', attrs: { id: 'x' } }] }] };
    expect(pruefeBedingungen(doc, GUELTIG)).toEqual([]);
  });
});

describe('formatBedingungPraefix', () => {
  it('beschreibt eine Bedingung mit Vergleichswert', () => {
    expect(formatBedingungPraefix({ variable: 'mieter.name', operator: 'gleich', wert: 'Frau' }, 'Mieter.Name'))
      .toBe('[Wenn Mieter.Name ist gleich „Frau“] ');
  });

  it('lässt den Wert bei ausgefüllt und leer weg', () => {
    expect(formatBedingungPraefix({ operator: 'ausgefuellt', wert: 'egal' }, 'Mieter.Email')).toBe('[Wenn Mieter.Email ist ausgefüllt] ');
    expect(formatBedingungPraefix({ operator: 'leer' }, 'Mieter.Email')).toBe('[Wenn Mieter.Email ist leer] ');
  });

  it('bleibt bei fehlendem Operator lesbar', () => {
    expect(formatBedingungPraefix({}, 'Mieter.Name')).toBe('[Wenn Mieter.Name] ');
  });
});
