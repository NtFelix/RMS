import { describe, it, expect, vi } from 'vitest';
import { handleFileGeneration, contentDispositionAttachment, isWorkerAuthenticated, Env } from './index';
import { ExecutionContext } from './logger';

// Same jsPDF instrumentation as index.test.ts: every string passed to doc.text() is recorded, so the
// PDF content can be asserted on without a PDF parser. Synthetic test data only (Muster ...).
const { pdfTextLog } = vi.hoisted(() => ({ pdfTextLog: [] as unknown[] }));

vi.mock('jspdf', async () => {
    const actual = await vi.importActual<typeof import('jspdf')>('jspdf');
    class InstrumentedJsPDF extends actual.jsPDF {
        constructor(...args: ConstructorParameters<typeof actual.jsPDF>) {
            super(...args);
            const originalText = (this.text as (...a: unknown[]) => unknown).bind(this);
            (this as unknown as Record<string, unknown>).text = (...args: unknown[]) => {
                pdfTextLog.push(args[0]);
                return originalText(...args);
            };
        }
    }
    return { ...actual, jsPDF: InstrumentedJsPDF };
});

const mockEnv = {
    GEMINI_API_KEY: 'test-key',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-role-key',
    RATE_LIMITER: {
        limit: vi.fn().mockResolvedValue({ success: true })
    },
    WORKER_AUTH_KEY: 'test-auth-key'
};

const mockCtx = {
    waitUntil: vi.fn()
};

const CTRL_NUL = String.fromCharCode(0);
const CTRL_BEL = String.fromCharCode(7);
const CTRL_C1 = String.fromCharCode(0x9b);

type Bewegung = Record<string, unknown>;

function beispielBewegungen(): Bewegung[] {
    return [
        { wertstellung: '2025-09-01', bewegungsart: 'einzahlung', betrag: 1000, kategorie: null, grund: null, zinszeitraum_von: null, zinszeitraum_bis: null, saldo_nach_buchung: 1000 },
        { wertstellung: '2025-12-31', bewegungsart: 'zinsgutschrift', betrag: 10, kategorie: null, grund: null, zinszeitraum_von: '2025-09-01', zinszeitraum_bis: '2025-12-31', saldo_nach_buchung: 1010 },
        { wertstellung: '2026-02-01', bewegungsart: 'abzug', betrag: 100, kategorie: 'nebenkosten', grund: 'Nebenkostenabrechnung 2025', zinszeitraum_von: null, zinszeitraum_bis: null, saldo_nach_buchung: 910 },
        { wertstellung: '2026-02-28', bewegungsart: 'auszahlung', betrag: 500, kategorie: null, grund: 'Teilauszahlung', zinszeitraum_von: null, zinszeitraum_bis: null, saldo_nach_buchung: 410 },
    ];
}

// Synthetic payload in the form of get_kaution_abrechnung (contract example, names replaced by test values).
function beispielPayload(art: 'zwischen' | 'end', overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        art,
        regelwerk_version: 1,
        stichtag: '2026-03-15',
        organisation: { name: 'Muster Verwaltung' },
        mieter: { name: 'Muster Mieter', auszug: '2026-02-28' },
        objekt: { haus: 'Musterhaus', wohnung: 'Whg 1' },
        kaution: { kautionsart: 'barkaution', soll_betrag: 1000, zinsmethode: 'act_365', getrennt_angelegt: true },
        konto: { summe_einzahlungen: 1000, summe_zinsgutschriften: 10, summe_auszahlungen: 500, summe_abzuege: 100, kontostand: 410 },
        abzuege: [{ kategorie: 'nebenkosten', anzahl: 1, summe: 100 }],
        zinsen_offen: null,
        betrag_inkl_zinsen: 410,
        einbehalt: null,
        bewegungen: beispielBewegungen(),
        storniert_anzahl: 0,
        ...overrides,
    };
}

