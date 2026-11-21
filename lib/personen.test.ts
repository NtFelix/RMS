import type { Person } from './personen';
import {
  ANREDE_OPTIONEN,
  BEWERBER_PERSON_EMBED,
  MIETER_PERSON_EMBED,
  PERSON_SPALTEN,
  hatNamen,
  istAnrede,
  mitPersonenfeldern,
  personAnzeigename,
  personEingabeAusFormData,
} from './personen';

/** Synthetische Person (keine echten Daten). */
const person = {
  id: 'person-1',
  anrede: 'frau' as const,
  vorname: 'Erika',
  nachname: 'Beispiel',
  email: 'erika@example.invalid',
  telefon: '000 0000',
  strasse: 'Musterweg 1',
  plz: '12345',
  ort: 'Musterstadt',
};

describe('personAnzeigename', () => {
  it('verbindet Vor- und Nachnamen mit einem Leerzeichen', () => {
    expect(personAnzeigename(person)).toBe('Erika Beispiel');
  });

  it('ignoriert fehlende Teile und überflüssige Leerzeichen', () => {
    expect(personAnzeigename({ vorname: '  Erika  ', nachname: null })).toBe('Erika');
    expect(personAnzeigename({ vorname: null, nachname: 'Beispiel' })).toBe('Beispiel');
    expect(personAnzeigename({ vorname: '   ', nachname: 'Beispiel' })).toBe('Beispiel');
  });

  it('liefert einen leeren String ohne Person', () => {
    expect(personAnzeigename(null)).toBe('');
    expect(personAnzeigename(undefined)).toBe('');
    expect(personAnzeigename({ vorname: null, nachname: null })).toBe('');
  });
});

describe('mitPersonenfeldern', () => {
  it('bildet eine eingebettete Person (Objekt) auf die bisherigen Felder ab', () => {
    const zeile = mitPersonenfeldern({ id: 'mieter-1', einzug: '2024-01-01', person });

    expect(zeile).toEqual(expect.objectContaining({
      id: 'mieter-1',
      einzug: '2024-01-01',
      name: 'Erika Beispiel',
      email: 'erika@example.invalid',
      telefonnummer: '000 0000',
      anrede: 'frau',
      vorname: 'Erika',
      nachname: 'Beispiel',
    }));
    expect(zeile.person).toBe(person);
  });

  it('akzeptiert die Array-Form der eingebetteten Person und nimmt den ersten Eintrag', () => {
    const zeile = mitPersonenfeldern({ id: 'mieter-2', person: [person, { ...person, id: 'andere', vorname: 'Max' }] });

    expect(zeile.name).toBe('Erika Beispiel');
    expect(zeile.email).toBe('erika@example.invalid');
    expect(zeile.person).toEqual(person);
  });

  it('lässt die Felder leer, wenn keine Person eingebettet ist (z. B. ohne Leseberechtigung)', () => {
    const ohneSchluessel = mitPersonenfeldern({ id: 'mieter-3' } as { id: string; person?: null });
    const mitNull = mitPersonenfeldern({ id: 'mieter-4', person: null });
    const mitLeeremArray = mitPersonenfeldern({ id: 'mieter-5', person: [] as Person[] });

    for (const zeile of [ohneSchluessel, mitNull, mitLeeremArray]) {
      expect(zeile).toEqual(expect.objectContaining({
        name: '',
        email: null,
        telefonnummer: null,
        anrede: 'keine_angabe',
        vorname: null,
        nachname: null,
      }));
    }
    expect(mitNull.person).toBeNull();
    expect(mitLeeremArray.person).toBeNull();
  });

  it('setzt eine unbekannte Anrede auf keine_angabe', () => {
    const zeile = mitPersonenfeldern({ id: 'm', person: { ...person, anrede: 'unbekannt' as never } });

    expect(zeile.anrede).toBe('keine_angabe');
  });

  it('übernimmt die übrigen Schlüssel der Zeile unverändert', () => {
    const zeile = mitPersonenfeldern({ id: 'm', wohnung_id: 'w1', notiz: 'Notiz', person });

    expect(zeile).toEqual(expect.objectContaining({ id: 'm', wohnung_id: 'w1', notiz: 'Notiz' }));
  });
});

