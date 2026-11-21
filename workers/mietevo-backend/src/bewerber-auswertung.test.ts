import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
    speichereBewerberAuswertung,
    personFelderAusAuswertung,
    ausgabeOhnePersonenangaben,
    promptOhneEmailInhalt,
} from './index';

type Aufruf = {
    tabelle: string;
    werte: Record<string, unknown>;
    filter: [string, unknown];
};

/**
 * Minimaler Supabase-Ersatz: zeichnet update/eq auf und liefert für Bewerber die übergebene Zeile
 * (oder keine Zeile). Alle Daten sind erfundene Testwerte.
 */
function fakeSupabase(optionen: {
    bewerber?: { id: string; person_id: string | null } | null;
    bewerberFehler?: string;
    personFehler?: string;
}) {
    const aufrufe: Aufruf[] = [];
    const supabase = {
        from(tabelle: string) {
            return {
                update(werte: Record<string, unknown>) {
                    return {
                        eq(spalte: string, wert: unknown) {
                            aufrufe.push({ tabelle, werte, filter: [spalte, wert] });
                            const fehler = tabelle === 'Bewerber' ? optionen.bewerberFehler : optionen.personFehler;
                            const daten = tabelle === 'Bewerber' && optionen.bewerber ? [optionen.bewerber] : [];
                            const ergebnis = { data: daten, error: fehler ? { message: fehler } : null };
                            return Object.assign(Promise.resolve(ergebnis), {
                                select: () => Promise.resolve(ergebnis),
                            });
                        },
                    };
                },
            };
        },
    };
    return { supabase: supabase as unknown as SupabaseClient, aufrufe };
}

const beispielAuswertung = {
    personalInfo: {
        salutation: 'Frau',
        firstName: 'Testa',
        lastName: 'Beispiel',
        email: 'testa@example.invalid',
        phone: '+49 000 0000000',
    },
    application: { completenessScore: 80 },
    redFlags: [],
};

describe('personFelderAusAuswertung', () => {
    it('ordnet Vor- und Nachname, E-Mail und Telefon den Personenfeldern zu', () => {
        expect(personFelderAusAuswertung(beispielAuswertung.personalInfo)).toEqual({
            vorname: 'Testa',
            nachname: 'Beispiel',
            email: 'testa@example.invalid',
            telefon: '+49 000 0000000',
        });
    });

    it('übernimmt leere oder fehlende Werte nicht', () => {
        expect(personFelderAusAuswertung({ firstName: '  ', lastName: '', email: null, phone: 'x' })).toEqual({
            telefon: 'x',
        });
        expect(personFelderAusAuswertung(undefined)).toEqual({});
    });
});