function kautionRequest(data: unknown, filename?: string, headers: Record<string, string> = { 'x-worker-auth': 'test-auth-key' }): Request {
    return new Request('https://worker.com/export', {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'pdf', template: 'kaution-abrechnung', filename, data })
    });
}

async function renderKaution(data: unknown, filename?: string): Promise<{ response: Response; text: string }> {
    pdfTextLog.length = 0;
    const response = await handleFileGeneration(kautionRequest(data, filename), mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);
    const text = pdfTextLog
        .map(value => (Array.isArray(value) ? value.join(' ') : String(value)))
        .join(' | ');
    return { response, text };
}

describe('Kautionsabrechnung-Template (kaution-abrechnung)', () => {
    it('liefert für die Zwischenabrechnung ein PDF', async () => {
        const { response, text } = await renderKaution(beispielPayload('zwischen'), 'zwischen.pdf');

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('application/pdf');
        expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="zwischen.pdf"');
        const bytes = new Uint8Array(await response.arrayBuffer());
        expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('%PDF');
        expect(response.headers.get('X-PDF-Page-Count')).toBe('1');
        expect(text).toContain('Zwischenabrechnung Mietkaution');
        expect(text).not.toContain('Endabrechnung Mietkaution');
    });

    it('liefert für die Endabrechnung ein PDF mit Endabrechnung-Titel', async () => {
        const { response, text } = await renderKaution(beispielPayload('end'));

        expect(response.status).toBe(200);
        const bytes = new Uint8Array(await response.arrayBuffer());
        expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('%PDF');
        expect(text).toContain('Endabrechnung Mietkaution');
        expect(text).not.toContain('Zwischenabrechnung Mietkaution');
    });

    it('zeigt Kopf, Kontoauszug, Vorzeichen und Zusammenfassung', async () => {
        const { text } = await renderKaution(beispielPayload('zwischen'));

        expect(text).toContain('Vermieter/Verwaltung: Muster Verwaltung');
        expect(text).toContain('Mieter: Muster Mieter');
        expect(text).toContain('Objekt: Musterhaus, Whg 1');
        expect(text).toContain('Auszug: 28.02.2026');
        expect(text).toContain('Stichtag: 15.03.2026');
        expect(text).toContain('Kautionsart: Barkaution');
        expect(text).toContain('Zinsmethode: act/365');
        expect(text).toContain('Kontoauszug');
        expect(text).toContain('+1.000,00');
        expect(text).toContain('-100,00');
        expect(text).toContain('-500,00');
        expect(text).toContain('Zinsgutschrift (01.09.2025');
        expect(text).toContain('Abzug (Nebenkosten)');
        expect(text).toContain('Nebenkostenabrechnung 2025');
        expect(text).toContain('Zusammenfassung');
        expect(text).toContain('Abzüge Nebenkosten (1 Buchung)');
        expect(text).toContain('Noch auf dem Kautionskonto');
        expect(text).toContain('410,00');
    });

    it('zeigt den Einbehalt nur bei der Zwischenabrechnung', async () => {
        const einbehalt = { grund: 'Nebenkostenabrechnung offen', seit: '2026-03-01', liegedauer_tage: 14 };

        const zwischen = await renderKaution(beispielPayload('zwischen', { einbehalt }));
        expect(zwischen.text).toContain('Einbehalt');
        expect(zwischen.text).toContain('Noch einbehalten: 410,00');
        expect(zwischen.text).toContain('Nebenkostenabrechnung offen');
        expect(zwischen.text).toContain('seit 01.03.2026 (Liegedauer 14 Tage)');
        expect(zwischen.text).not.toContain('Auszuzahlender Restbetrag');

        const end = await renderKaution(beispielPayload('end', { einbehalt }));
        expect(end.text).not.toContain('Noch einbehalten');
        expect(end.text).not.toContain('Liegedauer');
        expect(end.text).toContain('Auszuzahlender Restbetrag: 410,00');
    });

    it('zeigt den Zinsblock mit Vorschlag und den Betrag inklusive Zinsen', async () => {
        const payload = beispielPayload('zwischen', {
            zinsen_offen: { moeglich: true, betrag: 12.34 },
            betrag_inkl_zinsen: 422.34,
        });
        const { text } = await renderKaution(payload);

        expect(text).toContain('Noch nicht gutgeschriebene Zinsen bis zum Stichtag (Berechnung, brutto)');
        expect(text).toContain('12,34');
        expect(text).toContain('Betrag inkl. Zinsen');
        expect(text).toContain('422,34');
        expect(text).toContain('Zinsen brutto berechnet, ohne Steuern und Gebühren.');
    });

    it('nutzt bei der Endabrechnung den Betrag inklusive Zinsen als Restbetrag', async () => {
        const payload = beispielPayload('end', {
            zinsen_offen: { moeglich: true, betrag: 12.34 },
            betrag_inkl_zinsen: 422.34,
        });
        const { text } = await renderKaution(payload);

        expect(text).toContain('Auszuzahlender Restbetrag: 422,34');
        expect(text).toContain('einschließlich noch nicht gutgeschriebener Zinsen bis zum Stichtag (brutto)');
    });

    it('weist ohne Zinssatz darauf hin statt Zinsen auszuweisen', async () => {
        const { text } = await renderKaution(beispielPayload('zwischen', {
            zinsen_offen: { moeglich: false },
            betrag_inkl_zinsen: 410,
        }));

        expect(text).toContain('kein Zinssatz hinterlegt');
        expect(text).not.toContain('Betrag inkl. Zinsen');
        expect(text).not.toContain('Noch nicht gutgeschriebene Zinsen');
    });

    it('lässt den Zinsblock weg, wenn kein Zinsvorschlag vorliegt', async () => {
        const { text } = await renderKaution(beispielPayload('zwischen', { zinsen_offen: null }));

        expect(text).not.toContain('kein Zinssatz hinterlegt');
        expect(text).not.toContain('Betrag inkl. Zinsen');
    });

    it('bricht auf Folgeseiten um, wiederholt den Kopf und nummeriert alle Seiten', async () => {
        const viele: Bewegung[] = [];
        for (let i = 0; i < 150; i++) {
            viele.push({
                wertstellung: '2026-01-01',
                bewegungsart: 'einzahlung',
                betrag: 1,
                kategorie: null,
                grund: `Buchung Nummer ${i + 1}`,
                zinszeitraum_von: null,
                zinszeitraum_bis: null,
                saldo_nach_buchung: i + 1,
            });
        }
        const { response, text } = await renderKaution(beispielPayload('zwischen', {
            bewegungen: viele,
            konto: { summe_einzahlungen: 150, summe_zinsgutschriften: 0, summe_auszahlungen: 0, summe_abzuege: 0, kontostand: 150 },
            abzuege: [],
        }));

        const seiten = Number(response.headers.get('X-PDF-Page-Count'));
        expect(seiten).toBeGreaterThan(1);
        expect(text).toContain(`Seite ${seiten} von ${seiten}`);
        expect(text.split('Erstellt am').length - 1).toBe(seiten);
        // Die Tabellenkopfzeile wird auf jeder Seite mit Buchungen wiederholt (verifiziert: Seiten 1 bis 5
        // tragen den Kopf, Seite 6 nur die Zusammenfassung). Daher mindestens seiten - 1 Wiederholungen.
        expect(text.split('Datum').length - 1).toBeGreaterThanOrEqual(seiten - 1);
        expect(text).toContain('Buchung Nummer 150');
    });

    it('bereinigt Steuerzeichen und Zeilenumbrüche in Namen und Gründen', async () => {
        const payload = beispielPayload('zwischen', {
            mieter: { name: `Max${CTRL_NUL}Muster${CTRL_BEL}\nZeile2${CTRL_C1}`, auszug: null },
        });
        const { text } = await renderKaution(payload);

        expect(text).toContain('Mieter: MaxMuster Zeile2');
        const steuerzeichen = text.split('').some(c => {
            const code = c.charCodeAt(0);
            return (code < 32 && c !== ' ') || (code >= 0x7f && code <= 0x9f);
        });
        expect(steuerzeichen).toBe(false);
    });

    it('kürzt einen 10 000 Zeichen langen Grund auf 500 und einen langen Namen auf 200 Zeichen', async () => {
        const langerGrund = `START ${'Q '.repeat(5000)}ENDE`;
        const langerName = 'Y'.repeat(300);
        const payload = beispielPayload('zwischen', {
            mieter: { name: langerName, auszug: null },
            bewegungen: [{
                wertstellung: '2026-02-01',
                bewegungsart: 'abzug',
                betrag: 100,
                kategorie: 'schaden',
                grund: langerGrund,
                zinszeitraum_von: null,
                zinszeitraum_bis: null,
                saldo_nach_buchung: 900,
            }],
        });
        const { text } = await renderKaution(payload);

        expect(text).toContain('START');
        expect(text).not.toContain('ENDE');
        const anzahlQ = (text.match(/Q/g) ?? []).length;
        expect(anzahlQ).toBeGreaterThan(0);
        expect(anzahlQ).toBeLessThanOrEqual(500);
        const anzahlY = (text.match(/Y/g) ?? []).length;
        expect(anzahlY).toBeLessThanOrEqual(200);
    });

    it('ersetzt Nicht-Zahlen und nicht endliche Werte durch "-"', async () => {
        const payload = beispielPayload('zwischen', {
            konto: { summe_einzahlungen: 'abc', summe_zinsgutschriften: null, summe_auszahlungen: 500, summe_abzuege: 0, kontostand: '410' },
            bewegungen: [],
            abzuege: [],
            zinsen_offen: null,
        });
        const { response, text } = await renderKaution(payload);

        expect(response.status).toBe(200);
        expect(text).toContain('Einzahlungen | ');
        expect(text).not.toContain('NaN');
        expect(text).not.toContain('undefined');
        expect(text).not.toContain('null');
        expect(text).toContain('Keine Buchungen vorhanden');
    });

    it.each([
        ['kein Objekt (Array)', [1, 2, 3]],
        ['kein Objekt (Text)', 'nur text'],
        ['fehlende Nutzlast', undefined],
        ['unbekannte art', beispielPayload('foo' as 'zwischen')],
        ['fehlende art', (() => { const p = beispielPayload('zwischen'); delete p.art; return p; })()],
        ['bewegungen fehlt', (() => { const p = beispielPayload('zwischen'); delete p.bewegungen; return p; })()],
        ['bewegungen kein Array', beispielPayload('zwischen', { bewegungen: 'viel' })],
        ['mehr als 2000 Bewegungen', beispielPayload('zwischen', { bewegungen: Array.from({ length: 2001 }, () => ({ bewegungsart: 'einzahlung', betrag: 1 })) })],
        ['Bewegung kein Objekt', beispielPayload('zwischen', { bewegungen: [null] })],
    ])('antwortet bei ungültiger Nutzlast (%s) mit 400 und JSON-Fehler', async (_fall, data) => {
        const { response } = await renderKaution(data);

        expect(response.status).toBe(400);
        expect(response.headers.get('Content-Type')).toBe('application/json');
        const body = await response.json() as { error?: unknown };
        expect(typeof body.error).toBe('string');
        expect((body.error as string).length).toBeGreaterThan(0);
        expect(JSON.stringify(body)).not.toContain('stack');
    });
});