describe('Select-Fragmente', () => {
  it('betten die Person über den Fremdschlüssel mit Namen ein', () => {
    expect(MIETER_PERSON_EMBED).toBe(`person:Personen!fk_mieter_person(${PERSON_SPALTEN})`);
    expect(BEWERBER_PERSON_EMBED).toBe(`person:Personen!fk_bewerber_person(${PERSON_SPALTEN})`);
  });

  it('enthält alle Personenspalten, die die Oberfläche braucht', () => {
    for (const spalte of ['id', 'anrede', 'vorname', 'nachname', 'email', 'telefon']) {
      expect(PERSON_SPALTEN.split(',').map((s) => s.trim())).toContain(spalte);
    }
  });
});

describe('Anrede', () => {
  it('kennt die drei Anreden in der Reihenfolge der Auswahl', () => {
    expect(ANREDE_OPTIONEN.map((option) => option.value)).toEqual(['keine_angabe', 'frau', 'herr']);
  });

  it('erkennt gültige Anreden', () => {
    expect(istAnrede('frau')).toBe(true);
    expect(istAnrede('herr')).toBe(true);
    expect(istAnrede('keine_angabe')).toBe(true);
    expect(istAnrede('divers')).toBe(false);
    expect(istAnrede(null)).toBe(false);
  });
});

describe('personEingabeAusFormData', () => {
  it('übernimmt nur vorhandene Felder und trimmt Texte', () => {
    const formData = new FormData();
    formData.set('anrede', 'herr');
    formData.set('vorname', '  Max ');
    formData.set('nachname', 'Muster');

    expect(personEingabeAusFormData(formData)).toEqual({
      anrede: 'herr',
      vorname: 'Max',
      nachname: 'Muster',
    });
  });

  it('macht leere Texte zu null', () => {
    const formData = new FormData();
    formData.set('vorname', '   ');
    formData.set('email', '');
    formData.set('plz', '');

    expect(personEingabeAusFormData(formData)).toEqual({ vorname: null, email: null, plz: null });
  });

  it('nimmt die Telefonnummer aus telefon oder alternativ aus telefonnummer', () => {
    const mitTelefon = new FormData();
    mitTelefon.set('telefon', '000 1');
    expect(personEingabeAusFormData(mitTelefon)).toEqual({ telefon: '000 1' });

    const mitAlternative = new FormData();
    mitAlternative.set('telefonnummer', '000 2');
    expect(personEingabeAusFormData(mitAlternative)).toEqual({ telefon: '000 2' });

    const beidesMitTelefonVorrang = new FormData();
    beidesMitTelefonVorrang.set('telefon', '000 3');
    beidesMitTelefonVorrang.set('telefonnummer', '000 4');
    expect(personEingabeAusFormData(beidesMitTelefonVorrang)).toEqual({ telefon: '000 3' });
  });

  it('setzt eine ungültige Anrede auf keine_angabe und lässt fehlende Anrede weg', () => {
    const ungueltig = new FormData();
    ungueltig.set('anrede', 'divers');
    expect(personEingabeAusFormData(ungueltig)).toEqual({ anrede: 'keine_angabe' });

    expect(personEingabeAusFormData(new FormData())).toEqual({});
  });

  it('übernimmt Adressfelder', () => {
    const formData = new FormData();
    formData.set('strasse', 'Musterweg 1');
    formData.set('plz', '12345');
    formData.set('ort', 'Musterstadt');

    expect(personEingabeAusFormData(formData)).toEqual({ strasse: 'Musterweg 1', plz: '12345', ort: 'Musterstadt' });
  });
});

describe('hatNamen', () => {
  it('verlangt Vor- oder Nachnamen (Pflicht laut Datenbank)', () => {
    expect(hatNamen({ vorname: 'Erika', nachname: null })).toBe(true);
    expect(hatNamen({ vorname: null, nachname: 'Beispiel' })).toBe(true);
    expect(hatNamen({ vorname: '  ', nachname: '' })).toBe(false);
    expect(hatNamen({})).toBe(false);
  });
});
