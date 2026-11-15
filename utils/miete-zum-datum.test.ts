import { mieteZumDatum, mieteImMonat } from '@/utils/miete-zum-datum';
import type { MietEintragKurz } from '@/types/Mietverhaeltnis';

const historie: MietEintragKurz[] = [
  { gueltig_ab: '2024-01-01', betrag: 500 },
  { gueltig_ab: '2025-06-01', betrag: 550 },
  { gueltig_ab: '2026-03-01', betrag: 600 },
];

describe('mieteZumDatum', () => {
  it('nutzt den Fallback bei leerer, null- oder undefined-Historie', () => {
    expect(mieteZumDatum([], '2025-01-15', 700)).toBe(700);
    expect(mieteZumDatum(null, '2025-01-15', 700)).toBe(700);
    expect(mieteZumDatum(undefined, '2025-01-15', 700)).toBe(700);
  });

  it('nimmt den Eintrag, dessen gueltig_ab genau dem Datum entspricht', () => {
    expect(mieteZumDatum(historie, '2025-06-01', 700)).toBe(550);
  });

  it('nimmt den letzten gueltigen Eintrag zwischen zwei Wechseln', () => {
    expect(mieteZumDatum(historie, '2025-12-31', 700)).toBe(550);
    expect(mieteZumDatum(historie, '2025-05-31', 700)).toBe(500);
  });

  it('nutzt den Fallback, wenn das Datum vor dem ersten Eintrag liegt', () => {
    expect(mieteZumDatum(historie, '2023-12-31', 700)).toBe(700);
  });

  it('verarbeitet unsortierte Eingaben, ohne das Eingabe-Array zu verändern', () => {
    const unsortiert: MietEintragKurz[] = [
      { gueltig_ab: '2026-03-01', betrag: 600 },
      { gueltig_ab: '2024-01-01', betrag: 500 },
      { gueltig_ab: '2025-06-01', betrag: 550 },
    ];
    const kopie = unsortiert.map((e) => ({ ...e }));

    expect(mieteZumDatum(unsortiert, '2025-07-10', 700)).toBe(550);
    expect(unsortiert).toEqual(kopie);
  });

  it('liest String-Beträge (Supabase liefert numeric teils als String)', () => {
    const alsString = [
      { gueltig_ab: '2024-01-01', betrag: '500.00' as unknown as number },
      { gueltig_ab: '2025-06-01', betrag: '550.50' as unknown as number },
    ];
    expect(mieteZumDatum(alsString, '2025-07-01', 700)).toBe(550.5);
  });

  it('ignoriert nicht endliche Beträge und Beträge ohne Wert', () => {
    const kaputt = [
      { gueltig_ab: '2024-01-01', betrag: 500 },
      { gueltig_ab: '2025-06-01', betrag: 'abc' as unknown as number },
      { gueltig_ab: '2025-07-01', betrag: null as unknown as number },
      { gueltig_ab: '2025-08-01', betrag: NaN },
    ];
    expect(mieteZumDatum(kaputt, '2025-09-01', 700)).toBe(500);
  });

  it('liest ein Date-Objekt am Monatsanfang und Monatsende über seine lokalen Werte', () => {
    expect(mieteZumDatum(historie, new Date(2025, 5, 1), 700)).toBe(550);
    expect(mieteZumDatum(historie, new Date(2025, 5, 1, 0, 0, 0), 700)).toBe(550);
    expect(mieteZumDatum(historie, new Date(2025, 4, 31, 23, 59, 59), 700)).toBe(500);
    expect(mieteZumDatum(historie, new Date(2026, 2, 31, 23, 59, 59), 700)).toBe(600);
  });

  it('nutzt den Fallback bei einem ungültigen Datum', () => {
    expect(mieteZumDatum(historie, new Date('kein datum'), 700)).toBe(700);
    expect(mieteZumDatum(historie, 'kein datum', 700)).toBe(700);
  });
});

describe('mieteImMonat', () => {
  it('nutzt den Fallback bei leerer Historie', () => {
    expect(mieteImMonat([], 2025, 0, 700)).toBe(700);
    expect(mieteImMonat(null, 2025, 0, 700)).toBe(700);
  });

  it('nimmt die Miete am ersten Tag des Monats', () => {
    expect(mieteImMonat(historie, 2025, 5, 700)).toBe(550); // Juni 2025, Eintrag am 1.6.
    expect(mieteImMonat(historie, 2025, 4, 700)).toBe(500); // Mai 2025
  });

  it('nutzt den Fallback, wenn der Monat vor dem ersten Eintrag liegt', () => {
    expect(mieteImMonat(historie, 2023, 11, 700)).toBe(700);
  });

  it('nimmt bei einem Wechsel mitten im Monat ohne früheren Eintrag den Fallback', () => {
    // Eintrag am 15. Mai, kein früherer Eintrag: der Monat bleibt beim Fallback
    const mitte: MietEintragKurz[] = [{ gueltig_ab: '2025-05-15', betrag: 800 }];
    expect(mieteImMonat(mitte, 2025, 4, 700)).toBe(700);
    // Ab dem nächsten Monatsersten gilt der neue Betrag
    expect(mieteImMonat(mitte, 2025, 5, 700)).toBe(800);
  });

  it('nimmt bei einem Wechsel mitten im Monat mit früherem Eintrag den früheren Betrag für den ganzen Monat', () => {
    const mitte: MietEintragKurz[] = [
      { gueltig_ab: '2025-01-01', betrag: 500 },
      { gueltig_ab: '2025-05-15', betrag: 800 },
    ];
    expect(mieteImMonat(mitte, 2025, 4, 700)).toBe(500);
    expect(mieteImMonat(mitte, 2025, 5, 700)).toBe(800);
  });

  it('liest String-Beträge', () => {
    const alsString = [{ gueltig_ab: '2025-01-01', betrag: '510.00' as unknown as number }];
    expect(mieteImMonat(alsString, 2025, 2, 700)).toBe(510);
  });

  it('nutzt den Fallback bei ungültigen Monatsangaben', () => {
    expect(mieteImMonat(historie, 2025, 12, 700)).toBe(700);
    expect(mieteImMonat(historie, 2025, -1, 700)).toBe(700);
  });
});