describe('contentDispositionAttachment', () => {
    it('lässt einen unauffälligen Dateinamen unverändert und schließt das Anführungszeichen', () => {
        expect(contentDispositionAttachment('Abrechnung 2026.pdf', 'x.pdf')).toBe('attachment; filename="Abrechnung 2026.pdf"');
    });

    it('entfernt Anführungszeichen, CR und LF', () => {
        expect(contentDispositionAttachment('a"b.pdf', 'x.pdf')).toBe('attachment; filename="ab.pdf"');
        expect(contentDispositionAttachment(`x${String.fromCharCode(13)}${String.fromCharCode(10)}y.pdf`, 'x.pdf'))
            .toBe('attachment; filename="xy.pdf"');
    });

    it('entfernt Pfadangaben und behält nur den Dateinamen', () => {
        expect(contentDispositionAttachment('../x', 'fallback.pdf')).toBe('attachment; filename="x"');
        expect(contentDispositionAttachment('../../etc/passwd', 'fallback.pdf')).toBe('attachment; filename="passwd"');
        expect(contentDispositionAttachment('..\\..\\x.pdf', 'fallback.pdf')).toBe('attachment; filename="x.pdf"');
    });

    it('nimmt bei leerem, fehlendem oder nur aus Punkten bestehendem Namen den Fallback', () => {
        expect(contentDispositionAttachment(undefined, 'export.csv')).toBe('attachment; filename="export.csv"');
        expect(contentDispositionAttachment('', 'export.csv')).toBe('attachment; filename="export.csv"');
        expect(contentDispositionAttachment('   ', 'export.csv')).toBe('attachment; filename="export.csv"');
        expect(contentDispositionAttachment('...', 'export.csv')).toBe('attachment; filename="export.csv"');
    });

    it('ersetzt Zeichen außerhalb von ASCII-Buchstaben, Ziffern, Punkt, Leerzeichen und Bindestrich', () => {
        expect(contentDispositionAttachment('Übersicht.pdf', 'x.pdf')).toBe('attachment; filename="_bersicht.pdf"');
        expect(contentDispositionAttachment('x"; evil=1', 'x.pdf')).toBe('attachment; filename="x_ evil_1"');
    });

    it('kürzt auf höchstens 100 Zeichen und behält die Endung', () => {
        const lang = `${'a'.repeat(300)}.pdf`;
        expect(contentDispositionAttachment(lang, 'x.pdf')).toBe(`attachment; filename="${'a'.repeat(96)}.pdf"`);
        expect(contentDispositionAttachment('b'.repeat(300), 'x.pdf')).toBe(`attachment; filename="${'b'.repeat(100)}"`);
    });

    it('erzeugt immer einen Header mit geschlossenem Anführungszeichen und nur sicheren Zeichen', () => {
        const eingaben = ['a"b', 'c\r\nd', '../e', 'ö ü ß.pdf', 'x'.repeat(500), '"', '\\\\server\\share\\f.pdf'];
        for (const eingabe of eingaben) {
            expect(contentDispositionAttachment(eingabe, 'x.pdf')).toMatch(/^attachment; filename="[A-Za-z0-9._ -]+"$/);
        }
    });
});

