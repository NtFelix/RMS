import { MIETER_PERSON_EMBED } from './personen';
import {
  MIETER_SCHREIBBARE_SPALTEN,
  MIETER_SPALTEN_OHNE_KAUTION,
  pickMieterSchreibbareFelder,
} from './mieter-columns';

/** Oberste Spalten der Select-Liste (die eingebettete Person in Klammern wird nicht zerlegt). */
function obersteSpalten(select: string): string[] {
  const teile: string[] = [];
  let tiefe = 0;
  let aktuell = '';
  for (const zeichen of select) {
    if (zeichen === '(') tiefe += 1;
    if (zeichen === ')') tiefe -= 1;
    if (zeichen === ',' && tiefe === 0) {
      teile.push(aktuell.trim());
      aktuell = '';
    } else {
      aktuell += zeichen;
    }
  }
  if (aktuell.trim()) teile.push(aktuell.trim());
  return teile;
}

describe('MIETER_SPALTEN_OHNE_KAUTION', () => {
  const columns = obersteSpalten(MIETER_SPALTEN_OHNE_KAUTION);

  it('enthält das Altfeld kaution nicht und ist keine Wildcard-Auswahl', () => {
    expect(columns).not.toContain('kaution');
    expect(columns).not.toContain('*');
    expect(MIETER_SPALTEN_OHNE_KAUTION).not.toMatch(/kaution/i);
  });

  it('enthält die fachlichen Mieterspalten und die eingebettete Person', () => {
    expect(columns).toEqual(
      expect.arrayContaining([
        'id', 'wohnung_id', 'person_id', 'einzug', 'auszug', 'notiz', 'nebenkosten', MIETER_PERSON_EMBED,
      ])
    );
  });

  it('enthält keine personenbezogenen Altfelder und keine Bewerber-Felder mehr als eigene Spalten', () => {
    for (const altesFeld of ['name', 'email', 'telefonnummer', 'status', 'bewerbung_score', 'bewerbung_metadaten', 'bewerbung_mail_id']) {
      expect(columns).not.toContain(altesFeld);
    }
  });

  it('enthält keine Spalte doppelt', () => {
    expect(new Set(columns).size).toBe(columns.length);
  });
});

describe('MIETER_SCHREIBBARE_SPALTEN', () => {
  it('ist eine Teilmenge der lesbaren Spalten und enthält weder kaution, Person-Felder noch Schlüssel- oder Systemfelder', () => {
    const readable = obersteSpalten(MIETER_SPALTEN_OHNE_KAUTION);
    for (const column of MIETER_SCHREIBBARE_SPALTEN) {
      expect(readable).toContain(column);
    }
    for (const forbidden of [
      'kaution', 'id', 'organisation_id', 'person_id', 'name', 'email', 'telefonnummer', 'status',
      'bewerbung_score', 'erstellt_von', 'geaendert_von', 'geloescht_am', 'geloescht_von',
    ]) {
      expect(MIETER_SCHREIBBARE_SPALTEN).not.toContain(forbidden);
    }
  });
});

describe('pickMieterSchreibbareFelder', () => {
  it('verwirft das Altfeld kaution und Person-Felder und übernimmt die übrigen schreibbaren Felder', () => {
    const result = pickMieterSchreibbareFelder({
      notiz: 'Beispielnotiz',
      einzug: '2025-01-01',
      name: 'Beispiel Mieter',
      email: 'beispiel@example.invalid',
      kaution: { amount: 1000, paymentDate: '2025-01-01', status: 'Erhalten' },
    });

    expect(result).toEqual({ notiz: 'Beispielnotiz', einzug: '2025-01-01' });
    expect(result).not.toHaveProperty('kaution');
    expect(result).not.toHaveProperty('name');
    expect(result).not.toHaveProperty('email');
  });

  it('verwirft Schlüssel-, Mandanten-, Person- und Systemfelder sowie unbekannte Felder', () => {
    const result = pickMieterSchreibbareFelder({
      id: 'fremde-id',
      organisation_id: 'fremde-organisation',
      person_id: 'fremde-person',
      status: 'bewerber',
      geloescht_am: '2025-01-01T00:00:00Z',
      geloescht_von: 'nutzer',
      erstellt_von: 'nutzer',
      unbekannt: 1,
      notiz: 'ok',
    });

    expect(result).toEqual({ notiz: 'ok' });
  });

  it('übernimmt explizit gesetzte null-Werte, aber keine undefined-Werte', () => {
    expect(pickMieterSchreibbareFelder({ auszug: null, einzug: undefined, wohnung_id: null })).toEqual({
      auszug: null,
      wohnung_id: null,
    });
  });

  it('liefert ein leeres Objekt, wenn nur gesperrte Felder gesendet werden', () => {
    expect(pickMieterSchreibbareFelder({ kaution: { amount: 1 }, name: 'Beispiel' })).toEqual({});
  });

  it('übernimmt keine geerbten Eigenschaften (Prototype-Pollution-Schutz)', () => {
    const body = JSON.parse('{"__proto__": {"notiz": "geerbt"}, "notiz": "ok"}');
    const result = pickMieterSchreibbareFelder(body);

    expect(result).toEqual({ notiz: 'ok' });
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });

  it.each([null, undefined, 'text', 42, true, [], [{ notiz: 'a' }]])('liefert null bei ungültigem Body (%p)', (input) => {
    expect(pickMieterSchreibbareFelder(input)).toBeNull();
  });
});
