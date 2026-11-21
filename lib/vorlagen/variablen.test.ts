import { anredeVoll, loeseVariable, type VorlagenKontext } from './variablen';

const musterMieterin: VorlagenKontext['mieter'] = {
  anrede: 'frau',
  vorname: 'Erika',
  nachname: 'Muster',
  name: 'Erika Muster',
  email: 'erika@example.test',
  telefonnummer: '0000 1234567',
};

describe('anredeVoll', () => {
  it('bildet "Sehr geehrte Frau <Nachname>" bei Anrede frau', () => {
    expect(anredeVoll(musterMieterin)).toBe('Sehr geehrte Frau Muster');
  });

  it('bildet "Sehr geehrter Herr <Nachname>" bei Anrede herr', () => {
    expect(anredeVoll({ anrede: 'herr', vorname: 'Max', nachname: 'Muster', name: 'Max Muster' })).toBe(
      'Sehr geehrter Herr Muster'
    );
  });

  it('nutzt "Guten Tag <Vorname Nachname>" bei keine_angabe', () => {
    expect(anredeVoll({ anrede: 'keine_angabe', vorname: 'Max', nachname: 'Muster', name: 'Max Muster' })).toBe(
      'Guten Tag Max Muster'
    );
  });

  it('nutzt "Guten Tag <ganzer Name>" bei Altdaten im Nachnamen', () => {
    expect(anredeVoll({ anrede: 'keine_angabe', vorname: null, nachname: 'Erika Mustermann', name: 'Erika Mustermann' })).toBe(
      'Guten Tag Erika Mustermann'
    );
  });

  it('nutzt "Guten Tag <Vorname>" bei Anrede frau ohne Nachname', () => {
    expect(anredeVoll({ anrede: 'frau', vorname: 'Erika', nachname: null, name: 'Erika' })).toBe('Guten Tag Erika');
  });

  it('fällt auf das Feld name zurück, wenn Vor- und Nachname fehlen', () => {
    expect(anredeVoll({ anrede: 'keine_angabe', vorname: null, nachname: null, name: 'Erika Muster' })).toBe(
      'Guten Tag Erika Muster'
    );
  });

  it('liefert "Guten Tag" ohne jeden Namen', () => {
    expect(anredeVoll({ anrede: null, vorname: null, nachname: null, name: null })).toBe('Guten Tag');
    expect(anredeVoll({ anrede: 'frau', vorname: '  ', nachname: '  ', name: '' })).toBe('Guten Tag');
  });

  it('liefert "Guten Tag" ohne Mieter', () => {
    expect(anredeVoll(null)).toBe('Guten Tag');
    expect(anredeVoll(undefined)).toBe('Guten Tag');
  });

  it('hängt kein Komma an', () => {
    expect(anredeVoll(musterMieterin).endsWith(',')).toBe(false);
  });

  it('entfernt Leerzeichen am Rand des Nachnamens', () => {
    expect(anredeVoll({ anrede: 'frau', nachname: '  Muster  ' })).toBe('Sehr geehrte Frau Muster');
  });
});

describe('loeseVariable', () => {
  const kontext: VorlagenKontext = {
    mieter: musterMieterin,
    vermieter: { name: 'Hausverwaltung Beispiel' },
    heute: new Date(2026, 10, 21),
  };

  it('löst Mieter-Felder per ID auf', () => {
    expect(loeseVariable('mieter.name', kontext)).toBe('Erika Muster');
    expect(loeseVariable('mieter.vorname', kontext)).toBe('Erika');
    expect(loeseVariable('mieter.nachname', kontext)).toBe('Muster');
    expect(loeseVariable('mieter.email', kontext)).toBe('erika@example.test');
    expect(loeseVariable('mieter.telefon', kontext)).toBe('0000 1234567');
  });

  it('löst die Anrede als Kurzform auf', () => {
    expect(loeseVariable('mieter.anrede', kontext)).toBe('Frau');
    expect(loeseVariable('mieter.anrede', { mieter: { ...musterMieterin, anrede: 'herr' } })).toBe('Herr');
  });

  it('liefert bei keine_angabe einen leeren String für die Anrede', () => {
    expect(loeseVariable('mieter.anrede', { mieter: { anrede: 'keine_angabe', nachname: 'Muster' } })).toBe('');
  });

  it('liefert null für die Anrede, wenn sie unbekannt ist', () => {
    expect(loeseVariable('mieter.anrede', { mieter: { anrede: null, nachname: 'Muster' } })).toBeNull();
  });

  it('löst die komplette Briefanrede auf', () => {
    expect(loeseVariable('mieter.anrede_voll', kontext)).toBe('Sehr geehrte Frau Muster');
    expect(loeseVariable('mieter.anrede_voll', { mieter: { anrede: 'keine_angabe', name: 'Max Muster' } })).toBe(
      'Guten Tag Max Muster'
    );
  });

  it('liefert null für Mieter-Variablen ohne Mieter', () => {
    expect(loeseVariable('mieter.name', {})).toBeNull();
    expect(loeseVariable('mieter.anrede', {})).toBeNull();
    expect(loeseVariable('mieter.anrede_voll', {})).toBeNull();
    expect(loeseVariable('mieter.email', { mieter: null })).toBeNull();
  });

  it('liefert leeren Text für leere Mieter-Felder (kein Platzhalter im versendeten Text)', () => {
    expect(loeseVariable('mieter.email', { mieter: { email: '  ' } })).toBe('');
    expect(loeseVariable('mieter.telefon', { mieter: { telefonnummer: null } })).toBe('');
    expect(loeseVariable('mieter.nachname', { mieter: { nachname: '' } })).toBe('');
  });

  it('liefert null ohne Mieter-Kontext', () => {
    expect(loeseVariable('mieter.email', {})).toBeNull();
  });

  it('nutzt das Feld name, wenn Vor- und Nachname fehlen', () => {
    expect(loeseVariable('mieter.name', { mieter: { name: 'Erika Muster' } })).toBe('Erika Muster');
  });

  it('formatiert das Datum im deutschen Format', () => {
    expect(loeseVariable('datum.heute', kontext)).toBe('21.11.2026');
  });

  it('löst den Vermieternamen auf', () => {
    expect(loeseVariable('vermieter.name', kontext)).toBe('Hausverwaltung Beispiel');
    expect(loeseVariable('vermieter.name', {})).toBeNull();
  });

  it('liefert null für unbekannte und nicht unterstützte IDs', () => {
    expect(loeseVariable('wohnung.adresse', kontext)).toBeNull();
    expect(loeseVariable('datum.monat', kontext)).toBeNull();
    expect(loeseVariable('gibt.es.nicht', kontext)).toBeNull();
  });

  it('löst nicht über das Label auf', () => {
    expect(loeseVariable('Mieter.Name', kontext)).toBeNull();
    expect(loeseVariable('mieter.Name', kontext)).toBeNull();
  });
});
