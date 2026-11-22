import { personEingabeAusBody } from '@/lib/mieter-schreibpfad';

describe('personEingabeAusBody: Altfeld name', () => {
  it('legt beim Anlegen nachname = name an und lässt vorname weg', () => {
    expect(personEingabeAusBody({ name: 'Beispiel Mieter' }, 'anlegen')).toEqual({ nachname: 'Beispiel Mieter' });
  });

  it('setzt beim Ändern nur mit name nachname = name und vorname = null', () => {
    expect(personEingabeAusBody({ name: 'Beispiel Mieter' }, 'aendern')).toEqual({
      nachname: 'Beispiel Mieter',
      vorname: null,
    });
  });

  it('übernimmt beim Ändern einen mitgesendeten vorname nicht zu null', () => {
    expect(personEingabeAusBody({ name: 'Muster', vorname: 'Erika' }, 'aendern')).toEqual({
      nachname: 'Muster',
      vorname: 'Erika',
    });
  });

  it('übernimmt beim Ändern keinen vorname=null, wenn nachname bereits gesendet wird', () => {
    expect(personEingabeAusBody({ name: 'Alt', nachname: 'Neu' }, 'aendern')).toEqual({ nachname: 'Neu' });
  });

  it('setzt beim Ändern ohne name nichts zusätzlich', () => {
    expect(personEingabeAusBody({ email: 'beispiel@example.invalid' }, 'aendern')).toEqual({
      email: 'beispiel@example.invalid',
    });
  });
});