describe('Content-Disposition-Fehler behoben (CSV, ZIP, PDF)', () => {
    const ctx = mockCtx as unknown as ExecutionContext;
    const env = mockEnv as unknown as Env;

    it('CSV: schließt das Anführungszeichen', async () => {
        const request = new Request('https://worker.com/export', {
            method: 'POST',
            body: JSON.stringify({ type: 'csv', data: [{ a: 1 }], filename: 'test.csv' })
        });
        const response = await handleFileGeneration(request, env, ctx);
        expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="test.csv"');
    });

    it('CSV ohne Dateiname: Fallback export.csv', async () => {
        const request = new Request('https://worker.com/export', {
            method: 'POST',
            body: JSON.stringify({ type: 'csv', data: [{ a: 1 }] })
        });
        const response = await handleFileGeneration(request, env, ctx);
        expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="export.csv"');
    });

    it('ZIP (CSV-Dateien): schließt das Anführungszeichen', async () => {
        const request = new Request('https://worker.com/export', {
            method: 'POST',
            body: JSON.stringify({ type: 'zip', data: { bericht: [{ a: 1 }] }, filename: 'export.zip' })
        });
        const response = await handleFileGeneration(request, env, ctx);
        expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="export.zip"');
    });

    it('ZIP (PDF-Dateien): schließt das Anführungszeichen', async () => {
        const request = new Request('https://worker.com/export', {
            method: 'POST',
            body: JSON.stringify({
                type: 'zip',
                template: 'pdf',
                filename: 'pdf-export.zip',
                data: [{
                    name: 'Mieter 1',
                    data: {
                        tenantData: { tenantName: 'Muster Mieter' },
                        nebenkostenItem: { startdatum: '2026-01-01', enddatum: '2026-12-31' }
                    }
                }]
            })
        });
        const response = await handleFileGeneration(request, env, ctx);
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="pdf-export.zip"');
    });

    it('PDF (Hausübersicht): schließt das Anführungszeichen', async () => {
        const request = new Request('https://worker.com/export', {
            method: 'POST',
            body: JSON.stringify({
                type: 'pdf',
                template: 'house-overview',
                nebenkosten: { startdatum: '2026-01-01', enddatum: '2026-12-31', haus_name: 'Test Haus' },
                totalArea: 100,
                totalCosts: 1000,
                costPerSqm: 10,
                filename: 'uebersicht.pdf'
            })
        });
        const response = await handleFileGeneration(request, env, ctx);
        expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="uebersicht.pdf"');
    });

    it('PDF (Kautionsabrechnung): Dateinamen mit Anführungszeichen werden bereinigt', async () => {
        const { response } = await renderKaution(beispielPayload('end'), 'ab"c.pdf');
        expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="abc.pdf"');
    });
});


