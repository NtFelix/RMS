import {
  MIETER_SCHREIBBARE_SPALTEN,
  MIETER_SPALTEN_OHNE_KAUTION,
  pickMieterSchreibbareFelder,
} from './mieter-columns';

describe('MIETER_SPALTEN_OHNE_KAUTION', () => {
  const columns = MIETER_SPALTEN_OHNE_KAUTION.split(',').map((c) => c.trim());

  it('enthält das Altfeld kaution nicht und ist keine Wildcard-Auswahl', () => {
    expect(columns).not.toContain('kaution');
    expect(columns).not.toContain('*');
    expect(MIETER_SPALTEN_OHNE_KAUTION).not.toMatch(/kaution/i);
  });

  it('enthält die fachlichen Mieterspalten', () => {
    expect(columns).toEqual(
      expect.arrayContaining([
        'id', 'wohnung_id', 'name', 'einzug', 'auszug', 'email', 'telefonnummer', 'notiz',
        'nebenkosten', 'status', 'bewerbung_score', 'bewerbung_metadaten', 'bewerbung_mail_id',
      ])
    );
  });

  it('enthält keine Spalte doppelt', () => {
    expect(new Set(columns).size).toBe(columns.length);
  });
});

describe('MIETER_SCHREIBBARE_SPALTEN', () => {
  it('ist eine Teilmenge der lesbaren Spalten und enthält weder kaution noch Schlüssel- oder Systemfelder', () => {
    const readable = MIETER_SPALTEN_OHNE_KAUTION.split(',').map((c) => c.trim());
    for (const column of MIETER_SCHREIBBARE_SPALTEN) {
      expect(readable).toContain(column);
    }
    for (const forbidden of ['kaution', 'id', 'organisation_id', 'erstellt_von', 'geaendert_von', 'geloescht_am', 'geloescht_von']) {
      expect(MIETER_SCHREIBBARE_SPALTEN).not.toContain(forbidden);
    }
  });
});

describe('pickMieterSchreibbareFelder', () => {
  it('verwirft das Altfeld kaution und übernimmt die übrigen schreibbaren Felder', () => {
    const result = pickMieterSchreibbareFelder({
      name: 'Beispiel Mieter',
      email: 'beispiel@example.invalid',
      kaution: { amount: 1000, paymentDate: '2025-01-01', status: 'Erhalten' },
    });

    expect(result).toEqual({ name: 'Beispiel Mieter', email: 'beispiel@example.invalid' });
    expect(result).not.toHaveProperty('kaution');
  });

  it('verwirft Schlüssel-, Mandanten- und Systemfelder sowie unbekannte Felder', () => {
    const result = pickMieterSchreibbareFelder({
      id: 'fremde-id',
      organisation_id: 'fremde-organisation',
      geloescht_am: '2025-01-01T00:00:00Z',
      geloescht_von: 'nutzer',
      erstellt_von: 'nutzer',
      unbekannt: 1,
      name: 'Beispiel Mieter',
    });

    expect(result).toEqual({ name: 'Beispiel Mieter' });
  });

  it('übernimmt explizit gesetzte null-Werte, aber keine undefined-Werte', () => {
    expect(pickMieterSchreibbareFelder({ auszug: null, einzug: undefined, wohnung_id: null })).toEqual({
      auszug: null,
      wohnung_id: null,
    });
  });

  it('liefert ein leeres Objekt, wenn nur gesperrte Felder gesendet werden', () => {
    expect(pickMieterSchreibbareFelder({ kaution: { amount: 1 } })).toEqual({});
  });

  it('übernimmt keine geerbten Eigenschaften (Prototype-Pollution-Schutz)', () => {
    const body = JSON.parse('{"__proto__": {"name": "geerbt"}, "notiz": "ok"}');
    const result = pickMieterSchreibbareFelder(body);

    expect(result).toEqual({ notiz: 'ok' });
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });

  it.each([null, undefined, 'text', 42, true, [], [{ name: 'a' }]])('liefert null bei ungültigem Body (%p)', (input) => {
    expect(pickMieterSchreibbareFelder(input)).toBeNull();
  });
});
