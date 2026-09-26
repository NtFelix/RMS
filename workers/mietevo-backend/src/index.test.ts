import { describe, it, expect, vi } from 'vitest';
import { handleFileGeneration, processQueue, Env } from './index';
import { formatCurrency, isoToGermanDate, sumZaehlerValues, roundToNearest5, isRechenbasis360 } from './utils';
import { ExecutionContext } from './logger';

// jsPDF assigns its plugin methods (like `text`) as own properties on each instance inside its
// constructor rather than on jsPDF.prototype, so a plain vi.spyOn can't observe them. Instead,
// wrap the real jsPDF class so every instance's `text` is instrumented right after construction,
// and collect every string drawn via doc.text() while a test's `fn` runs — so PDF content can be
// asserted on without a PDF-parsing library.
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

async function collectPdfText(fn: () => Promise<Response>): Promise<{ response: Response; text: string }> {
    pdfTextLog.length = 0;
    const response = await fn();
    const text = pdfTextLog
        .map(value => (Array.isArray(value) ? value.join(' ') : String(value)))
        .join(' | ');
    return { response, text };
}

describe('Backend Worker Tests', () => {
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

    describe('Helper Functions', () => {
        it('formatCurrency should format numbers as EUR', () => {
            // Use contains because the output might have non-breaking spaces
            expect(formatCurrency(10.5)).toContain('10,50');
            expect(formatCurrency(1000)).toContain('1.000,00');
            expect(formatCurrency(null)).toBe('-');
            expect(formatCurrency(undefined)).toBe('-');
        });

        it('isoToGermanDate should format ISO string to German date', () => {
            expect(isoToGermanDate('2024-01-01')).toBe('01.01.2024');
            expect(isoToGermanDate('2024-12-24T12:00:00Z')).toBe('24.12.2024');
            expect(isoToGermanDate(null)).toBe('N/A');
            expect(isoToGermanDate('')).toBe('N/A');
        });

        it('sumZaehlerValues should sum up values in an object', () => {
            const data = { a: 10, b: '20', c: null, d: undefined, e: 5.5 };
            expect(sumZaehlerValues(data)).toBe(35.5);
            expect(sumZaehlerValues({})).toBe(0);
            expect(sumZaehlerValues(null)).toBe(0);
        });

        it('roundToNearest5 should round to nearest multiple of 5', () => {
            expect(roundToNearest5(2.4)).toBe(0);
            expect(roundToNearest5(2.5)).toBe(5);
            expect(roundToNearest5(7.4)).toBe(5);
            expect(roundToNearest5(7.5)).toBe(10);
            expect(roundToNearest5(12)).toBe(10);
            expect(roundToNearest5(13)).toBe(15);
        });

        it('isRechenbasis360 should detect the 360-day basis marker', () => {
            expect(isRechenbasis360({ rechenbasis: '360_tage' })).toBe(true);
            expect(isRechenbasis360({ rechenbasis: 'kalendertage' })).toBe(false);
            expect(isRechenbasis360({})).toBe(false);
            expect(isRechenbasis360(null)).toBe(false);
            expect(isRechenbasis360(undefined)).toBe(false);
        });
    });

    describe('File Generation Handler', () => {
        it('should generate CSV correctly', async () => {
            const mockData = [
                { name: 'John', age: 30 },
                { name: 'Jane', age: 25 }
            ];

            const request = new Request('https://worker.com/export', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'csv',
                    data: mockData,
                    filename: 'test.csv'
                })
            });

            const response = await handleFileGeneration(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);

            expect(response.status).toBe(200);
            expect(response.headers.get('Content-Type')).toBe('text/csv');
            expect(response.headers.get('Content-Disposition')).toContain('test.csv');

            const text = await response.text();
            expect(text).toContain('John,30');
            expect(text).toContain('Jane,25');
        });

        it('should generate PDF correctly', async () => {
            const request = new Request('https://worker.com/export', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'pdf',
                    template: 'house-overview',
                    nebenkosten: {
                        startdatum: '2023-01-01',
                        enddatum: '2023-12-31',
                        haus_name: 'Test Haus'
                    },
                    totalArea: 100,
                    totalCosts: 1000,
                    costPerSqm: 10,
                    filename: 'test.pdf'

                })
            });

            const response = await handleFileGeneration(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);

            expect(response.status).toBe(200);
            expect(response.headers.get('Content-Type')).toBe('application/pdf');
            expect(response.headers.get('Content-Disposition')).toContain('test.pdf');
        });

        it('should generate a single-tenant PDF unchanged for a calendar-day (kalendertage/undefined) nebenkostenItem', async () => {
            const request = new Request('https://worker.com/export', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'pdf',
                    tenantData: {
                        tenantName: 'Erika Musterfrau',
                        apartmentName: 'Wohnung 2',
                        apartmentSize: 60,
                        costItems: [],
                        waterCost: { tenantShare: 0, consumption: 0 }
                    },
                    nebenkostenItem: {
                        startdatum: '2026-01-01',
                        enddatum: '2026-12-31'
                    },
                    ownerName: 'Owner',
                    ownerAddress: 'Musterstraße 1, 12345 Musterstadt',
                    filename: 'test.pdf'
                })
            });

            const { response, text } = await collectPdfText(() =>
                handleFileGeneration(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext)
            );

            expect(response.status).toBe(200);
            expect(text).toContain('Zeitraum: 01.01.2026 - 31.12.2026');
            expect(text).not.toContain('gerechnet mit 360 Tagen');
            expect(text).not.toContain('Rechentage:');
            expect(text).not.toContain('Rechenbasis: Jeder Monat');
        });

        it('should add the 360-day basis texts to the single-tenant PDF for rechenbasis 360_tage', async () => {
            const request = new Request('https://worker.com/export', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'pdf',
                    tenantData: {
                        tenantName: 'Max Mustermann',
                        apartmentName: 'Wohnung 1',
                        apartmentSize: 50,
                        costItems: [],
                        waterCost: { tenantShare: 0, consumption: 0 },
                        einzug: '2026-03-10',
                        rechentage: {
                            rechentage: 285,
                            totalRechentage: 360,
                            billedFromIso: '2026-03-16',
                            billedToIso: '2026-12-31',
                            einzugGerundet: true,
                            einzugGerundetIso: '2026-03-16'
                        }
                    },
                    nebenkostenItem: {
                        startdatum: '2026-01-01',
                        enddatum: '2026-12-31',
                        rechenbasis: '360_tage'
                    },
                    ownerName: 'Owner',
                    ownerAddress: 'Musterstraße 1, 12345 Musterstadt',
                    filename: 'test.pdf'
                })
            });

            const { response, text } = await collectPdfText(() =>
                handleFileGeneration(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext)
            );

            expect(response.status).toBe(200);
            expect(text).toContain('Zeitraum: 01.01.2026 - 31.12.2026 (gerechnet mit 360 Tagen, 30-Tage-Monate)');
            expect(text).toContain('Rechentage: 285 von 360 (gerechnet vom 16.03.2026 bis 31.12.2026)');
            expect(text).toContain('Rechenbasis: Jeder Monat zählt 30 Rechentage, das Jahr 360.');
            expect(text).toContain('Die Wasserkosten werden tagesgenau nach Zählerstand abgerechnet.');
            expect(text).toContain('Einzug 10.03.2026, gerechnet ab 16.03.2026.');
        });

        it('should not name billed days in the single-tenant PDF when a tenant has 0 Rechentage', async () => {
            const request = new Request('https://worker.com/export', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'pdf',
                    tenantData: {
                        tenantName: 'Max Mustermann',
                        apartmentName: 'Wohnung 1',
                        apartmentSize: 50,
                        costItems: [],
                        waterCost: { tenantShare: 0, consumption: 0 },
                        einzug: '2026-12-28',
                        rechentage: {
                            rechentage: 0,
                            totalRechentage: 360,
                            billedFromIso: '',
                            billedToIso: '',
                            einzugGerundet: true,
                            einzugGerundetIso: '2027-01-01'
                        }
                    },
                    nebenkostenItem: {
                        startdatum: '2026-01-01',
                        enddatum: '2026-12-31',
                        rechenbasis: '360_tage'
                    },
                    ownerName: 'Owner',
                    ownerAddress: 'Musterstraße 1, 12345 Musterstadt',
                    filename: 'test.pdf'
                })
            });

            const { response, text } = await collectPdfText(() =>
                handleFileGeneration(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext)
            );

            expect(response.status).toBe(200);
            expect(text).toContain('Rechentage: 0 von 360');
            expect(text).not.toContain('gerechnet vom');
        });

        it('should generate the house overview PDF unchanged for a calendar-day (kalendertage/undefined) nebenkosten', async () => {
            const request = new Request('https://worker.com/export', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'pdf',
                    template: 'house-overview',
                    nebenkosten: {
                        startdatum: '2026-01-01',
                        enddatum: '2026-12-31',
                        haus_name: 'Test Haus'
                    },
                    totalArea: 100,
                    totalCosts: 1000,
                    costPerSqm: 10,
                    filename: 'test.pdf'
                })
            });

            const { response, text } = await collectPdfText(() =>
                handleFileGeneration(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext)
            );

            expect(response.status).toBe(200);
            expect(text).toContain('Zeitraum: 01.01.2026 bis 31.12.2026');
            expect(text).not.toContain('gerechnet mit 360 Tagen');
        });

        it('should add the 360-day basis suffix to the house overview PDF period line for rechenbasis 360_tage', async () => {
            const request = new Request('https://worker.com/export', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'pdf',
                    template: 'house-overview',
                    nebenkosten: {
                        startdatum: '2026-01-01',
                        enddatum: '2026-12-31',
                        haus_name: 'Test Haus',
                        rechenbasis: '360_tage'
                    },
                    totalArea: 100,
                    totalCosts: 1000,
                    costPerSqm: 10,
                    filename: 'test.pdf'
                })
            });

            const { response, text } = await collectPdfText(() =>
                handleFileGeneration(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext)
            );

            expect(response.status).toBe(200);
            expect(text).toContain('Zeitraum: 01.01.2026 bis 31.12.2026 (gerechnet mit 360 Tagen, 30-Tage-Monate)');
        });

        it('should return 404 for unknown request type', async () => {

            const request = new Request('https://worker.com/unknown', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'unknown'
                })
            });

            const response = await handleFileGeneration(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);
            expect(response.status).toBe(400);
        });
    });

    describe('Queue Processing Handler', () => {
        it('should return 401 if auth key is missing or wrong', async () => {
            const request = new Request('https://worker.com/process-queue', {
                method: 'POST',
                headers: {
                    'x-worker-auth': 'wrong-key'
                },
                body: JSON.stringify({ user_id: 'test-user' })
            });

            const response = await processQueue(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);
            expect(response.status).toBe(401);
            expect(await response.text()).toBe('Unauthorized');
        });

        it('should proceed if auth key is correct', async () => {
            // We expect it to fail later because we haven't mocked Supabase RPCs,
            // but we can check if it gets past the auth check.
            const request = new Request('https://worker.com/process-queue', {
                method: 'POST',
                headers: {
                    'x-worker-auth': 'test-auth-key'
                },
                body: JSON.stringify({ user_id: 'test-user' })
            });

            const response = await processQueue(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);
            // It should probably hit the Supabase client creation and then fail on an RPC call
            expect(response.status).not.toBe(401);
        });
    });

    describe('Main Router (fetch)', () => {
        it('should handle GET / correctly (health check)', async () => {
            const request = new Request('https://worker.com/', {
                method: 'GET'
            });

            const response = await (await import('./index')).default.fetch(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);
            expect(response.status).toBe(200);
            expect(await response.text()).toBe('OK');
        });

        it('should handle GET /health correctly (health check)', async () => {
            const request = new Request('https://worker.com/health', {
                method: 'GET'
            });

            const response = await (await import('./index')).default.fetch(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);
            expect(response.status).toBe(200);
            expect(await response.text()).toBe('OK');
        });

        it('should route to /ai correctly', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
            try {
                const request = new Request('https://worker.com/ai', {
                    method: 'POST',
                    body: JSON.stringify({ message: 'Hello' })
                });

                const response = await (await import('./index')).default.fetch(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);
                
                // handleAIRequest returns 500 if Gemini fails, or starts a stream.
                // File generation would return 400 for this body because 'type' is missing.
                expect(response.status).not.toBe(400);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should route to /process-queue correctly', async () => {
            const request = new Request('https://worker.com/process-queue', {
                method: 'POST',
                headers: { 'x-worker-auth': 'test-auth-key' },
                body: JSON.stringify({ user_id: 'test-user' })
            });

            const response = await (await import('./index')).default.fetch(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);
            
            // processQueue would hit auth check then fail on Supabase
            expect(response.status).not.toBe(404);
            expect(response.status).not.toBe(400);
        });

        it('should fallback to file generation for other paths', async () => {
            const request = new Request('https://worker.com/some-random-path', {
                method: 'POST',
                body: JSON.stringify({ type: 'csv', data: [] })
            });

            const response = await (await import('./index')).default.fetch(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);
            expect(response.status).toBe(200);
            expect(response.headers.get('Content-Type')).toBe('text/csv');
        });
    });

    it('should pass a basic smoke test', () => {
        expect(true).toBe(true);
    });
});