describe('Authentifizierung des Kaution-Templates', () => {
    const env = mockEnv as unknown as Env;
    const ctx = mockCtx as unknown as ExecutionContext;

    it('lehnt eine Anfrage ohne Schlüssel mit 401 ab und rendert nichts', async () => {
        pdfTextLog.length = 0;
        const response = await handleFileGeneration(kautionRequest(beispielPayload('end'), 'x.pdf', {}), env, ctx);

        expect(response.status).toBe(401);
        expect(pdfTextLog).toHaveLength(0);
        expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });

    it('lehnt einen falschen oder gleich langen falschen Schlüssel ab', async () => {
        for (const key of ['wrong', 'test-auth-kex', 'test-auth-key-und-mehr', '']) {
            const response = await handleFileGeneration(kautionRequest(beispielPayload('end'), 'x.pdf', { 'x-worker-auth': key }), env, ctx);
            expect(response.status).toBe(401);
        }
    });

    it('lehnt ab, wenn im Worker kein Schlüssel konfiguriert ist (fail closed)', async () => {
        const ohneSchluessel = { ...mockEnv, WORKER_AUTH_KEY: undefined } as unknown as Env;
        const response = await handleFileGeneration(kautionRequest(beispielPayload('end'), 'x.pdf', { 'x-worker-auth': 'irgendwas' }), ohneSchluessel, ctx);

        expect(response.status).toBe(401);
        expect(isWorkerAuthenticated(kautionRequest({}, undefined, { 'x-worker-auth': '' }), ohneSchluessel)).toBe(false);
    });

    it('akzeptiert den richtigen Schlüssel', async () => {
        const response = await handleFileGeneration(kautionRequest(beispielPayload('end'), 'x.pdf'), env, ctx);

        expect(response.status).toBe(200);
        expect(isWorkerAuthenticated(kautionRequest({}), env)).toBe(true);
    });

    it('prüft den Schlüssel vor der Nutzlast (ungültige Nutzlast ohne Schlüssel bleibt 401, nicht 400)', async () => {
        const response = await handleFileGeneration(kautionRequest('kein objekt', 'x.pdf', {}), env, ctx);

        expect(response.status).toBe(401);
    });
});