describe('speichereBewerberAuswertung', () => {
    it('sucht die Bewerber-Zeile per bewerbung_mail_id und setzt Score und Metadaten dort', async () => {
        const { supabase, aufrufe } = fakeSupabase({
            bewerber: { id: 'b-1', person_id: 'p-1' },
        });

        const ergebnis = await speichereBewerberAuswertung(supabase, 'mail-1', beispielAuswertung, 80);

        expect(ergebnis).toEqual({ bewerberGefunden: true, personAktualisiert: true });
        const bewerberAufruf = aufrufe.find(a => a.tabelle === 'Bewerber');
        expect(bewerberAufruf).toBeDefined();
        expect(bewerberAufruf!.filter).toEqual(['bewerbung_mail_id', 'mail-1']);
        expect(bewerberAufruf!.werte).toEqual({
            bewerbung_metadaten: beispielAuswertung,
            bewerbung_score: 80,
        });
    });

    it('schreibt Kontaktdaten in die Person über person_id und nie in "Mieter"', async () => {
        const { supabase, aufrufe } = fakeSupabase({
            bewerber: { id: 'b-1', person_id: 'p-1' },
        });

        await speichereBewerberAuswertung(supabase, 'mail-1', beispielAuswertung, 80);

        const personAufruf = aufrufe.find(a => a.tabelle === 'Personen');
        expect(personAufruf).toBeDefined();
        expect(personAufruf!.filter).toEqual(['id', 'p-1']);
        expect(personAufruf!.werte).toEqual({
            vorname: 'Testa',
            nachname: 'Beispiel',
            email: 'testa@example.invalid',
            telefon: '+49 000 0000000',
        });
        expect(aufrufe.some(a => a.tabelle === 'Mieter')).toBe(false);
    });

    it('lässt die Person unangetastet, wenn die KI keine Kontaktdaten liefert', async () => {
        const { supabase, aufrufe } = fakeSupabase({
            bewerber: { id: 'b-1', person_id: 'p-1' },
        });

        const ergebnis = await speichereBewerberAuswertung(supabase, 'mail-1', { personalInfo: {} }, null);

        expect(ergebnis).toEqual({ bewerberGefunden: true, personAktualisiert: false });
        expect(aufrufe.some(a => a.tabelle === 'Personen')).toBe(false);
    });

    it('meldet ohne passende Bewerber-Zeile, ohne zu werfen und ohne Person zu schreiben', async () => {
        const { supabase, aufrufe } = fakeSupabase({ bewerber: null });

        const ergebnis = await speichereBewerberAuswertung(supabase, 'unbekannt', beispielAuswertung, 50);

        expect(ergebnis).toEqual({ bewerberGefunden: false, personAktualisiert: false });
        expect(aufrufe.map(a => a.tabelle)).toEqual(['Bewerber']);
    });

    it('überspringt die Person, wenn die Bewerber-Zeile keine person_id hat', async () => {
        const { supabase, aufrufe } = fakeSupabase({
            bewerber: { id: 'b-1', person_id: null },
        });

        const ergebnis = await speichereBewerberAuswertung(supabase, 'mail-1', beispielAuswertung, 80);

        expect(ergebnis).toEqual({ bewerberGefunden: true, personAktualisiert: false });
        expect(aufrufe.some(a => a.tabelle === 'Personen')).toBe(false);
    });

    it('wirft bei Fehler beim Bewerber-Update, damit die Queue-Nachricht erhalten bleibt', async () => {
        const { supabase } = fakeSupabase({ bewerberFehler: 'boom' });

        await expect(speichereBewerberAuswertung(supabase, 'mail-1', beispielAuswertung, 80)).rejects.toEqual({
            message: 'boom',
        });
    });

    it('wirft bei Fehler beim Personen-Update', async () => {
        const { supabase } = fakeSupabase({
            bewerber: { id: 'b-1', person_id: 'p-1' },
            personFehler: 'boom',
        });

        await expect(speichereBewerberAuswertung(supabase, 'mail-1', beispielAuswertung, 80)).rejects.toEqual({
            message: 'boom',
        });
    });
});

describe('Datenschutz der PostHog-Analyse', () => {
    it('entfernt personalInfo aus der KI-Ausgabe und lässt den Rest stehen', () => {
        const bereinigt = ausgabeOhnePersonenangaben(beispielAuswertung) as Record<string, unknown>;
        expect(bereinigt).not.toHaveProperty('personalInfo');
        expect(bereinigt.application).toEqual({ completenessScore: 80 });
        expect(JSON.stringify(bereinigt)).not.toContain('Beispiel');
    });

    it('ersetzt den E-Mail-Inhalt im Prompt durch einen Platzhalter', () => {
        const emailInhalt = 'Hallo, hier ist Testa Beispiel mit Telefon 000.';
        const prompt = `Analysiere.\n    ---\n    ${emailInhalt}\n    ---\n    Schema`;

        const bereinigt = promptOhneEmailInhalt(prompt, emailInhalt);

        expect(bereinigt).not.toContain('Testa Beispiel');
        expect(bereinigt).toContain('[E-Mail-Inhalt aus Datenschutzgründen entfernt]');
        expect(bereinigt).toContain('Analysiere.');
        expect(bereinigt).toContain('Schema');
    });

    it('lässt den Prompt bei leerem E-Mail-Inhalt unverändert', () => {
        expect(promptOhneEmailInhalt('Prompt', '')).toBe('Prompt');
    });
});
